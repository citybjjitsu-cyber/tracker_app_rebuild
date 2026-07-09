from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List
from datetime import date
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _compute_user_progress(user_uuid: str, db: Session) -> dict:
    attendance = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.user_uuid == user_uuid,
            models.Attendance.status == "confirmed",
        )
        .all()
    )
    total_earned = sum(
        (db.query(models.ClassSchedule).filter(models.ClassSchedule.id == a.class_id).first()).points
        if db.query(models.ClassSchedule).filter(models.ClassSchedule.id == a.class_id).first()
        else 0
        for a in attendance
    )

    adjustments = db.query(models.PointsAdjustment).filter(models.PointsAdjustment.user_uuid == user_uuid).all()
    total_adjustments = sum(a.amount for a in adjustments)

    current_progress = total_earned + total_adjustments

    user = db.query(models.User).filter(models.User.user_uuid == user_uuid).first()

    current_tier = None
    current_target = None
    next_tier = None
    percentage = None

    if user and user.rank_tier_id:
        current_tier = db.query(models.RankTier).filter(models.RankTier.id == user.rank_tier_id).first()
        if current_tier:
            current_target = current_tier.target_points
            if current_target and current_target > 0:
                percentage = round((current_progress / current_target) * 100, 1)

            next_tier = (
                db.query(models.RankTier)
                .filter(models.RankTier.sort_order > current_tier.sort_order)
                .order_by(models.RankTier.sort_order)
                .first()
            )

    return {
        "total_earned": total_earned,
        "total_adjustments": total_adjustments,
        "current_progress": current_progress,
        "current_rank_tier": current_tier,
        "current_target": current_target,
        "next_rank_tier": next_tier,
        "percentage": percentage,
    }


@router.get("/progress/{user_uuid}", response_model=schemas.UserProgressResponse)
@limiter.limit(READ_LIMIT)
def get_user_progress(request: Request, user_uuid: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    progress = _compute_user_progress(user_uuid, db)
    return schemas.UserProgressResponse(**progress)


@router.post("/adjust/{user_uuid}", response_model=schemas.PointsAdjustmentResponse)
@limiter.limit(WRITE_LIMIT)
def adjust_user_points(
    request: Request,
    user_uuid: str,
    adjustment: schemas.AdjustPointsRequest,
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.user_uuid == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    admin_uuid = request.state.user_uuid if hasattr(request.state, "user_uuid") else None

    previous_rank_tier_id = user.rank_tier_id
    new_rank_tier_id = adjustment.new_rank_tier_id

    if new_rank_tier_id is not None:
        new_tier = db.query(models.RankTier).filter(models.RankTier.id == new_rank_tier_id).first()
        if not new_tier:
            raise HTTPException(status_code=404, detail="New rank tier not found")
        user.rank_tier_id = new_rank_tier_id
        user.last_graded_date = date.today()

    db_adjustment = models.PointsAdjustment(
        user_uuid=user_uuid,
        amount=adjustment.amount,
        reason=adjustment.reason,
        reference_rank_tier_id=adjustment.new_rank_tier_id,
        previous_rank_tier_id=previous_rank_tier_id,
        new_rank_tier_id=new_rank_tier_id,
        notes=adjustment.notes,
        adjusted_by_uuid=admin_uuid or user_uuid,
        adjustment_date=date.today(),
    )
    db.add(db_adjustment)
    db.commit()
    db.refresh(db_adjustment)
    return db_adjustment


@router.get("/{user_uuid}", response_model=List[schemas.PointsAdjustmentResponse])
@limiter.limit(READ_LIMIT)
def list_user_adjustments(request: Request, user_uuid: str, db: Session = Depends(get_db)):
    return (
        db.query(models.PointsAdjustment)
        .filter(models.PointsAdjustment.user_uuid == user_uuid)
        .order_by(models.PointsAdjustment.created_at.desc())
        .all()
    )
