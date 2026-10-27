from datetime import date

from app import models


def _add_teacher(db_session):
    teacher_uuid = "teacher-uuid-0000-0000-000000000004"
    db_session.add(
        models.User(
            user_uuid=teacher_uuid,
            first_name="Roster",
            last_name="Teacher",
            email="teacher@test.com",
            rank="Black",
            is_current=True,
        )
    )
    membership = models.GymMembership(
        user_uuid=teacher_uuid,
        gym_id=1,
        status="active",
        is_primary=True,
    )
    db_session.add(membership)
    db_session.flush()
    teacher_role = db_session.query(models.Role).filter(models.Role.name == "Teacher").first()
    db_session.add(
        models.GymRoleAssignment(
            membership_id=membership.id,
            role_id=teacher_role.id,
            status="active",
        )
    )
    db_session.commit()
    return teacher_uuid


def test_create_and_list_roster(client, headers, db_session):
    teacher_uuid = _add_teacher(db_session)
    response = client.post(
        "/class-teacher-rosters/",
        headers=headers,
        json={
            "class_id": 1,
            "teacher_uuid": teacher_uuid,
            "start_date": "2026-01-01",
            "assignment_role": "primary",
            "priority": 1,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["gym_id"] == 1
    assert data["teacher_uuid"] == teacher_uuid
    assert data["teacher"]["first_name"] == "Roster"

    listed = client.get("/class-teacher-rosters/", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1


def test_roster_rejects_teacher_without_active_role(client, headers, db_session):
    teacher_uuid = "student-uuid-0000-0000-000000000002"
    response = client.post(
        "/class-teacher-rosters/",
        headers=headers,
        json={"class_id": 1, "teacher_uuid": teacher_uuid},
    )
    assert response.status_code == 400
    assert "Teacher role" in response.json()["detail"]


def test_weekly_schedule_resolves_roster_teacher(client, headers, db_session):
    teacher_uuid = _add_teacher(db_session)
    db_session.add(
        models.ClassTeacherRoster(
            gym_id=1,
            class_id=1,
            teacher_uuid=teacher_uuid,
            start_date=date(2026, 1, 1),
            is_current=True,
        )
    )
    db_session.commit()
    response = client.get(
        "/classes/weekly",
        headers=headers,
        params={"week_start": "2026-01-05"},
    )
    assert response.status_code == 200
    monday_class = response.json()["days"][0]["classes"][0]
    assert monday_class["effective_teacher_uuid"] == teacher_uuid


def test_roster_remove_is_scoped_to_active_gym(client, headers, db_session):
    teacher_uuid = _add_teacher(db_session)
    roster = models.ClassTeacherRoster(
        gym_id=1,
        class_id=1,
        teacher_uuid=teacher_uuid,
        is_current=True,
    )
    db_session.add(roster)
    db_session.commit()
    response = client.delete(f"/class-teacher-rosters/{roster.id}", headers=headers)
    assert response.status_code == 200
    db_session.refresh(roster)
    assert roster.is_current is False
