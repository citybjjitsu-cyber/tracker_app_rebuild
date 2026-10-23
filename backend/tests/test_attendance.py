from datetime import timedelta

from app.timezone import local_today
from app import models


def test_bulk_check_in_success(client, headers):
    response = client.post(
        "/attendance/bulk-check-in",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "classes": [{"class_id": 1}]},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["created"]) == 1
    assert data["created"][0]["class_id"] == 1
    assert data["created"][0]["status"] == "pending"
    assert data["created"][0]["user_uuid"] == "student-uuid-0000-0000-000000000002"
    assert len(data["errors"]) == 0
    assert data["created"][0]["gym_id"] == 1
    assert data["created"][0]["class_instance_id"] is not None


def test_kiosk_status_blocks_pending_and_confirmed_checkins(client, headers):
    empty = client.post(
        "/attendance/kiosk-status",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "class_ids": [1],
        },
        headers=headers,
    )
    assert empty.status_code == 200
    assert empty.json() == []

    created = client.post(
        "/attendance/bulk-check-in",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "classes": [{"class_id": 1}],
        },
        headers=headers,
    )
    assert created.status_code == 200
    attendance_id = created.json()["created"][0]["id"]

    pending = client.post(
        "/attendance/kiosk-status",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "class_ids": [1],
        },
        headers=headers,
    )
    assert pending.json()[0]["status"] == "pending"
    assert pending.json()[0]["attendance_id"] == attendance_id

    confirmed = client.post(f"/attendance/{attendance_id}/confirm", headers=headers)
    assert confirmed.status_code == 200

    status = client.post(
        "/attendance/kiosk-status",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "class_ids": [1],
        },
        headers=headers,
    )
    assert status.status_code == 200
    assert status.json()[0]["status"] == "confirmed"


def test_bulk_check_in_unauthenticated(client):
    response = client.post(
        "/attendance/bulk-check-in",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "classes": [{"class_id": 1}]},
    )
    assert response.status_code == 401


def test_bulk_check_in_duplicates(client, headers):
    client.post(
        "/attendance/bulk-check-in",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "classes": [{"class_id": 1}]},
        headers=headers,
    )

    response = client.post(
        "/attendance/bulk-check-in",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "classes": [{"class_id": 1}]},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["created"]) == 0
    assert len(data["already_present"]) == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["class_id"] == 1
    assert data["errors"][0]["code"] == "already_checked_in"
    assert data["errors"][0]["retryable"] is False


def test_bulk_check_in_retry_is_idempotent(client, headers):
    payload = {
        "user_uuid": "student-uuid-0000-0000-000000000002",
        "classes": [{"class_id": 1}],
    }

    first = client.post("/attendance/bulk-check-in", json=payload, headers=headers)
    retry = client.post("/attendance/bulk-check-in", json=payload, headers=headers)

    assert first.status_code == 200
    assert retry.status_code == 200
    assert len(first.json()["created"]) == 1
    assert len(retry.json()["created"]) == 0
    assert len(retry.json()["already_present"]) == 1
    assert retry.json()["already_present"][0]["id"] == first.json()["created"][0]["id"]


def test_bulk_check_in_multiple_same_class(client, headers):
    response = client.post(
        "/attendance/bulk-check-in",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "classes": [{"class_id": 1}, {"class_id": 1}],
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["created"]) == 1
    assert len(data["errors"]) == 1


def test_attendance_identity_uses_dated_class_instance_and_gym(client, headers, db_session):
    db_session.add(models.GymLocation(id=2, name="Second Test Gym"))
    db_session.add(
        models.ClassSchedule(
            id=2,
            class_uuid="class-uuid-0000-0000-000000000002",
            class_name="Second Gym Class",
            day="Monday",
            time="11:00",
            gym_id=2,
            is_current=True,
        )
    )
    db_session.commit()

    response = client.post(
        "/attendance/bulk-check-in",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "classes": [{"class_id": 1}, {"class_id": 2}],
        },
        headers=headers,
    )

    assert response.status_code == 200
    created = response.json()["created"]
    assert len(created) == 2
    assert {(item["gym_id"], item["class_instance_id"]) for item in created} == {(1, 1), (2, 2)}


def test_bulk_check_in_with_explicit_date(client, headers):
    future_date = (local_today() + timedelta(days=7)).isoformat()
    response = client.post(
        "/attendance/bulk-check-in",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "classes": [{"class_id": 1, "check_in_date": future_date}],
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["created"]) == 1
    assert data["created"][0]["attendance_date"] == future_date
    assert len(data["errors"]) == 0


def test_bulk_check_in_future_date_no_duplicate_today(client, headers):
    today = local_today()
    future_date = (today + timedelta(days=7)).isoformat()
    today_str = today.isoformat()

    client.post(
        "/attendance/bulk-check-in",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "classes": [{"class_id": 1}],
        },
        headers=headers,
    )

    response = client.post(
        "/attendance/bulk-check-in",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "classes": [{"class_id": 1, "check_in_date": future_date}],
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["created"]) == 1
    assert data["created"][0]["attendance_date"] == future_date
    assert len(data["errors"]) == 0

    response = client.get(
        f"/attendance/class/1?date={today_str}",
        headers=headers,
    )
    assert response.status_code == 200
    assert len(response.json()) == 1

    response = client.get(
        f"/attendance/class/1?date={future_date}",
        headers=headers,
    )
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_bulk_check_in_mixed_dates(client, headers):
    today = local_today()
    future_date = (today + timedelta(days=3)).isoformat()
    response = client.post(
        "/attendance/bulk-check-in",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "classes": [
                {"class_id": 1},
                {"class_id": 1, "check_in_date": future_date},
            ],
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["created"]) == 2
    dates = {a["attendance_date"] for a in data["created"]}
    assert today.isoformat() in dates
    assert future_date in dates


def test_confirm_attendance(client, headers):
    create_resp = client.post(
        "/attendance/",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "class_id": 1,
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    attendance_id = create_resp.json()["id"]

    response = client.post(f"/attendance/{attendance_id}/confirm", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "confirmed"


def test_cancel_attendance(client, headers):
    create_resp = client.post(
        "/attendance/",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "class_id": 1,
        },
        headers=headers,
    )
    assert create_resp.status_code == 200
    attendance_id = create_resp.json()["id"]

    response = client.delete(f"/attendance/{attendance_id}/cancel", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Attendance cancelled"


def test_cancel_nonexistent_attendance(client, headers):
    response = client.delete("/attendance/99999/cancel", headers=headers)
    assert response.status_code == 404


def test_create_attendance_already_checked_in(client, headers):
    response = client.post(
        "/attendance/",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "class_id": 1},
        headers=headers,
    )
    assert response.status_code == 200

    response = client.post(
        "/attendance/",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "class_id": 1},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Already checked in for this class today"
    assert response.headers["X-Error-Code"] == "already_checked_in"
    assert response.headers["X-Retryable"] == "false"


def test_direct_attendance(client, headers):
    response = client.post(
        "/attendance/direct",
        json={
            "user_uuid": "student-uuid-0000-0000-000000000002",
            "class_id": 1,
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert data["user_uuid"] == "student-uuid-0000-0000-000000000002"
    assert data["class_instance_id"] is not None
    assert data["class_id"] == 1


def test_direct_attendance_rejects_duplicate(client, headers):
    payload = {
        "user_uuid": "student-uuid-0000-0000-000000000002",
        "class_id": 1,
    }
    first = client.post("/attendance/direct", json=payload, headers=headers)
    duplicate = client.post("/attendance/direct", json=payload, headers=headers)

    assert first.status_code == 200
    assert duplicate.status_code == 400
    assert duplicate.headers["X-Error-Code"] == "already_checked_in"
    assert duplicate.headers["X-Retryable"] == "false"


def test_bulk_confirm(client, headers):
    create_resp = client.post(
        "/attendance/bulk-check-in",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "classes": [{"class_id": 1}]},
        headers=headers,
    )
    assert create_resp.status_code == 200
    attendance_id = create_resp.json()["created"][0]["id"]

    response = client.post(
        "/attendance/bulk-confirm",
        json={"ids": [attendance_id]},
        headers=headers,
    )
    assert response.status_code == 200
    assert "Confirmed" in response.json()["message"]


def test_get_class_attendance_by_date(client, headers):
    client.post(
        "/attendance/",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "class_id": 1},
        headers=headers,
    )

    today_str = local_today().isoformat()
    response = client.get(f"/attendance/class/1?date={today_str}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["class_id"] == 1
