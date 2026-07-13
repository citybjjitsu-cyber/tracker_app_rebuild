import csv
import io
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Request,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from passlib.context import CryptContext
from datetime import datetime, date, timezone
from typing import List, Optional
import uuid
import os
from PIL import Image
from app.routers.auth import get_current_user, get_admin_user
from app.auth.limiter import (
    limiter,
    REGISTRATION_LIMIT,
    WRITE_LIMIT,
    READ_LIMIT,
    CSV_IMPORT_LIMIT,
    CSV_EXPORT_LIMIT,
    UPLOAD_LIMIT,
)
from app.services.audit import create_audit_log

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_PHOTO_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.UserResponse)
@limiter.limit(REGISTRATION_LIMIT)
def create_user(
    request: Request,
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

    rank_tier_id = user.rank_tier_id
    if rank_tier_id is None and user.rank:
        tier = (
            db.query(models.RankTier)
            .filter(
                models.RankTier.rank == user.rank,
                models.RankTier.degree == 0,
            )
            .first()
        )
        if tier:
            rank_tier_id = tier.id

    db_user = models.User(
        user_uuid=user_uuid,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email,
        password_hash=password_hash,
        pin_hash=pin_hash,
        rank=user.rank,
        rank_tier_id=rank_tier_id,
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

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="user_create",
        resource_type="user",
        actor_uuid=str(admin.user_uuid),
        resource_uuid=user_uuid,
        detail=f"Created user {user.first_name} {user.last_name} ({user.email})",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return db_user


@router.get("/", response_model=List[schemas.UserResponse])
@limiter.limit(READ_LIMIT)
def list_users(request: Request, db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.is_current).all()


@router.get("/search", response_model=List[schemas.UserResponse], dependencies=[])
@limiter.limit(READ_LIMIT)
def search_users(request: Request, query: str, db: Session = Depends(get_db)):
    return (
        db.query(models.User)
        .filter(
            models.User.is_current,
            (models.User.first_name.ilike(f"%{query}%"))
            | (models.User.last_name.ilike(f"%{query}%"))
            | (models.User.email.ilike(f"%{query}%")),
        )
        .all()
    )


@router.get("/export-csv")
@limiter.limit(CSV_EXPORT_LIMIT)
def export_users_csv(
    request: Request,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    users = db.query(models.User).filter(models.User.is_current).all()

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
                "last_graded_date": user.last_graded_date.isoformat() if user.last_graded_date else "",
                "created_date": user.created_date.isoformat() if user.created_date else "",
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
@limiter.limit(CSV_IMPORT_LIMIT)
async def import_users_csv(
    request: Request,
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

    rows = list(reader)
    if len(rows) > 500:
        raise HTTPException(
            status_code=400,
            detail=f"CSV import limited to 500 rows. File has {len(rows)} rows.",
        )

    for row_num, row in enumerate(rows, start=2):
        try:
            first_name = row.get("first_name", "").strip()
            last_name = row.get("last_name", "").strip()
            email = row.get("email", "").strip()

            if not first_name or not last_name or not email:
                errors.append(f"Row {row_num}: Missing required fields (first_name, last_name, email)")
                skipped += 1
                continue

            existing_user = db.query(models.User).filter(models.User.email == email, models.User.is_current).first()

            rank = row.get("rank", "White").strip() or "White"
            if rank not in ["White", "Blue", "Purple", "Brown", "Black"]:
                rank = "White"

            nicknames = row.get("nicknames", "").strip() or None
            comments = row.get("comments", "").strip() or None

            last_graded_date = None
            if row.get("last_graded_date", "").strip():
                try:
                    last_graded_date = date.fromisoformat(row["last_graded_date"].strip())
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
                if not user_uuid or db.query(models.User).filter(models.User.user_uuid == user_uuid).first():
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

                student_role = db.query(models.Role).filter(models.Role.name == "Student").first()
                if student_role:
                    user_role = models.UserRole(user_uuid=user_uuid, role_id=student_role.id)
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
@limiter.limit(READ_LIMIT)
def get_user(request: Request, user_uuid: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid, models.User.is_current).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_uuid}", response_model=schemas.UserResponse)
@limiter.limit(WRITE_LIMIT)
def update_user(
    request: Request,
    user_uuid: str,
    user: schemas.UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    db_user = db.query(models.User).filter(models.User.user_uuid == user_uuid, models.User.is_current).first()
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

        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent")
        create_audit_log(
            db,
            action="user_update_password_pin",
            resource_type="user",
            actor_uuid=str(admin.user_uuid),
            resource_uuid=user_uuid,
            detail="Password/PIN updated",
            ip_address=client_host,
            user_agent=user_agent,
        )

        return db_user

    # Update fields in-place (PostgreSQL FK constraints require unique user_uuid)
    db_user.first_name = user.first_name if user.first_name is not None else db_user.first_name
    db_user.last_name = user.last_name if user.last_name is not None else db_user.last_name
    db_user.email = user.email if user.email is not None else db_user.email
    db_user.rank = user.rank if user.rank is not None else db_user.rank
    if user.rank is not None and user.rank_tier_id is None:
        tier = (
            db.query(models.RankTier)
            .filter(
                models.RankTier.rank == user.rank,
                models.RankTier.degree == 0,
            )
            .first()
        )
        if tier:
            db_user.rank_tier_id = tier.id
    elif user.rank_tier_id is not None:
        db_user.rank_tier_id = user.rank_tier_id
    db_user.nicknames = user.nicknames if user.nicknames is not None else db_user.nicknames
    db_user.comments = user.comments if user.comments is not None else db_user.comments
    db_user.last_graded_date = user.last_graded_date if user.last_graded_date is not None else db_user.last_graded_date
    if user.password:
        db_user.password_hash = pwd_context.hash(user.password)
    if user.pin:
        db_user.pin_hash = pwd_context.hash(user.pin)
    db.commit()
    db.refresh(db_user)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="user_update",
        resource_type="user",
        actor_uuid=str(admin.user_uuid),
        resource_uuid=user_uuid,
        detail="User profile updated",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return db_user


@router.post("/{user_uuid}/photo")
@limiter.limit(UPLOAD_LIMIT)
async def upload_photo(
    request: Request,
    user_uuid: str,
    file: UploadFile = File(...),
    offset_x: Optional[float] = Form(0.0),
    offset_y: Optional[float] = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid, models.User.is_current).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Read file content for validation
    contents = await file.read()
    if len(contents) > MAX_PHOTO_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Photo too large. Maximum size is {MAX_PHOTO_SIZE // (1024 * 1024)} MB.",
        )

    # Validate file extension
    if file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
    else:
        ext = ""
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}",
        )

    # Validate file content is a real image
    try:
        import io as io_module

        img = Image.open(io_module.BytesIO(contents))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image")

    # Create uploads directory
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "photos")
    os.makedirs(uploads_dir, exist_ok=True)

    # Generate unique filename (sanitized extension)
    filename = f"{user_uuid}{ext}"
    file_path = os.path.join(uploads_dir, filename)

    # Delete old photo if exists
    old_url = user.profile_image_url
    if old_url:
        old_filename = os.path.basename(old_url)
        old_path = os.path.join(uploads_dir, old_filename)
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save validated content
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

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
@limiter.limit(WRITE_LIMIT)
def delete_photo(
    request: Request,
    user_uuid: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid, models.User.is_current).first()
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
@limiter.limit(WRITE_LIMIT)
def update_photo_position(
    request: Request,
    user_uuid: str,
    offset_x: float = 0.0,
    offset_y: float = 0.0,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_admin_user),
):
    """Update just the photo position offsets without uploading a new photo."""
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid, models.User.is_current).first()
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
