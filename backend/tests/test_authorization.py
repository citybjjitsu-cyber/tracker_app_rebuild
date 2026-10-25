import pytest
from fastapi import HTTPException

from app import models
from app.services.authorization import (
    get_active_membership,
    get_user_memberships,
    has_gym_role,
    has_platform_role,
    require_active_membership,
    require_gym_role,
    require_platform_role,
)


def _add_membership(db_session, user_uuid, status="active"):
    membership = models.GymMembership(
        user_uuid=user_uuid,
        gym_id=1,
        status=status,
        is_primary=True,
    )
    db_session.add(membership)
    db_session.flush()
    return membership


def test_active_membership_and_scoped_role(db_session):
    membership = _add_membership(db_session, "pinless-uuid-0000-0000-000000000003")
    teacher_role = db_session.query(models.Role).filter(models.Role.name == "Teacher").one()
    db_session.add(
        models.GymRoleAssignment(
            membership_id=membership.id,
            role_id=teacher_role.id,
        )
    )
    db_session.commit()

    assert get_active_membership(db_session, membership.user_uuid, 1).id == membership.id
    assert has_gym_role(db_session, membership.id, ("Teacher",))
    assert require_gym_role(db_session, membership.user_uuid, 1, ("Teacher",)).id == membership.id


def test_pending_membership_cannot_authorize(db_session):
    membership = _add_membership(
        db_session,
        "pinless-uuid-0000-0000-000000000003",
        status="pending",
    )

    assert get_active_membership(db_session, membership.user_uuid, 1) is None
    with pytest.raises(HTTPException) as exc_info:
        require_active_membership(db_session, membership.user_uuid, 1)
    assert exc_info.value.status_code == 403


def test_platform_role_preserves_transition_access(db_session):
    db_session.add(
        models.UserRole(
            user_uuid="staff-uuid-0000-0000-000000000001",
            role_id=4,
            is_current=True,
        )
    )
    db_session.commit()

    assert has_platform_role(db_session, "staff-uuid-0000-0000-000000000001")
    require_platform_role(db_session, "staff-uuid-0000-0000-000000000001")

    with pytest.raises(HTTPException) as exc_info:
        require_platform_role(db_session, "student-uuid-0000-0000-000000000002")
    assert exc_info.value.status_code == 403


def test_user_memberships_are_primary_first(db_session):
    primary = _add_membership(db_session, "pinless-uuid-0000-0000-000000000003")
    second_gym = models.GymLocation(id=2, name="Second Gym")
    db_session.add(second_gym)
    db_session.flush()
    second = models.GymMembership(
        user_uuid=primary.user_uuid,
        gym_id=2,
        status="active",
        is_primary=False,
    )
    db_session.add(second)
    db_session.commit()

    memberships = get_user_memberships(db_session, primary.user_uuid)
    assert [membership.id for membership in memberships] == [primary.id, second.id]
