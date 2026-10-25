from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.auth.limiter import READ_LIMIT, limiter
from app.auth.limiter import WRITE_LIMIT
from app.database import SessionLocal
from app.routers.auth import get_current_user
from app.services.audit import create_audit_log
from app.auth.jwt_utils import revoke_all_user_tokens
from app.services.authorization import (
    get_user_memberships,
    has_gym_role,
    has_platform_role,
    require_active_membership,
    resolve_active_membership,
)


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/me", response_model=List[schemas.GymMembershipResponse])
@limiter.limit(READ_LIMIT)
def list_my_memberships(
    request: Request,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return get_user_memberships(db, str(user.user_uuid))


@router.get("/context", response_model=schemas.ActiveGymContextResponse)
@limiter.limit(READ_LIMIT)
def get_active_context(
    request: Request,
    gym_id: Optional[int] = Header(default=None, alias="X-Gym-Id"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    membership = resolve_active_membership(db, str(user.user_uuid), gym_id)
    assignments = (
        db.query(models.GymRoleAssignment)
        .options(joinedload(models.GymRoleAssignment.role))
        .filter(
            models.GymRoleAssignment.membership_id == membership.id,
            models.GymRoleAssignment.status == "active",
        )
        .all()
    )
    return {"membership": membership, "roles": assignments}


def _require_membership_manager(
    db: Session,
    actor: models.User,
    gym_id: int,
) -> None:
    if has_platform_role(db, str(actor.user_uuid)):
        return
    membership = require_active_membership(db, str(actor.user_uuid), gym_id)
    if not has_gym_role(db, int(membership.id), ("Gym Admin", "Admin")):
        raise HTTPException(status_code=403, detail="Gym Admin role required")


@router.get("/user/{user_uuid}", response_model=List[schemas.GymMembershipResponse])
@limiter.limit(READ_LIMIT)
def list_user_memberships(
    request: Request,
    user_uuid: str,
    db: Session = Depends(get_db),
    actor: models.User = Depends(get_current_user),
):
    memberships = get_user_memberships(db, user_uuid)
    if not memberships:
        return []
    if not has_platform_role(db, str(actor.user_uuid)):
        visible = []
        for membership in memberships:
            try:
                _require_membership_manager(db, actor, int(membership.gym_id))
            except HTTPException:
                continue
            visible.append(membership)
        return visible
    return memberships


@router.post("/", response_model=schemas.GymMembershipResponse)
@limiter.limit(WRITE_LIMIT)
def add_membership(
    request: Request,
    data: schemas.GymMembershipCreate,
    db: Session = Depends(get_db),
    actor: models.User = Depends(get_current_user),
):
    _require_membership_manager(db, actor, data.gym_id)
    existing = (
        db.query(models.GymMembership)
        .filter(
            models.GymMembership.user_uuid == data.user_uuid,
            models.GymMembership.gym_id == data.gym_id,
            models.GymMembership.status.in_(("pending", "invited", "active", "suspended")),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Active membership already exists")
    membership = models.GymMembership(
        user_uuid=data.user_uuid,
        gym_id=data.gym_id,
        status=data.status,
        is_primary=False,
        created_by=str(actor.user_uuid),
    )
    db.add(membership)
    db.commit()
    db.refresh(membership)
    create_audit_log(
        db,
        action="gym_membership_add",
        resource_type="gym_membership",
        actor_uuid=str(actor.user_uuid),
        resource_uuid=str(membership.id),
        detail=f"Added user {data.user_uuid} to gym {data.gym_id}",
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent"),
    )
    return membership


@router.patch("/{membership_id}", response_model=schemas.GymMembershipResponse)
@limiter.limit(WRITE_LIMIT)
def update_membership(
    request: Request,
    membership_id: int,
    data: schemas.GymMembershipStatusUpdate,
    db: Session = Depends(get_db),
    actor: models.User = Depends(get_current_user),
):
    membership = db.query(models.GymMembership).filter(models.GymMembership.id == membership_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    _require_membership_manager(db, actor, int(membership.gym_id))
    membership.status = data.status
    membership.status_reason = data.reason
    membership.status_changed_at = models._utcnow()
    revoke_all_user_tokens(db, str(membership.user_uuid))
    db.commit()
    db.refresh(membership)
    create_audit_log(
        db,
        action="gym_membership_status",
        resource_type="gym_membership",
        actor_uuid=str(actor.user_uuid),
        resource_uuid=str(membership.id),
        detail=f"Membership status changed to {data.status}",
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent"),
    )
    return membership


@router.post("/{membership_id}/roles", response_model=schemas.GymRoleAssignmentResponse)
@limiter.limit(WRITE_LIMIT)
def assign_membership_role(
    request: Request,
    membership_id: int,
    data: schemas.GymRoleAssignmentCreate,
    db: Session = Depends(get_db),
    actor: models.User = Depends(get_current_user),
):
    membership = db.query(models.GymMembership).filter(models.GymMembership.id == membership_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    _require_membership_manager(db, actor, int(membership.gym_id))
    role = db.query(models.Role).filter(models.Role.id == data.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    existing = (
        db.query(models.GymRoleAssignment)
        .filter(
            models.GymRoleAssignment.membership_id == membership_id,
            models.GymRoleAssignment.role_id == data.role_id,
            models.GymRoleAssignment.status == "active",
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Role is already assigned")
    assignment = models.GymRoleAssignment(
        membership_id=membership_id,
        role_id=data.role_id,
        status="active",
        assigned_by=str(actor.user_uuid),
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    assignment.role = role
    create_audit_log(
        db,
        action="gym_role_assign",
        resource_type="gym_role_assignment",
        actor_uuid=str(actor.user_uuid),
        resource_uuid=str(assignment.id),
        detail=f"Assigned role {role.name} to membership {membership_id}",
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent"),
    )
    return assignment


@router.delete("/{membership_id}/roles/{role_id}", response_model=schemas.GymRoleAssignmentResponse)
@limiter.limit(WRITE_LIMIT)
def revoke_membership_role(
    request: Request,
    membership_id: int,
    role_id: int,
    db: Session = Depends(get_db),
    actor: models.User = Depends(get_current_user),
):
    membership = db.query(models.GymMembership).filter(models.GymMembership.id == membership_id).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    _require_membership_manager(db, actor, int(membership.gym_id))
    assignment = (
        db.query(models.GymRoleAssignment)
        .filter(
            models.GymRoleAssignment.membership_id == membership_id,
            models.GymRoleAssignment.role_id == role_id,
            models.GymRoleAssignment.status == "active",
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="Active role assignment not found")
    assignment.status = "revoked"
    assignment.revoked_by = str(actor.user_uuid)
    assignment.reason = "Revoked by administrator"
    assignment.updated_at = models._utcnow()
    revoke_all_user_tokens(db, str(membership.user_uuid))
    db.commit()
    db.refresh(assignment)
    create_audit_log(
        db,
        action="gym_role_revoke",
        resource_type="gym_role_assignment",
        actor_uuid=str(actor.user_uuid),
        resource_uuid=str(assignment.id),
        detail=f"Revoked role {role_id} from membership {membership_id}",
        ip_address=request.client.host if request.client else "unknown",
        user_agent=request.headers.get("user-agent"),
    )
    return assignment
