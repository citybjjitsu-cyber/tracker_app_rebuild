from datetime import date, timedelta

import pytest
from app import models
from app.main import app
from app.routers.dashboard import get_db as dashboard_get_db
from tests.conftest import STAFF_UUID, STUDENT_UUID, STAFF_PASSWORD


@pytest.fixture(autouse=True)
def _override_deps(db_session):
    app.dependency_overrides[dashboard_get_db] = lambda: db_session
    yield


def _login_admin_cookies(client):
    resp = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert resp.status_code == 200


def test_get_dashboard_stats(client):
    response = client.get(f"/dashboard/stats/{STAFF_UUID}")
    assert response.status_code == 200
    data = response.json()
    assert "totalClasses" in data
    assert "totalPoints" in data
    assert "classesThisMonth" in data
    assert data["totalClasses"] == 0
    assert data["totalPoints"] == 0


def test_get_attendance_trend(client):
    response = client.get(f"/dashboard/attendance-trend/{STAFF_UUID}", params={"days": 90})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_attendance_overview_requires_admin(client):
    # No authentication at all -> should be 401 (not logged in)
    response = client.get("/dashboard/attendance-overview")
    assert response.status_code in (401, 403)


def test_attendance_overview_empty_range(client):
    _login_admin_cookies(client)
    today = date.today().isoformat()
    response = client.get(
        "/dashboard/attendance-overview",
        params={"start_date": today, "end_date": today},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["range"]["start"] == today
    assert data["range"]["end"] == today
    assert data["totals"]["total_check_ins"] == 0
    assert data["totals"]["distinct_students"] == 0
    assert data["totals"]["distinct_classes"] == 0
    assert data["series"] == [{"date": today, "count": 0}]
    assert data["by_class"] == []


def test_attendance_overview_with_data_and_class_filter(client, db_session):
    _login_admin_cookies(client)

    today = date.today()
    yesterday = today - timedelta(days=1)

    # Two check-ins today from same student in class 1
    db_session.add_all(
        [
            models.Attendance(
                user_uuid=STUDENT_UUID,
                class_id=1,
                attendance_date=today,
                status="confirmed",
            ),
            models.Attendance(
                user_uuid=STAFF_UUID,
                class_id=1,
                attendance_date=today,
                status="confirmed",
            ),
            models.Attendance(
                user_uuid=STUDENT_UUID,
                class_id=1,
                attendance_date=yesterday,
                status="confirmed",
            ),
            # A pending record should be excluded from the confirmed-only overview
            models.Attendance(
                user_uuid=STUDENT_UUID,
                class_id=1,
                attendance_date=today,
                status="pending",
            ),
        ]
    )
    db_session.commit()

    response = client.get(
        "/dashboard/attendance-overview",
        params={
            "start_date": yesterday.isoformat(),
            "end_date": today.isoformat(),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["totals"]["total_check_ins"] == 3
    assert data["totals"]["distinct_students"] == 2
    assert data["totals"]["distinct_classes"] == 1
    # Continuous series over 2 days
    series_dates = [s["date"] for s in data["series"]]
    assert series_dates == [yesterday.isoformat(), today.isoformat()]
    counts_by_date = {s["date"]: s["count"] for s in data["series"]}
    assert counts_by_date[today.isoformat()] == 2
    assert counts_by_date[yesterday.isoformat()] == 1
    assert data["by_class"][0]["class_id"] == 1
    assert data["by_class"][0]["count"] == 3

    # Filter by an unrelated class id -> no results
    response2 = client.get(
        "/dashboard/attendance-overview",
        params={
            "start_date": yesterday.isoformat(),
            "end_date": today.isoformat(),
            "class_ids": "9999",
        },
    )
    assert response2.status_code == 200
    assert response2.json()["totals"]["total_check_ins"] == 0


def test_attendance_overview_swapped_dates_are_normalized(client):
    _login_admin_cookies(client)
    today = date.today()
    earlier = today - timedelta(days=5)
    response = client.get(
        "/dashboard/attendance-overview",
        params={"start_date": today.isoformat(), "end_date": earlier.isoformat()},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["range"]["start"] == earlier.isoformat()
    assert data["range"]["end"] == today.isoformat()
