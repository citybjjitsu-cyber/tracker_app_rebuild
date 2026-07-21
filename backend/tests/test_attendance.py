from datetime import date, timedelta


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
    assert len(data["errors"]) == 1
    assert data["errors"][0]["class_id"] == 1


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


def test_bulk_check_in_with_explicit_date(client, headers):
    future_date = (date.today() + timedelta(days=7)).isoformat()
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
    future_date = (date.today() + timedelta(days=7)).isoformat()
    today_str = date.today().isoformat()

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
    future_date = (date.today() + timedelta(days=3)).isoformat()
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
    assert date.today().isoformat() in dates
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
    assert data["class_id"] == 1


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

    today_str = date.today().isoformat()
    response = client.get(f"/attendance/class/1?date={today_str}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["class_id"] == 1
