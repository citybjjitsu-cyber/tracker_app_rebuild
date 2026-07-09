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


@router.get("/", response_model=List[schemas.TermResponse])
@limiter.limit(READ_LIMIT)
def list_terms(request: Request, db: Session = Depends(get_db)):
    return db.query(models.Term).all()


@router.post("/", response_model=schemas.TermResponse)
@limiter.limit(WRITE_LIMIT)
def create_term(request: Request, term: schemas.TermCreate, db: Session = Depends(get_db)):
    db_term = models.Term(**term.model_dump())
    db.add(db_term)
    db.commit()
    db.refresh(db_term)
    return db_term


@router.get("/term-targets/", response_model=List[schemas.TermTargetResponse], deprecated=True)
@limiter.limit(READ_LIMIT)
def list_targets(request: Request, db: Session = Depends(get_db)):
    return db.query(models.TermTarget).all()


@router.post("/term-targets/", response_model=schemas.TermTargetResponse, deprecated=True)
@limiter.limit(WRITE_LIMIT)
def create_target(request: Request, target: schemas.TermTargetCreate, db: Session = Depends(get_db)):
    db_target = models.TermTarget(**target.model_dump())
    db.add(db_target)
    db.commit()
    db.refresh(db_target)
    return db_target
