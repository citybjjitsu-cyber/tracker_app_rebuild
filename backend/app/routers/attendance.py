from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional, cast
from datetime import date
from app.routers.auth import get_current_user
from app.auth.limiter import limiter, WRITE_LIMIT, READ_LIMIT, CSV_IMPORT_LIMIT
from app.services.audit import create_audit_log
from app.services.attendance import ensure_class_instance
from app.timezone import local_today

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _existing_attendance(db: Session, user_uuid: str, class_id: int, target_date: date):
    return (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_uuid == user_uuid,
            models.Attendance.class_id == class_id,
            models.Attendance.attendance_date == target_date,
        )
        .first()
    )


def _create_attendance(
    db: Session,
    user_uuid: str,
    class_id: int,
    target_date: date,
    class_instance_id: Optional[int] = None,
    teacher_uuid: Optional[str] = None,
):
    existing = _existing_attendance(db, user_uuid, class_id, target_date)
    if existing:
        return existing, False

    if class_instance_id is None:
        instance = ensure_class_instance(db, class_id, target_date, teacher_uuid)
        if instance:
            class_instance_id = cast(int, instance.id)
            teacher_uuid = teacher_uuid or cast(Optional[str], instance.teacher_uuid)

    attendance = models.Attendance(
        user_uuid=user_uuid,
        class_id=class_id,
        class_instance_id=class_instance_id,
        teacher_uuid=teacher_uuid,
        attendance_date=target_date,
        status="pending",
    )
    try:
        with db.begin_nested():
            db.add(attendance)
            db.flush()
    except IntegrityError:
        existing = _existing_attendance(db, user_uuid, class_id, target_date)
        if existing:
            return existing, False
        raise
    return attendance, True


@router.post("/", response_model=schemas.AttendanceResponse)
@limiter.limit(WRITE_LIMIT)
def create_attendance(
    request: Request,
    attendance: schemas.AttendanceCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    today = local_today(request)

    existing = _existing_attendance(db, attendance.user_uuid, attendance.class_id, today)

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already checked in for this class today",
            headers={"X-Error-Code": "already_checked_in", "X-Retryable": "false"},
        )

    db_attendance, _ = _create_attendance(
        db,
        attendance.user_uuid,
        attendance.class_id,
        today,
        attendance.class_instance_id,
        attendance.teacher_uuid,
    )
    db.commit()
    db.refresh(db_attendance)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="check_in",
        resource_type="attendance",
        actor_uuid=str(user.user_uuid),
        resource_uuid=attendance.user_uuid,
        detail=f"Check-in to class {attendance.class_id}",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return db_attendance


@router.get("/user/{user_uuid}", response_model=List[schemas.AttendanceResponse])
@limiter.limit(READ_LIMIT)
def get_user_attendance(
    request: Request,
    user_uuid: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Attendance)
        .filter(models.Attendance.user_uuid == user_uuid)
        .order_by(models.Attendance.attendance_date.desc())
        .all()
    )


@router.get("/class/{class_id}", response_model=List[schemas.AttendanceResponse])
@limiter.limit(READ_LIMIT)
def get_class_attendance(
    request: Request,
    class_id: int,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = (
        db.query(models.Attendance)
        .options(joinedload(models.Attendance.user))
        .filter(models.Attendance.class_id == class_id)
    )
    if date:
        query = query.filter(models.Attendance.attendance_date == date)
    return query.all()


@router.post("/check-in")
@limiter.limit(WRITE_LIMIT)
def check_in(
    request: Request,
    data: schemas.CheckInRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    user_uuid = data.user_uuid
    class_id = data.class_id
    class_instance_id = data.class_instance_id

    target_date = data.check_in_date or local_today(request)

    existing = _existing_attendance(db, user_uuid, class_id, target_date)

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already checked in for this class on this date",
            headers={"X-Error-Code": "already_checked_in", "X-Retryable": "false"},
        )

    db_attendance, _ = _create_attendance(
        db,
        user_uuid,
        class_id,
        target_date,
        class_instance_id,
    )
    db.commit()
    db.refresh(db_attendance)

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="check_in",
        resource_type="attendance",
        actor_uuid=str(user.user_uuid),
        resource_uuid=data.user_uuid,
        detail=f"Check-in to class {data.class_id}",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return db_attendance


@router.post("/bulk-check-in", response_model=schemas.BulkCheckInResponse)
@limiter.limit(WRITE_LIMIT)
def bulk_check_in(
    request: Request,
    data: schemas.BulkCheckInRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    created = []
    already_present = []
    errors = []

    for item in data.classes:
        target_date = item.check_in_date or local_today(request)
        existing = _existing_attendance(db, data.user_uuid, item.class_id, target_date)

        if existing:
            already_present.append(existing)
            errors.append(
                {
                    "class_id": item.class_id,
                    "attendance_date": target_date,
                    "detail": "Already checked in for this date",
                    "code": "already_checked_in",
                    "retryable": False,
                }
            )
            continue

        db_attendance, _ = _create_attendance(
            db,
            data.user_uuid,
            item.class_id,
            target_date,
        )
        created.append(db_attendance)

    db.commit()
    for att in created:
        db.refresh(att)

    return {
        "created": [schemas.AttendanceResponse.model_validate(a) for a in created],
        "already_present": [schemas.AttendanceResponse.model_validate(a) for a in already_present],
        "errors": errors,
    }


@router.post("/direct")
@limiter.limit(WRITE_LIMIT)
def direct_attendance(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    user_uuid = data.get("user_uuid")
    class_id = data.get("class_id")
    if not isinstance(user_uuid, str) or not isinstance(class_id, int):
        raise HTTPException(status_code=422, detail="user_uuid and class_id are required")
    class_instance_id = data.get("class_instance_id")
    teacher_uuid = data.get("teacher_uuid")
    attendance_date_str = data.get("attendance_date")

    today = date.fromisoformat(attendance_date_str) if attendance_date_str else local_today(request)

    existing = _existing_attendance(db, user_uuid, class_id, today)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Already checked in for this class on this date",
            headers={"X-Error-Code": "already_checked_in", "X-Retryable": "false"},
        )

    db_attendance, _ = _create_attendance(
        db,
        user_uuid,
        class_id,
        today,
        class_instance_id,
        teacher_uuid,
    )
    db.commit()
    db.refresh(db_attendance)
    return db_attendance


@router.post("/{attendance_id}/confirm", response_model=schemas.AttendanceResponse)
@limiter.limit(WRITE_LIMIT)
def confirm_attendance(
    request: Request,
    attendance_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    attendance.status = "confirmed"
    db.commit()

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="attendance_confirm",
        resource_type="attendance",
        actor_uuid=str(user.user_uuid),
        resource_uuid=str(attendance_id),
        detail=f"Attendance {attendance_id} confirmed",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return attendance


@router.delete("/{attendance_id}/cancel")
@limiter.limit(WRITE_LIMIT)
def cancel_attendance(
    request: Request,
    attendance_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    attendance = db.query(models.Attendance).filter(models.Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    db.delete(attendance)
    db.commit()

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="attendance_cancel",
        resource_type="attendance",
        actor_uuid=str(user.user_uuid),
        resource_uuid=str(attendance_id),
        detail=f"Attendance {attendance_id} cancelled",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "Attendance cancelled"}


@router.post("/bulk-confirm")
@limiter.limit(CSV_IMPORT_LIMIT)
def bulk_confirm(
    request: Request,
    data: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    ids = data.get("ids", [])
    attendance_list = db.query(models.Attendance).filter(models.Attendance.id.in_(ids)).all()

    for att in attendance_list:
        att.status = "confirmed"

    db.commit()
    return {"message": f"Confirmed {len(attendance_list)} attendance records"}
