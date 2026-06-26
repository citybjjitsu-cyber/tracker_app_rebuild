import pytest
from app.main import app
from app.routers.themes import get_db as themes_get_db
from app import models
from tests.conftest import STAFF_UUID


@pytest.fixture(autouse=True)
def _override_deps(db_session):
    app.dependency_overrides[themes_get_db] = lambda: db_session
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
            models.UserRole.is_current,
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


def test_list_themes(client):
    response = client.get("/themes/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_get_active_theme_not_found(client):
    response = client.get("/themes/active")
    assert response.status_code == 404


def test_create_theme(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.post(
        "/themes/",
        json={
            "name": "Dark Mode",
            "config": '{"primary": "#000"}',
            "is_active": True,
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Dark Mode"
    assert data["is_active"] is True


def test_create_theme_forbidden_without_admin(client):
    response = client.post(
        "/themes/",
        json={
            "name": "Dark Mode",
            "config": '{"primary": "#000"}',
            "is_active": True,
        },
    )
    assert response.status_code == 401


def test_delete_theme(client, headers, db_session):
    _add_admin_role(db_session)
    theme = models.WebsiteTheme(name="Temp", config="{}", is_active=False)
    db_session.add(theme)
    db_session.commit()

    response = client.delete(f"/themes/{theme.id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Theme deleted successfully"


def test_get_theme_by_id(client, db_session):
    theme = models.WebsiteTheme(name="Test By Id", config="{}", is_active=False)
    db_session.add(theme)
    db_session.commit()

    response = client.get(f"/themes/{theme.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test By Id"


def test_get_theme_by_id_not_found(client):
    response = client.get("/themes/99999")
    assert response.status_code == 404


def test_update_theme(client, headers, db_session):
    _add_admin_role(db_session)
    theme = models.WebsiteTheme(
        name="Old Name", config='{"color": "red"}', is_active=False
    )
    db_session.add(theme)
    db_session.commit()

    response = client.put(
        f"/themes/{theme.id}",
        json={"name": "New Name", "config": '{"color": "blue"}', "is_active": True},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["is_active"] is True


def test_update_theme_not_found(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.put(
        "/themes/99999",
        json={"name": "Nope"},
        headers=headers,
    )
    assert response.status_code == 404


def test_apply_theme(client, headers, db_session):
    _add_admin_role(db_session)
    theme = models.WebsiteTheme(name="To Apply", config="{}", is_active=False)
    db_session.add(theme)
    db_session.commit()

    response = client.post(f"/themes/{theme.id}/apply", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_active"] is True


def test_create_theme_duplicate_name(client, headers, db_session):
    _add_admin_role(db_session)
    theme = models.WebsiteTheme(name="Unique Name", config="{}", is_active=False)
    db_session.add(theme)
    db_session.commit()

    response = client.post(
        "/themes/",
        json={"name": "Unique Name", "config": "{}", "is_active": False},
        headers=headers,
    )
    assert response.status_code == 400


def test_create_theme_without_active(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.post(
        "/themes/",
        json={
            "name": "Inactive Theme",
            "config": '{"primary": "#fff"}',
            "is_active": False,
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Inactive Theme"
    assert data["is_active"] is False
