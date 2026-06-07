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


@router.get("/", response_model=List[schemas.CurriculumResponse])
@limiter.limit(READ_LIMIT)
def list_curricula(request: Request, db: Session = Depends(get_db)):
    return db.query(models.Curriculum).all()


@router.post("/", response_model=schemas.CurriculumResponse)
@limiter.limit(WRITE_LIMIT)
def create_curriculum(
    request: Request,
    curriculum: schemas.CurriculumCreate,
    db: Session = Depends(get_db),
):
    db_curriculum = models.Curriculum(**curriculum.model_dump())
    db.add(db_curriculum)
    db.commit()
    db.refresh(db_curriculum)
    return db_curriculum
