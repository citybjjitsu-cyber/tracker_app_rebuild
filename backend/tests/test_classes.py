import pytest
from app import models
from app.routers.classes import get_db as classes_get_db


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[classes_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_classes(client, headers):
    resp = client.get("/classes/", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["class_name"] == "Test Class"


def test_weekly_schedule_normalizes_days_and_dates(client, db_session, headers):
    from app import models

    db_session.add(
        models.ClassSchedule(
            class_uuid="class-uuid-0000-0000-000000000002",
            class_name="Tuesday Class",
            day="tue",
            time="09:00",
            gym_id=1,
            is_current=True,
        )
    )
    db_session.commit()

    response = client.get("/classes/weekly?week_start=2026-10-07", headers=headers)

    assert response.status_code == 200
    data = response.json()
    assert data["week_start"] == "2026-10-05"
    assert data["week_end"] == "2026-10-11"
    assert [day["day"] for day in data["days"]] == [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    assert data["days"][0]["date"] == "2026-10-05"
    assert data["days"][0]["classes"][0]["scheduled_date"] == "2026-10-05"
    assert data["days"][1]["classes"][0]["class_name"] == "Tuesday Class"
    assert data["days"][1]["classes"][0]["scheduled_date"] == "2026-10-06"


def test_get_class_by_id(client, headers):
    resp = client.get("/classes/1", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["class_name"] == "Test Class"


def test_get_class_not_found(client, headers):
    resp = client.get("/classes/999", headers=headers)
    assert resp.status_code == 404


def test_class_access_rejects_unmembered_gym(client, headers, db_session):
    db_session.add(models.GymLocation(id=2, name="Second Gym"))
    db_session.commit()

    response = client.get("/classes/", headers={**headers, "X-Gym-Id": "2"})

    assert response.status_code == 403


def test_create_class(client, headers):
    resp = client.post(
        "/classes/",
        json={"class_name": "New Class", "day": "Tuesday", "time": "14:00"},
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["class_name"] == "New Class"
    assert data["day"] == "Tuesday"
    assert data["time"] == "14:00"


def test_create_class_missing_fields(client, headers):
    resp = client.post("/classes/", json={}, headers=headers)
    assert resp.status_code == 422
