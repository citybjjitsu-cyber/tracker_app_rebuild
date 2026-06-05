from tests.conftest import STAFF_UUID, STAFF_PASSWORD
from app import models


def test_login_valid_staff(client):
    response = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "roles" in data
    assert "csrf_token" in data
    assert data["user"]["email"] == "staff@test.com"


def test_login_invalid_password(client):
    response = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_nonexistent_email(client):
    response = client.post(
        "/auth/login",
        json={"email": "nobody@test.com", "password": "password123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_teacher_login_with_teacher_credentials(client, db_session):
    teacher_role = (
        db_session.query(models.Role).filter(models.Role.name == "Teacher").first()
    )
    db_session.add(
        models.UserRole(user_uuid=STAFF_UUID, role_id=teacher_role.id, is_current=True)
    )
    db_session.commit()

    response = client.post(
        "/auth/teacher-login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "csrf_token" in data


def test_teacher_login_with_student_credentials(client):
    response = client.post(
        "/auth/teacher-login",
        json={"email": "student@test.com", "password": "password123"},
    )
    assert response.status_code == 403
    assert "Teacher role required" in response.json()["detail"]


def test_teacher_login_invalid_password(client):
    response = client.post(
        "/auth/teacher-login",
        json={"email": "staff@test.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_me_authenticated(client, headers):
    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "roles" in data


def test_me_unauthenticated(client):
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"


def test_csrf_token(client):
    response = client.get("/auth/csrf-token")
    assert response.status_code == 200
    assert "csrf_token" in response.json()


def test_logout_authenticated(client, headers):
    response = client.post("/auth/logout", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_logout_clears_cookies(client):
    login_resp = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert login_resp.status_code == 200

    response = client.post("/auth/logout")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_logout_all(client):
    login_resp = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert login_resp.status_code == 200

    response = client.post("/auth/logout-all")
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out from all devices"


def test_refresh_token(client):
    login_resp = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert login_resp.status_code == 200

    response = client.post("/auth/refresh")
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "csrf_token" in data
