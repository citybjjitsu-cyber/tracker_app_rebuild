from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from datetime import date
from collections import defaultdict
from app.auth.limiter import limiter, DASHBOARD_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/stats/{user_uuid}", response_model=schemas.DashboardStats)
@limiter.limit(DASHBOARD_LIMIT)
def get_dashboard_stats(request: Request, user_uuid: str, db: Session = Depends(get_db)):
    attendance = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_uuid == user_uuid,
            models.Attendance.status == "confirmed",
        )
        .all()
    )

    total_classes = len(attendance)
    total_points = sum(
        (
            db.query(models.ClassSchedule).filter(models.ClassSchedule.id == a.class_id).first()
            or schemas.ClassScheduleResponse(class_name="", points=0)
        ).points
        for a in attendance
    )

    # This month
    today = date.today()
    start_of_month = date(today.year, today.month, 1)
    classes_this_month = sum(1 for a in attendance if a.attendance_date >= start_of_month)

    # Last class
    last_class_days_ago = None
    if attendance:
        last_att = max(attendance, key=lambda a: a.attendance_date)
        last_class_days_ago = (today - last_att.attendance_date).days

    # Rank tier progress
    current_rank_tier = None
    current_target = None
    next_rank_tier = None
    progress_percentage = None
    total_adjustments = 0

    user = db.query(models.User).filter(models.User.user_uuid == user_uuid).first()
    if user and user.rank_tier_id:
        current_rank_tier = db.query(models.RankTier).filter(models.RankTier.id == user.rank_tier_id).first()
        if current_rank_tier:
            current_target = current_rank_tier.target_points
            adjustments = db.query(models.PointsAdjustment).filter(models.PointsAdjustment.user_uuid == user_uuid).all()
            total_adjustments = sum(a.amount for a in adjustments)
            current_progress = total_points + total_adjustments
            if current_target and current_target > 0:
                progress_percentage = round((current_progress / current_target) * 100, 1)
            next_rank_tier = (
                db.query(models.RankTier)
                .filter(models.RankTier.sort_order > current_rank_tier.sort_order)
                .order_by(models.RankTier.sort_order)
                .first()
            )
            # Convert ORM objects to response schemas
            current_rank_tier = schemas.RankTierResponse.model_validate(current_rank_tier)
            if next_rank_tier:
                next_rank_tier = schemas.RankTierResponse.model_validate(next_rank_tier)

    return schemas.DashboardStats(
        totalClasses=total_classes,
        totalPoints=total_points,
        classesThisMonth=classes_this_month,
        lastClassDaysAgo=last_class_days_ago,
        current_rank_tier=current_rank_tier,
        current_target=current_target,
        next_rank_tier=next_rank_tier,
        progress_percentage=progress_percentage,
        total_adjustments=total_adjustments,
    )


@router.get("/attendance-trend/{user_uuid}")
@limiter.limit(DASHBOARD_LIMIT)
def get_attendance_trend(request: Request, user_uuid: str, days: int = 90, db: Session = Depends(get_db)):
    from datetime import timedelta

    today = date.today()
    start_date = today - timedelta(days=days)

    attendance = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_uuid == user_uuid,
            models.Attendance.status == "confirmed",
            models.Attendance.attendance_date >= start_date,
        )
        .all()
    )

    # Group by date
    trend = defaultdict(lambda: {"count": 0, "points": 0})

    for att in attendance:
        date_str = att.attendance_date.isoformat()
        cls = db.query(models.ClassSchedule).filter(models.ClassSchedule.id == att.class_id).first()
        points = cls.points if cls else 1
        trend[date_str]["count"] += 1
        trend[date_str]["points"] += points

    result = [{"date": d, "count": v["count"], "points": v["points"]} for d, v in sorted(trend.items())]

    return result
