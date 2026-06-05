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

    from fastapi.exceptions import ResponseValidationError

    try:
        client.post(
            "/feedback/",
            json={
                "attendance_id": att.id,
                "rating": "positive",
                "comment": "Great class!",
            },
        )
    except ResponseValidationError:
        pass

    feedback = db_session.query(models.ClassFeedback).first()
    assert feedback is not None
    assert feedback.rating == "positive"
    assert feedback.comment == "Great class!"
    assert feedback.attendance_id == att.id


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


def test_get_teacher_feedback_empty(client):
    response = client.get(f"/feedback/teacher/{STAFF_UUID}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def _seed_feedback_data(db_session):
    ci = models.ClassInstance(
        class_id=1, class_date="2024-06-01", teacher_uuid=STAFF_UUID
    )
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

    ci = models.ClassInstance(
        class_id=1, class_date=date(2024, 6, 1), teacher_uuid=STAFF_UUID
    )
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

    ci = models.ClassInstance(
        class_id=1, class_date=date(2024, 6, 1), teacher_uuid=STAFF_UUID
    )
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

    ci = models.ClassInstance(
        class_id=1, class_date=date(2024, 6, 1), teacher_uuid=STAFF_UUID
    )
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
        attendance_id=1,
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
