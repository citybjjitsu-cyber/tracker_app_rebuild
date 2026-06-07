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


@router.get("/", response_model=List[schemas.ClassTypeResponse])
@limiter.limit(READ_LIMIT)
def list_class_types(request: Request, db: Session = Depends(get_db)):
    return db.query(models.ClassType).all()


@router.post("/", response_model=schemas.ClassTypeResponse)
@limiter.limit(WRITE_LIMIT)
def create_class_type(
    request: Request, ct: schemas.ClassTypeCreate, db: Session = Depends(get_db)
):
    db_ct = models.ClassType(**ct.model_dump())
    db.add(db_ct)
    db.commit()
    db.refresh(db_ct)
    return db_ct
