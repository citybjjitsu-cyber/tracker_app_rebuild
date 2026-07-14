from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT
from app.routers.auth import get_admin_user

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[schemas.RankTierResponse])
@limiter.limit(READ_LIMIT)
def list_rank_tiers(request: Request, db: Session = Depends(get_db)):
    return db.query(models.RankTier).order_by(models.RankTier.sort_order).all()


@router.put("/{tier_id}", response_model=schemas.RankTierResponse)
@limiter.limit(WRITE_LIMIT)
def update_rank_tier(
    request: Request,
    tier_id: int,
    update: schemas.RankTierUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_admin_user),
):
    tier = db.query(models.RankTier).filter(models.RankTier.id == tier_id).first()
    if not tier:
        raise HTTPException(status_code=404, detail="Rank tier not found")

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(tier, key, value)

    db.commit()
    db.refresh(tier)
    return tier
