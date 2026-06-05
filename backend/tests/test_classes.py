import pytest
from app.routers.classes import get_db as classes_get_db


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[classes_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_classes(client):
    resp = client.get("/classes/")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["class_name"] == "Test Class"


def test_get_class_by_id(client):
    resp = client.get("/classes/1")
    assert resp.status_code == 200
    assert resp.json()["class_name"] == "Test Class"


def test_get_class_not_found(client):
    resp = client.get("/classes/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Class not found"


def test_create_class(client):
    resp = client.post(
        "/classes/", json={"class_name": "New Class", "day": "Tuesday", "time": "14:00"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["class_name"] == "New Class"
    assert data["day"] == "Tuesday"
    assert data["time"] == "14:00"


def test_create_class_missing_fields(client):
    resp = client.post("/classes/", json={})
    assert resp.status_code == 422
