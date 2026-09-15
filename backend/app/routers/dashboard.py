from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app import models, schemas
from datetime import date, timedelta
from collections import defaultdict
from typing import Optional
from app.database import SessionLocal
from app.auth.limiter import limiter, DASHBOARD_LIMIT
from app.routers.auth import get_admin_user

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


@router.get("/attendance-overview")
@limiter.limit(DASHBOARD_LIMIT)
def get_attendance_overview(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    class_ids: Optional[str] = None,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(get_admin_user),
):
    """
    Admin-only endpoint. Returns aggregated attendance across all students, filterable
    by date range and one or more class ids.

    Query params:
      start_date: ISO date (YYYY-MM-DD). Defaults to 30 days before end_date.
      end_date:   ISO date (YYYY-MM-DD). Defaults to today.
      class_ids:  comma-separated class ids. Empty/omitted = all classes.

    Returns:
      {
        "range": {"start": "...", "end": "..."},
        "totals": {"total_check_ins": N, "distinct_students": N, "distinct_classes": N},
        "series": [ { "date": "YYYY-MM-DD", "count": N } ... ],  # one entry per date in range
        "by_class": [ { "class_id": N, "class_name": "...", "count": N } ... ]
      }
    """
    today = date.today()

    try:
        end_d = date.fromisoformat(end_date) if end_date else today
    except ValueError:
        end_d = today
    try:
        start_d = date.fromisoformat(start_date) if start_date else end_d - timedelta(days=30)
    except ValueError:
        start_d = end_d - timedelta(days=30)

    if start_d > end_d:
        start_d, end_d = end_d, start_d

    parsed_class_ids: list[int] = []
    if class_ids:
        for token in class_ids.split(","):
            token = token.strip()
            if token.isdigit():
                parsed_class_ids.append(int(token))

    query = db.query(models.Attendance).filter(
        models.Attendance.status == "confirmed",
        models.Attendance.attendance_date >= start_d,
        models.Attendance.attendance_date <= end_d,
    )
    if parsed_class_ids:
        query = query.filter(models.Attendance.class_id.in_(parsed_class_ids))

    records = query.all()

    per_day: dict[str, int] = defaultdict(int)
    per_class: dict[int, int] = defaultdict(int)
    students: set[str] = set()

    for rec in records:
        per_day[rec.attendance_date.isoformat()] += 1
        if rec.class_id is not None:
            per_class[int(rec.class_id)] += 1
        if rec.user_uuid:
            students.add(str(rec.user_uuid))

    # Fill in every date in the range so the chart has continuous x-axis
    series: list[dict] = []
    cursor = start_d
    while cursor <= end_d:
        iso = cursor.isoformat()
        series.append({"date": iso, "count": per_day.get(iso, 0)})
        cursor = cursor + timedelta(days=1)

    # Resolve class names for by_class breakdown
    by_class: list[dict] = []
    if per_class:
        class_rows = db.query(models.ClassSchedule).filter(models.ClassSchedule.id.in_(list(per_class.keys()))).all()
        name_map = {int(c.id): str(c.class_name) for c in class_rows}
        for cid, cnt in sorted(per_class.items(), key=lambda kv: kv[1], reverse=True):
            by_class.append(
                {
                    "class_id": cid,
                    "class_name": name_map.get(cid, f"Class #{cid}"),
                    "count": cnt,
                }
            )

    return {
        "range": {"start": start_d.isoformat(), "end": end_d.isoformat()},
        "totals": {
            "total_check_ins": len(records),
            "distinct_students": len(students),
            "distinct_classes": len(per_class),
        },
        "series": series,
        "by_class": by_class,
    }
