import pytest
from app.routers.class_types import get_db as class_types_get_db


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[class_types_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_class_types(client):
    resp = client.get("/class-types/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_class_type(client):
    resp = client.post("/class-types/", json={"name": "Sparring"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Sparring"
    assert "id" in data
