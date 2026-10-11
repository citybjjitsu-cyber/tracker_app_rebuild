import pytest
from app.main import app
from app.routers.feedback import get_db as feedback_get_db
from app import models
from datetime import date
from tests.conftest import STAFF_UUID, STUDENT_UUID


@pytest.fixture(autouse=True)
def _override_deps(db_session):
    app.dependency_overrides[feedback_get_db] = lambda: db_session
    yield


def test_submit_feedback(client, db_session):
    ci = models.ClassInstance(class_id=1, class_date=date.today())
    db_session.add(ci)
    db_session.flush()
    att = models.Attendance(
        user_uuid=STUDENT_UUID,
        class_id=1,
        class_instance_id=ci.id,
    )
    db_session.add(att)
    db_session.flush()

    response = client.post(
        "/feedback/",
        json={
            "attendance_id": att.id,
            "rating": "thumbs_up",
            "comment": "Great class!",
        },
    )

    feedback = db_session.query(models.ClassFeedback).first()
    assert response.status_code == 200
    assert feedback is not None
    assert feedback.rating == "positive"
    assert feedback.comment == "Great class!"
    assert feedback.attendance_id == att.id
    assert feedback.user_uuid == STUDENT_UUID
    assert feedback.class_instance_id == ci.id


def test_submit_feedback_rejects_duplicate_for_attendance(client, db_session):
    ci = models.ClassInstance(class_id=1, class_date=date.today())
    db_session.add(ci)
    db_session.flush()
    att = models.Attendance(
        user_uuid=STUDENT_UUID,
        class_id=1,
        class_instance_id=ci.id,
    )
    db_session.add(att)
    db_session.flush()

    payload = {"attendance_id": att.id, "rating": "positive"}
    assert client.post("/feedback/", json=payload).status_code == 200
    duplicate = client.post("/feedback/", json=payload)

    assert duplicate.status_code == 409


def test_submit_feedback_repairs_orphan_attendance(client, db_session):
    att = models.Attendance(
        user_uuid=STUDENT_UUID,
        class_id=1,
        attendance_date=date.today(),
    )
    db_session.add(att)
    db_session.flush()

    response = client.post(
        "/feedback/",
        json={"attendance_id": att.id, "rating": "positive"},
    )

    assert response.status_code == 200
    db_session.refresh(att)
    assert att.class_instance_id is not None
    assert response.json()["class_instance_id"] == att.class_instance_id


def test_get_user_feedback(client, db_session):
    ci = models.ClassInstance(class_id=1, class_date=date.today())
    db_session.add(ci)
    db_session.flush()
    feedback = models.ClassFeedback(
        user_uuid=STUDENT_UUID,
        attendance_id=1,
        class_instance_id=ci.id,
        rating="positive",
        comment="Nice",
    )
    db_session.add(feedback)
    db_session.commit()

    response = client.get(f"/feedback/user/{STUDENT_UUID}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["rating"] == "positive"


def test_get_teacher_feedback_empty(client, headers):
    response = client.get(f"/feedback/teacher/{STAFF_UUID}", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_teacher_feedback_requires_teacher_auth(client):
    response = client.get(f"/feedback/teacher/{STAFF_UUID}")

    assert response.status_code == 401


def test_get_teacher_feedback_applies_date_class_and_rating_filters(client, db_session, headers):
    today_instance = models.ClassInstance(
        class_id=1,
        class_date=date.today(),
        teacher_uuid="different-teacher",
    )
    old_instance = models.ClassInstance(
        class_id=1,
        class_date=date(2024, 1, 1),
        teacher_uuid=STAFF_UUID,
    )
    db_session.add_all([today_instance, old_instance])
    db_session.flush()
    db_session.add_all(
        [
            models.ClassFeedback(
                user_uuid=STUDENT_UUID,
                attendance_id=101,
                class_instance_id=today_instance.id,
                rating="positive",
            ),
            models.ClassFeedback(
                user_uuid=STUDENT_UUID,
                attendance_id=102,
                class_instance_id=old_instance.id,
                rating="negative",
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        f"/feedback/teacher/{STAFF_UUID}",
        params={"start_date": date.today().isoformat(), "rating": "positive", "class_id": 1},
        headers=headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["rating"] == "positive"
    assert data[0]["class_instance_id"] == today_instance.id
    assert "user_uuid" not in data[0]
    assert "user" not in data[0]


def _seed_feedback_data(db_session):
    ci = models.ClassInstance(class_id=1, class_date="2024-06-01", teacher_uuid=STAFF_UUID)
    db_session.add(ci)
    db_session.flush()
    fb1 = models.ClassFeedback(
        user_uuid=STUDENT_UUID,
        attendance_id=1,
        class_instance_id=ci.id,
        rating="positive",
        comment="Great class!",
    )
    fb2 = models.ClassFeedback(
        user_uuid=STUDENT_UUID,
        attendance_id=1,
        class_instance_id=ci.id,
        rating="negative",
        comment="Too hard",
    )
    db_session.add(fb1)
    db_session.add(fb2)
    db_session.commit()
    return ci


def test_get_admin_feedback_list(client, db_session):
    from datetime import date

    ci = models.ClassInstance(class_id=1, class_date=date(2024, 6, 1), teacher_uuid=STAFF_UUID)
    db_session.add(ci)
    db_session.flush()
    fb = models.ClassFeedback(
        user_uuid=STUDENT_UUID,
        attendance_id=1,
        class_instance_id=ci.id,
        rating="positive",
        comment="Nice",
    )
    db_session.add(fb)
    db_session.commit()

    response = client.get("/feedback/admin/list")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


def test_get_admin_stats(client, db_session):
    from datetime import date

    ci = models.ClassInstance(class_id=1, class_date=date(2024, 6, 1), teacher_uuid=STAFF_UUID)
    db_session.add(ci)
    db_session.flush()
    fb = models.ClassFeedback(
        user_uuid=STUDENT_UUID,
        attendance_id=1,
        class_instance_id=ci.id,
        rating="positive",
        comment="Nice",
    )
    db_session.add(fb)
    db_session.commit()

    response = client.get("/feedback/admin/comprehensive-stats")
    assert response.status_code == 200
    data = response.json()
    assert "totalFeedback" in data
    assert "positiveCount" in data
    assert data["positivePercent"] == 100.0


def test_get_admin_feedback_list_with_filters(client, db_session):
    from datetime import date

    ci = models.ClassInstance(class_id=1, class_date=date(2024, 6, 1), teacher_uuid=STAFF_UUID)
    db_session.add(ci)
    db_session.flush()
    fb1 = models.ClassFeedback(
        user_uuid=STUDENT_UUID,
        attendance_id=1,
        class_instance_id=ci.id,
        rating="positive",
        comment="Great!",
    )
    fb2 = models.ClassFeedback(
        user_uuid=STUDENT_UUID,
        attendance_id=2,
        class_instance_id=ci.id,
        rating="negative",
        comment="Bad",
    )
    db_session.add(fb1)
    db_session.add(fb2)
    db_session.commit()

    response = client.get("/feedback/admin/list", params={"rating": "positive"})
    assert response.status_code == 200
    data = response.json()
    assert all(f["rating"] == "positive" for f in data)
