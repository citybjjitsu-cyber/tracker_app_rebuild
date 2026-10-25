"""Gym membership and scoped-role authorization helpers."""

from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app import models


ACTIVE_MEMBERSHIP_STATUSES = ("pending", "invited", "active", "suspended")
ACTIVE_ROLE_STATUS = "active"
PLATFORM_ROLE_NAMES = ("Platform Admin", "Admin")


def get_user_memberships(db: Session, user_uuid: str) -> list[models.GymMembership]:
    """Return all memberships for a user, newest/current records first."""
    return (
        db.query(models.GymMembership)
        .filter(models.GymMembership.user_uuid == user_uuid)
        .order_by(models.GymMembership.is_primary.desc(), models.GymMembership.gym_id)
        .all()
    )


def get_active_memberships(db: Session, user_uuid: str) -> list[models.GymMembership]:
    return (
        db.query(models.GymMembership)
        .filter(
            models.GymMembership.user_uuid == user_uuid,
            models.GymMembership.status == "active",
        )
        .order_by(models.GymMembership.is_primary.desc(), models.GymMembership.gym_id)
        .all()
    )


def get_active_membership(
    db: Session,
    user_uuid: str,
    gym_id: int,
) -> Optional[models.GymMembership]:
    """Return an active membership or None for an unauthorized gym context."""
    return (
        db.query(models.GymMembership)
        .filter(
            models.GymMembership.user_uuid == user_uuid,
            models.GymMembership.gym_id == gym_id,
            models.GymMembership.status == "active",
        )
        .first()
    )


def require_active_membership(
    db: Session,
    user_uuid: str,
    gym_id: int,
) -> models.GymMembership:
    membership = get_active_membership(db, user_uuid, gym_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Active gym membership required")
    return membership


def resolve_active_membership(
    db: Session,
    user_uuid: str,
    gym_id: Optional[int] = None,
) -> models.GymMembership:
    """Resolve an explicit gym or the only active membership for a user."""
    if gym_id is not None:
        return require_active_membership(db, user_uuid, gym_id)

    memberships = get_active_memberships(db, user_uuid)
    if not memberships:
        raise HTTPException(status_code=403, detail="Active gym membership required")
    if len(memberships) > 1:
        raise HTTPException(status_code=409, detail="Active gym selection required")
    return memberships[0]


def has_gym_role(
    db: Session,
    membership_id: int,
    role_names: Iterable[str],
) -> bool:
    names = tuple(role_names)
    if not names:
        return False
    return (
        db.query(models.GymRoleAssignment)
        .join(models.Role, models.Role.id == models.GymRoleAssignment.role_id)
        .filter(
            models.GymRoleAssignment.membership_id == membership_id,
            models.GymRoleAssignment.status == ACTIVE_ROLE_STATUS,
            models.Role.name.in_(names),
        )
        .first()
        is not None
    )


def require_gym_role(
    db: Session,
    user_uuid: str,
    gym_id: int,
    role_names: Iterable[str],
) -> models.GymMembership:
    membership = require_active_membership(db, user_uuid, gym_id)
    if not has_gym_role(db, int(membership.id), role_names):
        raise HTTPException(status_code=403, detail="Required gym role missing")
    return membership


def has_platform_role(db: Session, user_uuid: str) -> bool:
    """Preserve the current global Admin role during the migration transition."""
    return (
        db.query(models.UserRole)
        .join(models.Role, models.Role.id == models.UserRole.role_id)
        .filter(
            models.UserRole.user_uuid == user_uuid,
            models.UserRole.is_current.is_(True),
            models.Role.name.in_(PLATFORM_ROLE_NAMES),
        )
        .first()
        is not None
    )


def require_platform_role(db: Session, user_uuid: str) -> None:
    if not has_platform_role(db, user_uuid):
        raise HTTPException(status_code=403, detail="Platform Admin role required")
