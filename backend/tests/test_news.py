import pytest
from app.main import app
from app.routers.news import get_db as news_get_db
from app import models
from tests.conftest import STAFF_UUID


@pytest.fixture(autouse=True)
def _override_deps(db_session):
    app.dependency_overrides[news_get_db] = lambda: db_session
    yield


def _add_admin_role(db_session):
    admin_role = (
        db_session.query(models.Role).filter(models.Role.name == "Admin").first()
    )
    existing = (
        db_session.query(models.UserRole)
        .filter(
            models.UserRole.user_uuid == STAFF_UUID,
            models.UserRole.role_id == admin_role.id,
            models.UserRole.is_current == True,
        )
        .first()
    )
    if not existing:
        db_session.add(
            models.UserRole(
                user_uuid=STAFF_UUID, role_id=admin_role.id, is_current=True
            )
        )
        db_session.commit()


def test_list_news_empty(client):
    response = client.get("/news/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_list_unpublished_news(client, db_session):
    db_session.add(models.News(title="Hidden", content="Shh", is_published=False))
    db_session.commit()

    response = client.get("/news/", params={"published_only": False})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1


def test_create_news(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.post(
        "/news/",
        json={
            "title": "Test News",
            "content": "Hello world",
            "is_published": True,
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test News"
    assert data["is_published"] is True


def test_get_news_by_id(client, headers, db_session):
    _add_admin_role(db_session)
    create_resp = client.post(
        "/news/",
        json={"title": "Specific", "content": "Content", "is_published": True},
        headers=headers,
    )
    news_id = create_resp.json()["id"]
    response = client.get(f"/news/{news_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Specific"


def test_delete_news(client, headers, db_session):
    _add_admin_role(db_session)
    create_resp = client.post(
        "/news/",
        json={"title": "Delete me", "content": "Bye", "is_published": False},
        headers=headers,
    )
    news_id = create_resp.json()["id"]
    response = client.delete(f"/news/{news_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "News deleted successfully"
