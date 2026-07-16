import io
import uuid
import pytest
from app.main import app
from app.routers.users import get_db as users_get_db
from tests.conftest import STAFF_UUID, STUDENT_UUID
from app import models


@pytest.fixture(autouse=True)
def _override_users_db(db_session):
    app.dependency_overrides[users_get_db] = lambda: db_session
    yield


def _add_admin_role(db_session):
    admin_role = db_session.query(models.Role).filter(models.Role.name == "Admin").first()
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
        db_session.add(models.UserRole(user_uuid=STAFF_UUID, role_id=admin_role.id, is_current=True))
        db_session.commit()


def test_list_users(client, headers):
    response = client.get("/users/", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3


def test_list_users_unauthenticated(client):
    response = client.get("/users/")
    assert response.status_code == 401


def test_get_user_by_uuid(client, headers):
    response = client.get(f"/users/{STAFF_UUID}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["user_uuid"] == STAFF_UUID
    assert data["email"] == "staff@test.com"


def test_get_user_nonexistent(client, headers):
    response = client.get("/users/nonexistent-uuid", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_create_user(client, headers, db_session):
    _add_admin_role(db_session)
    unique_email = f"new-{uuid.uuid4().hex[:8]}@test.com"
    response = client.post(
        "/users/",
        json={
            "first_name": "New",
            "last_name": "Student",
            "email": unique_email,
        },
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == unique_email
    assert data["first_name"] == "New"


def test_create_user_missing_fields(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.post(
        "/users/",
        json={"first_name": "Incomplete"},
        headers=headers,
    )
    assert response.status_code == 422


def test_search_users_by_query(client, headers):
    response = client.get("/users/search", params={"query": "Student"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert any(u["first_name"] == "Student" for u in data)


def test_search_users_empty_query(client, headers):
    response = client.get("/users/search", params={"query": ""}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 3


def test_update_user_password_reset(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.put(
        f"/users/{STAFF_UUID}",
        json={"password": "NewPass123!"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["user_uuid"] == STAFF_UUID

    unlock = client.post(
        "/kiosk/unlock",
        json={"email": "staff@test.com", "password": "NewPass123!"},
    )
    assert unlock.status_code == 200


def test_update_user_not_found(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.put(
        "/users/nonexistent-uuid",
        json={"first_name": "Nobody"},
        headers=headers,
    )
    assert response.status_code == 404


def test_export_users_csv(client, headers):
    response = client.get("/users/export-csv", headers=headers)
    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")


def test_import_users_csv(client, headers):
    csv_content = "first_name,last_name,email,rank\nImported,User,imported@test.com,Blue\n"
    response = client.post(
        "/users/import-csv",
        headers=headers,
        files={"file": ("test.csv", csv_content, "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["created"] >= 1


def test_import_csv_invalid_file(client, headers):
    response = client.post(
        "/users/import-csv",
        headers=headers,
        files={"file": ("test.txt", b"not a csv", "text/plain")},
    )
    assert response.status_code == 400


def test_update_photo_position(client, headers, db_session):
    _add_admin_role(db_session)
    user = db_session.query(models.User).filter(models.User.user_uuid == STAFF_UUID).first()
    user.profile_image_url = "/uploads/photos/test.jpg"
    db_session.commit()

    response = client.put(
        f"/users/{STAFF_UUID}/photo-position",
        params={"offset_x": 0.5, "offset_y": -0.3},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["image_offset_x"] == 0.5
    assert data["image_offset_y"] == -0.3


def test_delete_photo(client, headers, db_session):
    _add_admin_role(db_session)
    user = db_session.query(models.User).filter(models.User.user_uuid == STAFF_UUID).first()
    user.profile_image_url = "/uploads/photos/test.jpg"
    db_session.commit()

    response = client.delete(f"/users/{STAFF_UUID}/photo", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Photo deleted"


def test_upload_photo_not_image(client, headers, db_session):
    _add_admin_role(db_session)
    response = client.post(
        f"/users/{STAFF_UUID}/photo",
        headers=headers,
        files={"file": ("test.txt", b"not an image", "text/plain")},
        data={"offset_x": 0.0, "offset_y": 0.0},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid file type. Allowed: .gif, .jpeg, .jpg, .png, .webp"


def test_upload_photo_success(client, headers, db_session):
    from PIL import Image

    _add_admin_role(db_session)
    buf = io.BytesIO()
    Image.new("RGB", (1, 1), color="red").save(buf, "JPEG")
    response = client.post(
        f"/users/{STUDENT_UUID}/photo",
        headers=headers,
        files={"file": ("photo.jpg", buf.getvalue(), "image/jpeg")},
        data={"offset_x": 0.2, "offset_y": -0.1},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["profile_image_url"] is not None
    assert data["image_offset_x"] == 0.2
    assert data["image_offset_y"] == -0.1
