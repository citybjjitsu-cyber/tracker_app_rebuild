from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth.limiter import READ_LIMIT, WRITE_LIMIT, limiter
from app.database import SessionLocal
from app.routers.auth import get_current_user
from app.services.authorization import (
    has_gym_role,
    has_platform_role,
    resolve_active_membership,
)

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


def require_roster_admin(db: Session, user: models.User, membership: models.GymMembership) -> None:
    if has_platform_role(db, str(user.user_uuid)):
        return
    if not has_gym_role(db, int(membership.id), ("Gym Admin", "Admin")):
        raise HTTPException(status_code=403, detail="Gym Admin role required")


def get_gym_class(db: Session, class_id: int, gym_id: int) -> models.ClassSchedule:
    db_class = (
        db.query(models.ClassSchedule)
        .filter(
            models.ClassSchedule.id == class_id,
            models.ClassSchedule.gym_id == gym_id,
            models.ClassSchedule.is_current.is_(True),
        )
        .first()
    )
    if not db_class:
        raise HTTPException(status_code=404, detail="Class not found in active gym")
    return db_class


def validate_teacher(db: Session, teacher_uuid: str, gym_id: int) -> models.User:
    teacher = (
        db.query(models.User).filter(models.User.user_uuid == teacher_uuid, models.User.is_current.is_(True)).first()
    )
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    membership = (
        db.query(models.GymMembership)
        .filter(
            models.GymMembership.user_uuid == teacher_uuid,
            models.GymMembership.gym_id == gym_id,
            models.GymMembership.status == "active",
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=400, detail="Teacher must have an active gym membership")
    if not has_gym_role(db, int(membership.id), ("Teacher", "Gym Admin", "Admin")):
        raise HTTPException(status_code=400, detail="User must have a Teacher role in this gym")
    return teacher


def serialize_roster(roster: models.ClassTeacherRoster) -> dict:
    data = schemas.ClassTeacherRosterResponse.model_validate(roster).model_dump()
    if roster.teacher:
        data["teacher"] = schemas.UserResponse.model_validate(roster.teacher).model_dump()
    return data


@router.get("/", response_model=List[schemas.ClassTeacherRosterResponse])
@limiter.limit(READ_LIMIT)
def list_rosters(
    request: Request,
    class_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    membership: models.GymMembership = Depends(get_active_membership),
):
    query = (
        db.query(models.ClassTeacherRoster)
        .options(joinedload(models.ClassTeacherRoster.teacher))
        .filter(models.ClassTeacherRoster.gym_id == membership.gym_id)
    )
    if class_id is not None:
        query = query.filter(models.ClassTeacherRoster.class_id == class_id)
    if not include_inactive:
        query = query.filter(models.ClassTeacherRoster.is_current.is_(True))
    return [
        serialize_roster(roster)
        for roster in query.order_by(
            models.ClassTeacherRoster.class_id, models.ClassTeacherRoster.priority.desc()
        ).all()
    ]


@router.post("/", response_model=schemas.ClassTeacherRosterResponse)
@limiter.limit(WRITE_LIMIT)
def create_roster(
    request: Request,
    roster: schemas.ClassTeacherRosterCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    membership: models.GymMembership = Depends(get_active_membership),
):
    require_roster_admin(db, user, membership)
    if roster.start_date and roster.end_date and roster.end_date < roster.start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after start date")
    get_gym_class(db, roster.class_id, int(membership.gym_id))
    validate_teacher(db, roster.teacher_uuid, int(membership.gym_id))
    existing = (
        db.query(models.ClassTeacherRoster)
        .filter(
            models.ClassTeacherRoster.gym_id == membership.gym_id,
            models.ClassTeacherRoster.class_id == roster.class_id,
            models.ClassTeacherRoster.teacher_uuid == roster.teacher_uuid,
            models.ClassTeacherRoster.start_date == roster.start_date,
            models.ClassTeacherRoster.is_current.is_(True),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="This recurring teacher assignment already exists")

    db_roster = models.ClassTeacherRoster(
        **roster.model_dump(),
        gym_id=membership.gym_id,
        created_by=str(user.user_uuid),
    )
    db.add(db_roster)
    db.commit()
    db.refresh(db_roster)
    db_roster.teacher = validate_teacher(db, roster.teacher_uuid, int(membership.gym_id))
    return serialize_roster(db_roster)


@router.put("/{roster_id}", response_model=schemas.ClassTeacherRosterResponse)
@limiter.limit(WRITE_LIMIT)
def update_roster(
    request: Request,
    roster_id: int,
    roster_update: schemas.ClassTeacherRosterUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    membership: models.GymMembership = Depends(get_active_membership),
):
    require_roster_admin(db, user, membership)
    db_roster = (
        db.query(models.ClassTeacherRoster)
        .filter(
            models.ClassTeacherRoster.id == roster_id,
            models.ClassTeacherRoster.gym_id == membership.gym_id,
        )
        .first()
    )
    if not db_roster:
        raise HTTPException(status_code=404, detail="Roster assignment not found")

    values = roster_update.model_dump(exclude_unset=True)
    teacher_uuid = values.get("teacher_uuid", db_roster.teacher_uuid)
    start_date = values.get("start_date", db_roster.start_date)
    end_date = values.get("end_date", db_roster.end_date)
    if start_date and end_date and end_date < start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after start date")
    get_gym_class(db, db_roster.class_id, int(membership.gym_id))
    validate_teacher(db, teacher_uuid, int(membership.gym_id))
    for key, value in values.items():
        setattr(db_roster, key, value)
    db.commit()
    db.refresh(db_roster)
    return serialize_roster(db_roster)


@router.delete("/{roster_id}")
@limiter.limit(WRITE_LIMIT)
def delete_roster(
    request: Request,
    roster_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    membership: models.GymMembership = Depends(get_active_membership),
):
    require_roster_admin(db, user, membership)
    db_roster = (
        db.query(models.ClassTeacherRoster)
        .filter(
            models.ClassTeacherRoster.id == roster_id,
            models.ClassTeacherRoster.gym_id == membership.gym_id,
        )
        .first()
    )
    if not db_roster:
        raise HTTPException(status_code=404, detail="Roster assignment not found")
    db_roster.is_current = False
    db.commit()
    return {"message": "Roster assignment removed"}


def resolve_effective_teacher(db: Session, class_id: int, gym_id: int, class_date: date) -> Optional[str]:
    roster = (
        db.query(models.ClassTeacherRoster)
        .filter(
            models.ClassTeacherRoster.class_id == class_id,
            models.ClassTeacherRoster.gym_id == gym_id,
            models.ClassTeacherRoster.is_current.is_(True),
            (models.ClassTeacherRoster.start_date.is_(None) | (models.ClassTeacherRoster.start_date <= class_date)),
            (models.ClassTeacherRoster.end_date.is_(None) | (models.ClassTeacherRoster.end_date >= class_date)),
        )
        .order_by(models.ClassTeacherRoster.priority.desc(), models.ClassTeacherRoster.id.asc())
        .first()
    )
    return roster.teacher_uuid if roster else None
