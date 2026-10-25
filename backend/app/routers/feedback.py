from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from app.database import SessionLocal
from app import models, schemas
from datetime import date
from typing import List, Optional
from app.auth.limiter import limiter, WRITE_LIMIT, READ_LIMIT, DASHBOARD_LIMIT
from app.routers.auth import get_current_user, get_teacher_user
from app.services.attendance import ensure_class_instance
from app.services.authorization import has_platform_role, resolve_active_membership

router = APIRouter()


def _canonical_rating(rating: str) -> str:
    return {
        "thumbs_up": "positive",
        "thumbs_down": "negative",
    }.get(rating, rating)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_teacher_gym_membership(
    gym_id: Optional[int] = Header(default=None, alias="X-Gym-Id"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_teacher_user),
):
    return resolve_active_membership(db, str(user.user_uuid), gym_id)


def get_active_user_membership(
    gym_id: Optional[int] = Header(default=None, alias="X-Gym-Id"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return resolve_active_membership(db, str(user.user_uuid), gym_id)


@router.post("/", response_model=schemas.FeedbackResponse)
@limiter.limit(WRITE_LIMIT)
def submit_feedback(
    request: Request,
    feedback: schemas.FeedbackCreate,
    db: Session = Depends(get_db),
    membership: models.GymMembership = Depends(get_active_user_membership),
):
    attendance = (
        db.query(models.Attendance)
        .options(joinedload(models.Attendance.class_instance))
        .filter(
            models.Attendance.id == feedback.attendance_id,
            models.Attendance.gym_id == membership.gym_id,
        )
        .first()
    )
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance not found")

    class_instance = attendance.class_instance or ensure_class_instance(
        db,
        attendance.class_id,
        attendance.attendance_date,
        attendance.teacher_uuid,
    )
    if not class_instance:
        raise HTTPException(
            status_code=422,
            detail="Attendance is not linked to a class instance",
        )

    existing = db.query(models.ClassFeedback).filter(models.ClassFeedback.attendance_id == attendance.id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Feedback already submitted")

    attendance.class_instance_id = class_instance.id
    db_feedback = models.ClassFeedback(
        user_uuid=attendance.user_uuid,
        attendance_id=attendance.id,
        class_instance_id=class_instance.id,
        rating=_canonical_rating(feedback.rating),
        comment=feedback.comment,
    )
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback


@router.get("/user/{user_uuid}", response_model=List[schemas.FeedbackResponse])
@limiter.limit(READ_LIMIT)
def get_user_feedback(
    request: Request,
    user_uuid: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    membership: models.GymMembership = Depends(get_active_user_membership),
):
    if str(user.user_uuid) != user_uuid and not has_platform_role(db, str(user.user_uuid)):
        raise HTTPException(status_code=403, detail="Feedback access denied")
    return (
        db.query(models.ClassFeedback)
        .options(joinedload(models.ClassFeedback.class_instance))
        .join(models.Attendance, models.Attendance.id == models.ClassFeedback.attendance_id)
        .filter(models.ClassFeedback.user_uuid == user_uuid)
        .filter(models.Attendance.gym_id == membership.gym_id)
        .order_by(models.ClassFeedback.created_at.desc())
        .all()
    )


@router.get("/teacher/{teacher_uuid}", response_model=List[schemas.TeacherFeedbackResponse])
@limiter.limit(READ_LIMIT)
def get_teacher_feedback(
    request: Request,
    teacher_uuid: str,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    class_id: Optional[int] = Query(None),
    rating: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_teacher_user),
    membership: models.GymMembership = Depends(get_teacher_gym_membership),
):
    query = (
        db.query(models.ClassFeedback)
        .options(joinedload(models.ClassFeedback.class_instance))
        .join(models.ClassInstance)
        .join(models.ClassSchedule, models.ClassSchedule.id == models.ClassInstance.class_id)
        .filter(models.ClassSchedule.gym_id == membership.gym_id)
    )
    if start_date:
        query = query.filter(models.ClassInstance.class_date >= start_date)
    if end_date:
        query = query.filter(models.ClassInstance.class_date <= end_date)
    if class_id:
        query = query.filter(models.ClassInstance.class_id == class_id)
    if rating and rating != "all":
        ratings = [rating]
        if rating == "positive":
            ratings.append("thumbs_up")
        elif rating == "negative":
            ratings.append("thumbs_down")
        query = query.filter(models.ClassFeedback.rating.in_(ratings))
    return query.order_by(models.ClassInstance.class_date.desc()).all()


@router.get("/admin/list", response_model=List[schemas.FeedbackResponse])
@limiter.limit(DASHBOARD_LIMIT)
def get_admin_feedback_list(
    request: Request,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    classes: Optional[str] = Query(None),
    teachers: Optional[str] = Query(None),
    rating: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    membership: models.GymMembership = Depends(get_active_user_membership),
):
    query = (
        db.query(models.ClassFeedback)
        .options(joinedload(models.ClassFeedback.class_instance))
        .join(models.ClassInstance)
        .join(models.User)
        .join(models.ClassSchedule)
        .filter(models.ClassSchedule.gym_id == membership.gym_id)
    )

    if start_date:
        query = query.filter(models.ClassInstance.class_date >= start_date)
    if end_date:
        query = query.filter(models.ClassInstance.class_date <= end_date)
    if classes:
        class_ids = [int(c.strip()) for c in classes.split(",")]
        query = query.filter(models.ClassInstance.class_id.in_(class_ids))
    if teachers:
        teacher_uuids = [t.strip() for t in teachers.split(",")]
        query = query.filter(models.ClassInstance.teacher_uuid.in_(teacher_uuids))
    if rating and rating != "all":
        ratings = [rating]
        if rating == "positive":
            ratings.append("thumbs_up")
        elif rating == "negative":
            ratings.append("thumbs_down")
        query = query.filter(models.ClassFeedback.rating.in_(ratings))

    feedback = query.order_by(models.ClassInstance.class_date.desc()).all()
    return feedback


@router.get("/admin/comprehensive-stats", response_model=schemas.FeedbackStats)
@limiter.limit(DASHBOARD_LIMIT)
def get_admin_stats(
    request: Request,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    classes: Optional[str] = Query(None),
    teachers: Optional[str] = Query(None),
    rating: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    membership: models.GymMembership = Depends(get_active_user_membership),
):
    query = (
        db.query(models.ClassFeedback)
        .join(models.ClassInstance)
        .join(models.ClassSchedule, models.ClassSchedule.id == models.ClassInstance.class_id)
        .filter(models.ClassSchedule.gym_id == membership.gym_id)
    )

    if start_date:
        query = query.filter(models.ClassInstance.class_date >= start_date)
    if end_date:
        query = query.filter(models.ClassInstance.class_date <= end_date)
    if classes:
        class_ids = [int(c.strip()) for c in classes.split(",")]
        query = query.filter(models.ClassInstance.class_id.in_(class_ids))
    if teachers:
        teacher_uuids = [t.strip() for t in teachers.split(",")]
        query = query.filter(models.ClassInstance.teacher_uuid.in_(teacher_uuids))
    if rating:
        ratings = [rating]
        if rating == "positive":
            ratings.append("thumbs_up")
        elif rating == "negative":
            ratings.append("thumbs_down")
        query = query.filter(models.ClassFeedback.rating.in_(ratings))

    total_feedback = query.count()
    positive_count = query.filter(models.ClassFeedback.rating.in_(["positive", "thumbs_up"])).count()
    negative_count = query.filter(models.ClassFeedback.rating.in_(["negative", "thumbs_down"])).count()
    positive_percent = (positive_count / total_feedback * 100) if total_feedback > 0 else 0

    return schemas.FeedbackStats(
        totalFeedback=total_feedback,
        positiveCount=positive_count,
        negativeCount=negative_count,
        positivePercent=round(positive_percent, 2),
    )
