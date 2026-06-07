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


@router.get("/", response_model=List[schemas.ClassInstanceResponse])
@limiter.limit(READ_LIMIT)
def list_class_instances(
    request: Request, class_id: Optional[int] = None, db: Session = Depends(get_db)
):
    query = db.query(models.ClassInstance)
    if class_id:
        query = query.filter(models.ClassInstance.class_id == class_id)
    return query.all()


@router.post("/", response_model=schemas.ClassInstanceResponse)
@limiter.limit(WRITE_LIMIT)
def create_class_instance(
    request: Request,
    instance: schemas.ClassInstanceCreate,
    db: Session = Depends(get_db),
):
    # Check if already exists
    existing = (
        db.query(models.ClassInstance)
        .filter(
            models.ClassInstance.class_id == instance.class_id,
            models.ClassInstance.class_date == instance.class_date,
        )
        .first()
    )

    if existing:
        return existing

    db_instance = models.ClassInstance(**instance.model_dump())
    db.add(db_instance)
    db.commit()
    db.refresh(db_instance)
    return db_instance


@router.get("/by-date/")
@limiter.limit(READ_LIMIT)
def get_by_date(
    request: Request, class_id: int, date: str, db: Session = Depends(get_db)
):
    instance = (
        db.query(models.ClassInstance)
        .filter(
            models.ClassInstance.class_id == class_id,
            models.ClassInstance.class_date == date,
        )
        .first()
    )

    if not instance:
        raise HTTPException(status_code=404, detail="Class instance not found")

    return instance


@router.put("/{instance_id}", response_model=schemas.ClassInstanceResponse)
@limiter.limit(WRITE_LIMIT)
def update_class_instance(
    request: Request,
    instance_id: int,
    instance: schemas.ClassInstanceUpdate,
    db: Session = Depends(get_db),
):
    db_instance = (
        db.query(models.ClassInstance)
        .filter(models.ClassInstance.id == instance_id)
        .first()
    )
    if not db_instance:
        raise HTTPException(status_code=404, detail="Class instance not found")

    for key, value in instance.model_dump().items():
        setattr(db_instance, key, value)

    db.commit()
    db.refresh(db_instance)
    return db_instance
