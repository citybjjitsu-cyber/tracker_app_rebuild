import pytest
from app.routers.terms import get_db as terms_get_db


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[terms_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_terms(client):
    resp = client.get("/terms/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_term(client):
    resp = client.post(
        "/terms/",
        json={
            "term_name": "Spring 2026",
            "start_date": "2026-01-01",
            "end_date": "2026-06-30",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["term_name"] == "Spring 2026"
    assert "id" in data


def test_list_targets(client):
    resp = client.get("/terms/term-targets/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_target(client):
    term_resp = client.post(
        "/terms/",
        json={
            "term_name": "Spring 2026",
            "start_date": "2026-01-01",
            "end_date": "2026-06-30",
        },
    )
    term_id = term_resp.json()["id"]

    resp = client.post(
        "/terms/term-targets/",
        json={"term_id": term_id, "rank": "White", "target": 10.0},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["term_id"] == term_id
    assert data["rank"] == "White"
    assert data["target"] == 10.0
