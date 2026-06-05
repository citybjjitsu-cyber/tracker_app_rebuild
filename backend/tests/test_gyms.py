import pytest
from app.routers.gyms import get_db as gyms_get_db


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[gyms_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_gyms(client):
    resp = client.get("/gym-locations/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_gym(client):
    resp = client.post(
        "/gym-locations/", json={"name": "Main Gym", "address": "123 Main St"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Main Gym"
    assert data["address"] == "123 Main St"
    assert "id" in data
