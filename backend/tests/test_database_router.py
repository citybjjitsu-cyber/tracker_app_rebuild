import pytest
from app.main import app
from app.routers.database import get_db as database_get_db
from app import models
from tests.conftest import STAFF_UUID


@pytest.fixture(autouse=True)
def _override_deps(db_session):
    app.dependency_overrides[database_get_db] = lambda: db_session
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


def test_export_seed(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.get("/database/export-seed", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "users" in data
    assert "roles" in data
    assert "exported_at" in data


def test_reset_without_auth(client):
    response = client.post("/database/reset")
    assert response.status_code == 401


def test_create_backup_without_auth(client):
    response = client.get("/database/create-backup")
    assert response.status_code == 401


def test_get_stats(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.get("/database/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "total_classes" in data
    assert "total_attendance" in data
    assert "size" in data
    assert "kiosk_pin_set" in data


def test_restore_database_invalid_file(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.post(
        "/database/restore",
        headers=headers,
        files={"file": ("test.txt", b"not json", "text/plain")},
    )
    assert response.status_code == 400
    assert "JSON" in response.json()["detail"]
