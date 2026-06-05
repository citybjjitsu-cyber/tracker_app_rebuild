import pytest
from app.routers.curricula import get_db as curricula_get_db


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[curricula_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_curricula(client):
    resp = client.get("/curricula/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_curriculum(client):
    resp = client.post(
        "/curricula/",
        json={"class_id": 1, "name": "White Belt Curriculum"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["class_id"] == 1
    assert data["name"] == "White Belt Curriculum"
    assert "id" in data
