from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List, Optional
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT
from app.routers.auth import get_current_user
from app.services.authorization import resolve_active_membership
from app.routers.rosters import require_roster_admin, get_gym_class, validate_teacher

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_active_membership(
    gym_id: Optional[int] = Header(default=None, alias="X-Gym-Id"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return resolve_active_membership(db, str(user.user_uuid), gym_id)


@router.get("/", response_model=List[schemas.ClassInstanceResponse])
@limiter.limit(READ_LIMIT)
def list_class_instances(
    request: Request,
    class_id: Optional[int] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
    membership: models.GymMembership = Depends(get_active_membership),
):
    query = (
        db.query(models.ClassInstance)
        .join(models.ClassSchedule)
        .filter(models.ClassSchedule.gym_id == membership.gym_id)
    )
    if class_id:
        query = query.filter(models.ClassInstance.class_id == class_id)
    if date:
        query = query.filter(models.ClassInstance.class_date == date)
    return query.all()


@router.post("/", response_model=schemas.ClassInstanceResponse)
@limiter.limit(WRITE_LIMIT)
def create_class_instance(
    request: Request,
    instance: schemas.ClassInstanceCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    membership: models.GymMembership = Depends(get_active_membership),
):
    require_roster_admin(db, user, membership)
    get_gym_class(db, instance.class_id, int(membership.gym_id))
    if instance.teacher_uuid:
        validate_teacher(db, instance.teacher_uuid, int(membership.gym_id))
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
        if instance.teacher_uuid and existing.teacher_uuid != instance.teacher_uuid:
            existing.teacher_uuid = instance.teacher_uuid
            db.commit()
            db.refresh(existing)
        return existing

    db_instance = models.ClassInstance(**instance.model_dump())
    db.add(db_instance)
    db.commit()
    db.refresh(db_instance)
    return db_instance


@router.get("/by-date/")
@limiter.limit(READ_LIMIT)
def get_by_date(
    request: Request,
    class_id: int,
    date: str,
    db: Session = Depends(get_db),
    membership: models.GymMembership = Depends(get_active_membership),
):
    get_gym_class(db, class_id, int(membership.gym_id))
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
    user: models.User = Depends(get_current_user),
    membership: models.GymMembership = Depends(get_active_membership),
):
    require_roster_admin(db, user, membership)
    db_instance = db.query(models.ClassInstance).filter(models.ClassInstance.id == instance_id).first()
    if not db_instance:
        raise HTTPException(status_code=404, detail="Class instance not found")

    get_gym_class(db, db_instance.class_id, int(membership.gym_id))
    if instance.teacher_uuid:
        validate_teacher(db, instance.teacher_uuid, int(membership.gym_id))

    for key, value in instance.model_dump().items():
        setattr(db_instance, key, value)

    db.commit()
    db.refresh(db_instance)
    return db_instance
