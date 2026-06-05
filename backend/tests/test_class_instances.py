import pytest
from app.routers.class_instances import get_db as class_instances_get_db


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[class_instances_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_class_instances(client):
    resp = client.get("/class-instances/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_class_instances_by_date(client):
    client.post(
        "/class-instances/",
        json={"class_id": 1, "class_date": "2026-06-05"},
    )

    resp = client.get(
        "/class-instances/by-date/",
        params={"class_id": 1, "date": "2026-06-05"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["class_id"] == 1


def test_create_class_instance(client):
    resp = client.post(
        "/class-instances/",
        json={"class_id": 1, "class_date": "2026-06-05"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["class_id"] == 1
    assert "id" in data


def test_create_class_instance_invalid(client):
    resp = client.post("/class-instances/", json={"class_id": 1})
    assert resp.status_code == 422
