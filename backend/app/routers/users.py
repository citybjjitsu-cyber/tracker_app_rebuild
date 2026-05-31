import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from passlib.context import CryptContext
from datetime import datetime, date
from typing import List, Optional
import uuid
import os
import shutil
from app.routers.auth import get_current_user, get_admin_user

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.UserResponse)
def create_user(
    user: schemas.UserCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_uuid = str(uuid.uuid4())
    password_hash = None
    if user.password:
        password_hash = pwd_context.hash(user.password)

    pin_hash = None
    if user.pin:
        pin_hash = pwd_context.hash(user.pin)

    db_user = models.User(
        user_uuid=user_uuid,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        password_hash=password_hash,
        pin_hash=pin_hash,
        rank=user.rank,
        nicknames=user.nicknames,
        comments=user.comments,
        last_graded_date=user.last_graded_date,
        profile_image_url=user.profile_image_url,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Add Student role by default
    student_role = db.query(models.Role).filter(models.Role.name == "Student").first()
    if student_role:
        user_role = models.UserRole(user_uuid=user_uuid, role_id=student_role.id)
        db.add(user_role)
        db.commit()

    return db_user


@router.get("/", response_model=List[schemas.UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.is_current == True).all()


@router.get("/search", response_model=List[schemas.UserResponse], dependencies=[])
def search_users(query: str, db: Session = Depends(get_db)):
    return (
        db.query(models.User)
        .filter(
            models.User.is_current == True,
            (models.User.first_name.ilike(f"%{query}%"))
            | (models.User.last_name.ilike(f"%{query}%"))
            | (models.User.email.ilike(f"%{query}%")),
        )
        .all()
    )


@router.get("/export-csv")
def export_users_csv(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    users = db.query(models.User).filter(models.User.is_current == True).all()

    output = io.StringIO()
    fieldnames = [
        "user_uuid",
        "first_name",
        "last_name",
        "email",
        "rank",
        "nicknames",
        "comments",
        "last_graded_date",
        "created_date",
        "profile_image_url",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for user in users:
        writer.writerow(
            {
                "user_uuid": user.user_uuid,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "rank": user.rank,
                "nicknames": user.nicknames or "",
                "comments": user.comments or "",
                "last_graded_date": user.last_graded_date.isoformat()
                if user.last_graded_date
                else "",
                "created_date": user.created_date.isoformat()
                if user.created_date
                else "",
                "profile_image_url": user.profile_image_url or "",
            }
        )

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"},
    )


@router.post("/import-csv")
async def import_users_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    contents = await file.read()
    csv_data = io.StringIO(contents.decode("utf-8"))
    reader = csv.DictReader(csv_data)

    created = 0
    updated = 0
    skipped = 0
    errors = []

    for row_num, row in enumerate(reader, start=2):
        try:
            first_name = row.get("first_name", "").strip()
            last_name = row.get("last_name", "").strip()
            email = row.get("email", "").strip()

            if not first_name or not last_name or not email:
                errors.append(
                    f"Row {row_num}: Missing required fields (first_name, last_name, email)"
                )
                skipped += 1
                continue

            existing_user = (
                db.query(models.User)
                .filter(models.User.email == email, models.User.is_current == True)
                .first()
            )

            rank = row.get("rank", "White").strip() or "White"
            if rank not in ["White", "Blue", "Purple", "Brown", "Black"]:
                rank = "White"

            nicknames = row.get("nicknames", "").strip() or None
            comments = row.get("comments", "").strip() or None

            last_graded_date = None
            if row.get("last_graded_date", "").strip():
                try:
                    last_graded_date = date.fromisoformat(
                        row["last_graded_date"].strip()
                    )
                except ValueError:
                    pass

            if existing_user:
                existing_user.first_name = first_name
                existing_user.last_name = last_name
                existing_user.rank = rank
                existing_user.nicknames = nicknames
                existing_user.comments = comments
                existing_user.last_graded_date = last_graded_date
                updated += 1
            else:
                user_uuid = row.get("user_uuid", "").strip()
                if (
                    not user_uuid
                    or db.query(models.User)
                    .filter(models.User.user_uuid == user_uuid)
                    .first()
                ):
                    user_uuid = str(uuid.uuid4())

                password_hash = None
                if row.get("password", "").strip():
                    password_hash = pwd_context.hash(row["password"].strip())

                new_user = models.User(
                    user_uuid=user_uuid,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    password_hash=password_hash,
                    rank=rank,
                    nicknames=nicknames,
                    comments=comments,
                    last_graded_date=last_graded_date,
                )
                db.add(new_user)
                db.flush()

                student_role = (
                    db.query(models.Role).filter(models.Role.name == "Student").first()
                )
                if student_role:
                    user_role = models.UserRole(
                        user_uuid=user_uuid, role_id=student_role.id
                    )
                    db.add(user_role)

                created += 1

        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")
            skipped += 1

    db.commit()
    return {
        "message": "CSV import completed",
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
    }


@router.get("/{user_uuid}", response_model=schemas.UserResponse)
def get_user(user_uuid: str, db: Session = Depends(get_db)):
    user = (
        db.query(models.User)
        .filter(models.User.user_uuid == user_uuid, models.User.is_current == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_uuid}", response_model=schemas.UserResponse)
def update_user(
    user_uuid: str,
    user: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    db_user = (
        db.query(models.User)
        .filter(models.User.user_uuid == user_uuid, models.User.is_current == True)
        .first()
    )
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # If only password/pin is being reset, just update in place
    if (
        user.first_name is None
        and user.last_name is None
        and user.email is None
        and (user.password is not None or user.pin is not None)
    ):
        if user.password:
            db_user.password_hash = pwd_context.hash(user.password)
        if user.pin:
            db_user.pin_hash = pwd_context.hash(user.pin)
        db.commit()
        db.refresh(db_user)
        return db_user

    # Archive old record
    db_user.end_date = datetime.utcnow()
    db_user.is_current = False

    password_hash = db_user.password_hash
    if user.password:
        password_hash = pwd_context.hash(user.password)

    # Create new record (use old values as fallback)
    new_user = models.User(
        user_uuid=user_uuid,
        first_name=user.first_name
        if user.first_name is not None
        else db_user.first_name,
        last_name=user.last_name if user.last_name is not None else db_user.last_name,
        email=user.email if user.email is not None else db_user.email,
        password_hash=password_hash,
        rank=user.rank if user.rank is not None else db_user.rank,
        nicknames=user.nicknames if user.nicknames is not None else db_user.nicknames,
        comments=user.comments if user.comments is not None else db_user.comments,
        last_graded_date=user.last_graded_date
        if user.last_graded_date is not None
        else db_user.last_graded_date,
        profile_image_url=db_user.profile_image_url,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/{user_uuid}/photo")
async def upload_photo(
    user_uuid: str,
    file: UploadFile = File(...),
    offset_x: Optional[float] = Form(0.0),
    offset_y: Optional[float] = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    user = (
        db.query(models.User)
        .filter(models.User.user_uuid == user_uuid, models.User.is_current == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type
    if file.content_type and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Create uploads directory
    uploads_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "photos"
    )
    os.makedirs(uploads_dir, exist_ok=True)

    # Generate unique filename
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{user_uuid}{file_ext}"
    file_path = os.path.join(uploads_dir, filename)

    # Delete old photo if exists
    old_url = user.profile_image_url
    if old_url:
        old_filename = os.path.basename(old_url)
        old_path = os.path.join(uploads_dir, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save new file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update user profile_image_url and offsets
    user.profile_image_url = f"/uploads/photos/{filename}"
    user.image_offset_x = offset_x
    user.image_offset_y = offset_y
    db.commit()

    return {
        "message": "Photo updated",
        "profile_image_url": user.profile_image_url,
        "image_offset_x": user.image_offset_x,
        "image_offset_y": user.image_offset_y,
    }


@router.delete("/{user_uuid}/photo")
def delete_photo(
    user_uuid: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    user = (
        db.query(models.User)
        .filter(models.User.user_uuid == user_uuid, models.User.is_current == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete file if exists
    if user.profile_image_url:
        uploads_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "uploads",
            "photos",
        )
        filename = os.path.basename(user.profile_image_url)
        file_path = os.path.join(uploads_dir, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    user.profile_image_url = None
    user.image_offset_x = 0.0
    user.image_offset_y = 0.0
    db.commit()
    return {"message": "Photo deleted"}


@router.put("/{user_uuid}/photo-position")
def update_photo_position(
    user_uuid: str,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Update just the photo position offsets without uploading a new photo."""
    user = (
        db.query(models.User)
        .filter(models.User.user_uuid == user_uuid, models.User.is_current == True)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.profile_image_url:
        raise HTTPException(status_code=400, detail="No profile photo to adjust")

    # Clamp values to -1 to 1 range
    user.image_offset_x = max(-1.0, min(1.0, offset_x))
    user.image_offset_y = max(-1.0, min(1.0, offset_y))
    db.commit()

    return {
        "message": "Photo position updated",
        "image_offset_x": user.image_offset_x,
        "image_offset_y": user.image_offset_y,
    }
