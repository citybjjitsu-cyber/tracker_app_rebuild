from app import models


def add_membership(db_session, user_uuid, gym_id=1, status="active", is_primary=True):
    membership = models.GymMembership(
        user_uuid=user_uuid,
        gym_id=gym_id,
        status=status,
        is_primary=is_primary,
    )
    db_session.add(membership)
    db_session.flush()
    return membership


def test_list_my_memberships(client, headers, db_session):
    response = client.get("/memberships/me", headers=headers)

    assert response.status_code == 200
    assert response.json()[0]["gym_id"] == 1
    assert response.json()[0]["status"] == "active"


def test_active_context_requires_selection_for_multiple_memberships(client, headers, db_session):
    db_session.add(models.GymLocation(id=2, name="Second Gym"))
    db_session.flush()
    add_membership(
        db_session,
        "staff-uuid-0000-0000-000000000001",
        gym_id=2,
        is_primary=False,
    )
    db_session.commit()

    response = client.get("/memberships/context", headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Active gym selection required"

    selected = client.get(
        "/memberships/context",
        headers={**headers, "X-Gym-Id": "2"},
    )
    assert selected.status_code == 200
    assert selected.json()["membership"]["gym_id"] == 2


def test_platform_admin_can_add_and_suspend_membership(client, headers, db_session):
    db_session.add(models.GymLocation(id=2, name="Second Gym"))
    db_session.commit()

    created = client.post(
        "/memberships/",
        json={
            "user_uuid": "pinless-uuid-0000-0000-000000000003",
            "gym_id": 2,
        },
        headers=headers,
    )
    assert created.status_code == 200
    membership_id = created.json()["id"]
    assert created.json()["status"] == "active"

    suspended = client.patch(
        f"/memberships/{membership_id}",
        json={"status": "suspended", "reason": "Test suspension"},
        headers=headers,
    )
    assert suspended.status_code == 200
    assert suspended.json()["status"] == "suspended"


def test_platform_admin_can_assign_and_revoke_gym_role(client, headers, db_session):
    membership = add_membership(
        db_session,
        "pinless-uuid-0000-0000-000000000003",
        gym_id=1,
    )
    db_session.commit()
    teacher_role = db_session.query(models.Role).filter(models.Role.name == "Teacher").one()

    assigned = client.post(
        f"/memberships/{membership.id}/roles",
        json={"role_id": teacher_role.id},
        headers=headers,
    )
    assert assigned.status_code == 200
    assert assigned.json()["status"] == "active"

    revoked = client.delete(
        f"/memberships/{membership.id}/roles/{teacher_role.id}",
        headers=headers,
    )
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"
