from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional
from datetime import date
from app.routers.auth import get_current_user

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.AttendanceResponse)
def create_attendance(
    attendance: schemas.AttendanceCreate, db: Session = Depends(get_db)
):
    today = date.today()

    # Check if already checked in
    existing = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_uuid == attendance.user_uuid,
            models.Attendance.class_id == attendance.class_id,
            models.Attendance.attendance_date == today,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400, detail="Already checked in for this class today"
        )

    db_attendance = models.Attendance(
        **attendance.dict(), attendance_date=today, status="pending"
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


@router.get("/user/{user_uuid}", response_model=List[schemas.AttendanceResponse])
def get_user_attendance(user_uuid: str, db: Session = Depends(get_db)):
    return (
        db.query(models.Attendance)
        .filter(models.Attendance.user_uuid == user_uuid)
        .order_by(models.Attendance.attendance_date.desc())
        .all()
    )


@router.get("/class/{class_id}", response_model=List[schemas.AttendanceResponse])
def get_class_attendance(
    class_id: int, date: Optional[str] = None, db: Session = Depends(get_db)
):
    query = db.query(models.Attendance).filter(models.Attendance.class_id == class_id)
    if date:
        query = query.filter(models.Attendance.attendance_date == date)
    return query.all()


@router.post("/check-in")
def check_in(
    data: schemas.CheckInRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    user_uuid = data.user_uuid
    class_id = data.class_id
    class_instance_id = data.class_instance_id

    today = date.today()

    existing = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_uuid == user_uuid,
            models.Attendance.class_id == class_id,
            models.Attendance.attendance_date == today,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=400, detail="Already checked in for this class today"
        )

    db_attendance = models.Attendance(
        user_uuid=user_uuid,
        class_id=class_id,
        class_instance_id=class_instance_id,
        attendance_date=today,
        status="pending",
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


@router.post("/bulk-check-in")
def bulk_check_in(
    data: schemas.BulkCheckInRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    today = date.today()
    created = []
    errors = []

    for class_id in data.class_ids:
        existing = (
            db.query(models.Attendance)
            .filter(
                models.Attendance.user_uuid == data.user_uuid,
                models.Attendance.class_id == class_id,
                models.Attendance.attendance_date == today,
            )
            .first()
        )

        if existing:
            errors.append({"class_id": class_id, "detail": "Already checked in today"})
            continue

        db_attendance = models.Attendance(
            user_uuid=data.user_uuid,
            class_id=class_id,
            attendance_date=today,
            status="pending",
        )
        db.add(db_attendance)
        db.flush()
        created.append(db_attendance)

    db.commit()
    for att in created:
        db.refresh(att)

    return {
        "created": [schemas.AttendanceResponse.model_validate(a) for a in created],
        "errors": errors,
    }


@router.post("/direct")
def direct_attendance(
    data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    user_uuid = data.get("user_uuid")
    class_id = data.get("class_id")
    class_instance_id = data.get("class_instance_id")
    teacher_uuid = data.get("teacher_uuid")

    today = date.today()

    db_attendance = models.Attendance(
        user_uuid=user_uuid,
        class_id=class_id,
        class_instance_id=class_instance_id,
        teacher_uuid=teacher_uuid,
        attendance_date=today,
        status="confirmed",
    )
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


@router.post("/{attendance_id}/confirm")
def confirm_attendance(attendance_id: int, db: Session = Depends(get_db)):
    attendance = (
        db.query(models.Attendance)
        .filter(models.Attendance.id == attendance_id)
        .first()
    )
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    attendance.status = "confirmed"
    db.commit()
    return attendance


@router.delete("/{attendance_id}/cancel")
def cancel_attendance(attendance_id: int, db: Session = Depends(get_db)):
    attendance = (
        db.query(models.Attendance)
        .filter(models.Attendance.id == attendance_id)
        .first()
    )
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    db.delete(attendance)
    db.commit()
    return {"message": "Attendance cancelled"}


@router.post("/bulk-confirm")
def bulk_confirm(
    data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    ids = data.get("ids", [])
    attendance_list = (
        db.query(models.Attendance).filter(models.Attendance.id.in_(ids)).all()
    )

    for att in attendance_list:
        att.status = "confirmed"

    db.commit()
    return {"message": f"Confirmed {len(attendance_list)} attendance records"}
