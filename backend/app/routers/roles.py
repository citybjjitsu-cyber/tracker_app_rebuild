from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models, schemas
from typing import List
from app.auth.limiter import limiter, READ_LIMIT, WRITE_LIMIT
from app.services.audit import create_audit_log

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[schemas.RoleResponse])
@limiter.limit(READ_LIMIT)
def list_roles(request: Request, db: Session = Depends(get_db)):
    return db.query(models.Role).all()


@router.get("/user/{user_uuid}", response_model=List[schemas.UserRoleResponse])
@limiter.limit(READ_LIMIT)
def get_user_roles(request: Request, user_uuid: str, db: Session = Depends(get_db)):
    return (
        db.query(models.UserRole)
        .filter(
            models.UserRole.user_uuid == user_uuid, models.UserRole.is_current
        )
        .all()
    )


@router.put("/user/{user_uuid}")
@limiter.limit(WRITE_LIMIT)
def update_user_roles(
    request: Request, user_uuid: str, data: dict, db: Session = Depends(get_db)
):
    role_ids = data.get("role_ids", [])

    # Archive old roles
    old_roles = (
        db.query(models.UserRole)
        .filter(
            models.UserRole.user_uuid == user_uuid, models.UserRole.is_current
        )
        .all()
    )

    for ur in old_roles:
        ur.is_current = False

    # Add new roles
    for role_id in role_ids:
        user_role = models.UserRole(user_uuid=user_uuid, role_id=role_id)
        db.add(user_role)

    db.commit()

    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    create_audit_log(
        db,
        action="roles_update",
        resource_type="user",
        resource_uuid=user_uuid,
        detail=f"Roles updated to {role_ids}",
        ip_address=client_host,
        user_agent=user_agent,
    )

    return {"message": "Roles updated"}


@router.get("/user/{user_uuid}/history", response_model=List[schemas.UserRoleResponse])
@limiter.limit(READ_LIMIT)
def get_user_role_history(
    request: Request, user_uuid: str, db: Session = Depends(get_db)
):
    return (
        db.query(models.UserRole)
        .filter(models.UserRole.user_uuid == user_uuid)
        .order_by(models.UserRole.created_date.desc())
        .all()
    )


@router.get("/users/by-role/{role}", response_model=List[schemas.UserResponse])
@limiter.limit(READ_LIMIT)
def get_users_by_role(request: Request, role: str, db: Session = Depends(get_db)):
    role_obj = db.query(models.Role).filter(models.Role.name == role).first()
    if not role:
        return []

    user_roles = (
        db.query(models.UserRole)
        .filter(
            models.UserRole.role_id == role_obj.id, models.UserRole.is_current
        )
        .all()
    )

    user_uuids = [ur.user_uuid for ur in user_roles]
    return (
        db.query(models.User)
        .filter(models.User.user_uuid.in_(user_uuids), models.User.is_current)
        .all()
    )
