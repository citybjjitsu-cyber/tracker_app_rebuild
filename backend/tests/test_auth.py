from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from tests.conftest import STAFF_UUID, STUDENT_UUID, PINLESS_UUID, STAFF_PASSWORD
from app import models
from app.auth.jwt_utils import hash_token


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
    teacher_role = db_session.query(models.Role).filter(models.Role.name == "Teacher").first()
    db_session.add(models.UserRole(user_uuid=STAFF_UUID, role_id=teacher_role.id, is_current=True))
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
    csrf_token = login_resp.json()["csrf_token"]

    response = client.post("/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out successfully"


def test_logout_all(client):
    login_resp = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]

    response = client.post("/auth/logout-all", headers={"X-CSRF-Token": csrf_token})
    assert response.status_code == 200
    assert response.json()["message"] == "Logged out from all devices"


def test_refresh_token(client):
    login_resp = client.post(
        "/auth/login",
        json={"email": "staff@test.com", "password": STAFF_PASSWORD},
    )
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]

    response = client.post("/auth/refresh", headers={"X-CSRF-Token": csrf_token})
    assert response.status_code == 200
    data = response.json()
    assert "user" in data
    assert "csrf_token" in data


def test_send_invite(client, headers):
    with patch("app.routers.auth.send_invite_email", return_value=True):
        response = client.post(
            "/auth/send-invite",
            json={
                "email": "newuser@test.com",
                "first_name": "New",
                "last_name": "User",
            },
            headers=headers,
        )
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "expires_at" in data


def test_send_invite_requires_admin(client):
    login_resp = client.post(
        "/auth/login",
        json={"email": "student@test.com", "password": "password123"},
    )
    assert login_resp.status_code == 200
    csrf_token = login_resp.json()["csrf_token"]

    response = client.post(
        "/auth/send-invite",
        json={
            "email": "newuser@test.com",
            "first_name": "New",
            "last_name": "User",
        },
        headers={"X-CSRF-Token": csrf_token},
    )
    assert response.status_code == 403
    assert "Admin or Lite-Admin" in response.json()["detail"]


def test_validate_invite(client, db_session):
    raw_token = "test-validate-token-123"
    token_hash_val = hash_token(raw_token)

    invite = models.InviteToken(
        token_hash=token_hash_val,
        user_uuid=PINLESS_UUID,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7),
        sent_count=1,
    )
    db_session.add(invite)
    db_session.commit()

    response = client.get(f"/auth/invite?token={raw_token}")
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["email"] == "pinless@test.com"
    assert data["first_name"] == "Pinless"


def test_validate_invite_invalid_token(client):
    response = client.get("/auth/invite?token=nonexistent-token")
    assert response.status_code == 404
    assert "Invalid invite token" in response.json()["detail"]


def test_validate_invite_consumed(client, db_session):
    raw_token = "test-consumed-token-123"
    token_hash_val = hash_token(raw_token)

    invite = models.InviteToken(
        token_hash=token_hash_val,
        user_uuid=PINLESS_UUID,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7),
        consumed_at=datetime.now(timezone.utc).replace(tzinfo=None),
        sent_count=1,
    )
    db_session.add(invite)
    db_session.commit()

    response = client.get(f"/auth/invite?token={raw_token}")
    assert response.status_code == 400
    assert "already used" in response.json()["detail"]


def test_validate_invite_expired(client, db_session):
    raw_token = "test-expired-token-123"
    token_hash_val = hash_token(raw_token)

    invite = models.InviteToken(
        token_hash=token_hash_val,
        user_uuid=PINLESS_UUID,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1),
        sent_count=1,
    )
    db_session.add(invite)
    db_session.commit()

    response = client.get(f"/auth/invite?token={raw_token}")
    assert response.status_code == 400
    assert "expired" in response.json()["detail"]


def test_accept_invite(client, db_session):
    raw_token = "test-accept-token-456"
    token_hash_val = hash_token(raw_token)

    invite = models.InviteToken(
        token_hash=token_hash_val,
        user_uuid=PINLESS_UUID,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7),
        sent_count=1,
    )
    db_session.add(invite)
    db_session.commit()

    response = client.post(
        "/auth/accept-invite",
        json={
            "token": raw_token,
            "password": "NewPass1!",
            "pin": "5678",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Account set up successfully"
    assert "user" in data
    assert "roles" in data

    user = db_session.query(models.User).filter(models.User.user_uuid == PINLESS_UUID).first()
    assert user.password_hash is not None
    assert user.pin_hash is not None

    db_session.refresh(invite)
    assert invite.consumed_at is not None


def test_accept_invite_consumed(client, db_session):
    raw_token = "test-accept-consumed-456"
    token_hash_val = hash_token(raw_token)

    invite = models.InviteToken(
        token_hash=token_hash_val,
        user_uuid=PINLESS_UUID,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=7),
        consumed_at=datetime.now(timezone.utc).replace(tzinfo=None),
        sent_count=1,
    )
    db_session.add(invite)
    db_session.commit()

    response = client.post(
        "/auth/accept-invite",
        json={
            "token": raw_token,
            "password": "NewPass1!",
            "pin": "5678",
        },
    )
    assert response.status_code == 400
    assert "already used" in response.json()["detail"]


def test_accept_invite_expired(client, db_session):
    raw_token = "test-accept-expired-456"
    token_hash_val = hash_token(raw_token)

    invite = models.InviteToken(
        token_hash=token_hash_val,
        user_uuid=PINLESS_UUID,
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=1),
        sent_count=1,
    )
    db_session.add(invite)
    db_session.commit()

    response = client.post(
        "/auth/accept-invite",
        json={
            "token": raw_token,
            "password": "NewPass1!",
            "pin": "5678",
        },
    )
    assert response.status_code == 400
    assert "expired" in response.json()["detail"]


def test_forgot_password(client, db_session):
    with patch("app.routers.auth.send_password_reset_email"):
        response = client.post(
            "/auth/forgot-password",
            json={"email": "staff@test.com"},
        )
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["message"]


def test_forgot_password_nonexistent_email(client):
    response = client.post(
        "/auth/forgot-password",
        json={"email": "nonexistent@test.com"},
    )
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["message"]


def test_forgot_pin(client, db_session):
    with patch("app.routers.auth.send_pin_reset_email"):
        response = client.post(
            "/auth/forgot-pin",
            json={"email": "staff@test.com"},
        )
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["message"]


def test_forgot_pin_nonexistent_email(client):
    response = client.post(
        "/auth/forgot-pin",
        json={"email": "nonexistent@test.com"},
    )
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["message"]


def test_reset_password(client, db_session):
    raw_token = "test-reset-password-token"
    token_hash_val = hash_token(raw_token)

    reset = models.ResetToken(
        token_hash=token_hash_val,
        user_uuid=STAFF_UUID,
        purpose="password",
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1),
    )
    db_session.add(reset)
    db_session.commit()

    response = client.post(
        "/auth/reset-password",
        json={
            "token": raw_token,
            "password": "NewPassword1!",
        },
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Password reset successfully"

    user = db_session.query(models.User).filter(models.User.user_uuid == STAFF_UUID).first()
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    assert pwd_context.verify("NewPassword1!", user.password_hash)


def test_reset_password_invalid_token(client):
    response = client.post(
        "/auth/reset-password",
        json={
            "token": "invalid-token",
            "password": "NewPassword1!",
        },
    )
    assert response.status_code == 400
    assert "Invalid or expired reset token" in response.json()["detail"]


def test_reset_pin(client, db_session):
    raw_token = "test-reset-pin-token"
    token_hash_val = hash_token(raw_token)

    reset = models.ResetToken(
        token_hash=token_hash_val,
        user_uuid=STAFF_UUID,
        purpose="pin",
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1),
    )
    db_session.add(reset)
    db_session.commit()

    response = client.post(
        "/auth/reset-pin",
        json={
            "token": raw_token,
            "pin": "9999",
        },
    )
    assert response.status_code == 200
    assert response.json()["message"] == "PIN reset successfully"

    user = db_session.query(models.User).filter(models.User.user_uuid == STAFF_UUID).first()
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    assert pwd_context.verify("9999", user.pin_hash)


def test_reset_pin_invalid_token(client):
    response = client.post(
        "/auth/reset-pin",
        json={
            "token": "invalid-token",
            "pin": "9999",
        },
    )
    assert response.status_code == 400
    assert "Invalid or expired reset token" in response.json()["detail"]
