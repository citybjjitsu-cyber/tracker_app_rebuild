from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[schemas.GymLocationResponse])
@limiter.limit(READ_LIMIT)
def list_gyms(request: Request, db: Session = Depends(get_db)):
    return db.query(models.GymLocation).all()


@router.post("/", response_model=schemas.GymLocationResponse)
@limiter.limit(WRITE_LIMIT)
def create_gym(
    request: Request, gym: schemas.GymLocationCreate, db: Session = Depends(get_db)
):
    db_gym = models.GymLocation(**gym.model_dump())
    db.add(db_gym)
    db.commit()
    db.refresh(db_gym)
    return db_gym
