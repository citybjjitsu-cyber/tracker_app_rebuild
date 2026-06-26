from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional
from app.auth.limiter import limiter, WRITE_LIMIT, READ_LIMIT, DASHBOARD_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.FeedbackResponse)
@limiter.limit(WRITE_LIMIT)
def submit_feedback(
    request: Request, feedback: schemas.FeedbackCreate, db: Session = Depends(get_db)
):
    db_feedback = models.ClassFeedback(**feedback.model_dump())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback


@router.get("/user/{user_uuid}", response_model=List[schemas.FeedbackResponse])
@limiter.limit(READ_LIMIT)
def get_user_feedback(request: Request, user_uuid: str, db: Session = Depends(get_db)):
    return (
        db.query(models.ClassFeedback)
        .filter(models.ClassFeedback.user_uuid == user_uuid)
        .order_by(models.ClassFeedback.created_at.desc())
        .all()
    )


@router.get("/teacher/{teacher_uuid}", response_model=List[schemas.FeedbackResponse])
@limiter.limit(READ_LIMIT)
def get_teacher_feedback(
    request: Request, teacher_uuid: str, db: Session = Depends(get_db)
):
    instances = (
        db.query(models.ClassInstance)
        .filter(models.ClassInstance.teacher_uuid == teacher_uuid)
        .all()
    )

    instance_ids = [i.id for i in instances]
    return (
        db.query(models.ClassFeedback)
        .filter(models.ClassFeedback.class_instance_id.in_(instance_ids))
        .all()
    )


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
):
    query = (
        db.query(models.ClassFeedback)
        .join(models.ClassInstance)
        .join(models.User)
        .join(models.ClassSchedule)
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
        query = query.filter(models.ClassFeedback.rating == rating)

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
):
    query = db.query(models.ClassFeedback).join(models.ClassInstance)

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
        query = query.filter(models.ClassFeedback.rating == rating)

    total_feedback = query.count()
    positive_count = query.filter(models.ClassFeedback.rating == "positive").count()
    negative_count = query.filter(models.ClassFeedback.rating == "negative").count()
    positive_percent = (
        (positive_count / total_feedback * 100) if total_feedback > 0 else 0
    )

    return schemas.FeedbackStats(
        totalFeedback=total_feedback,
        positiveCount=positive_count,
        negativeCount=negative_count,
        positivePercent=round(positive_percent, 2),
    )
