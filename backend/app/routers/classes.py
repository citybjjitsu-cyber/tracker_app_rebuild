from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=schemas.ClassScheduleResponse)
@limiter.limit(WRITE_LIMIT)
def create_class(
    request: Request, cls: schemas.ClassScheduleCreate, db: Session = Depends(get_db)
):
    db_class = models.ClassSchedule(**cls.model_dump())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class


@router.get("/", response_model=List[schemas.ClassScheduleResponse])
@limiter.limit(READ_LIMIT)
def list_classes(request: Request, db: Session = Depends(get_db)):
    return (
        db.query(models.ClassSchedule)
        .filter(models.ClassSchedule.is_current == True)
        .all()
    )


@router.get("/{class_id}", response_model=schemas.ClassScheduleResponse)
@limiter.limit(READ_LIMIT)
def get_class(request: Request, class_id: int, db: Session = Depends(get_db)):
    cls = (
        db.query(models.ClassSchedule)
        .filter(
            models.ClassSchedule.id == class_id, models.ClassSchedule.is_current == True
        )
        .first()
    )
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls


@router.put("/{class_uuid}", response_model=schemas.ClassScheduleResponse)
@limiter.limit(WRITE_LIMIT)
def update_class(
    request: Request,
    class_uuid: str,
    cls: schemas.ClassScheduleUpdate,
    db: Session = Depends(get_db),
):
    db_class = (
        db.query(models.ClassSchedule)
        .filter(
            models.ClassSchedule.class_uuid == class_uuid,
            models.ClassSchedule.is_current == True,
        )
        .first()
    )
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found")

    for key, value in cls.model_dump().items():
        setattr(db_class, key, value)

    db.commit()
    db.refresh(db_class)
    return db_class
