def test_verify_valid_pin(client, headers):
    response = client.post(
        "/kiosk/verify-user-pin", json={"pin": "1234"}, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["user"] is not None
    assert data["user"]["first_name"] == "Student"
    assert data["access_token"] is not None
    assert data["refresh_token"] is not None


def test_verify_invalid_pin(client, headers):
    response = client.post(
        "/kiosk/verify-user-pin", json={"pin": "9999"}, headers=headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert data.get("user") is None
    assert data.get("access_token") is None


def test_verify_user_pin_requires_auth(client):
    response = client.post("/kiosk/verify-user-pin", json={"pin": "1234"})
    assert response.status_code == 401


def test_pin_lockout_3_strikes(client, headers):
    for _ in range(3):
        client.post("/kiosk/verify-user-pin", json={"pin": "9999"}, headers=headers)

    response = client.post(
        "/kiosk/verify-user-pin", json={"pin": "9999"}, headers=headers
    )
    assert response.status_code == 429


def test_pin_lockout_429_has_retry_after(client, headers):
    for _ in range(3):
        client.post("/kiosk/verify-user-pin", json={"pin": "9999"}, headers=headers)

    response = client.post(
        "/kiosk/verify-user-pin", json={"pin": "9999"}, headers=headers
    )
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_pin_no_hash(client, headers):
    response = client.post(
        "/kiosk/verify-user-pin", json={"pin": "1234"}, headers=headers
    )
    data = response.json()
    assert data["user"] is not None
    assert data["user"].get("pin_hash") is None
    assert data["user"].get("password_hash") is None


def test_unlock_kiosk_valid(client):
    response = client.post(
        "/kiosk/unlock", json={"email": "staff@test.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["access_token"] is not None
    assert data["refresh_token"] is not None
    assert data["user"]["email"] == "staff@test.com"


def test_unlock_kiosk_invalid_password(client):
    response = client.post(
        "/kiosk/unlock", json={"email": "staff@test.com", "password": "wrongpass"}
    )
    assert response.status_code == 401


def test_unlock_kiosk_no_kiosk_role(client):
    response = client.post(
        "/kiosk/unlock", json={"email": "student@test.com", "password": "password123"}
    )
    assert response.status_code == 403
    data = response.json()
    assert "Kiosk service account" in data["detail"]


def test_lock_kiosk(client, headers):
    response = client.post("/kiosk/lock", headers=headers)
    assert response.status_code == 200
    assert response.json()["message"] == "Kiosk locked"


def test_lock_kiosk_requires_auth(client):
    response = client.post("/kiosk/lock")
    assert response.status_code == 401


def test_verify_pin_for_user_valid(client, headers):
    response = client.post(
        "/kiosk/verify-pin-for-user",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "pin": "1234"},
        headers=headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["access_token"] is not None


def test_verify_pin_for_user_invalid(client, headers):
    response = client.post(
        "/kiosk/verify-pin-for-user",
        json={"user_uuid": "student-uuid-0000-0000-000000000002", "pin": "9999"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["valid"] is False


def test_verify_pin_for_user_no_pin(client, headers):
    response = client.post(
        "/kiosk/verify-pin-for-user",
        json={"user_uuid": "pinless-uuid-0000-0000-000000000003", "pin": "1234"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["valid"] is False


def test_verify_pin_default(client):
    response = client.post("/kiosk/verify-pin", json={"pin": "1234"})
    assert response.status_code == 200
    assert response.json()["valid"] is False


def test_verify_pin_wrong(client):
    response = client.post("/kiosk/verify-pin", json={"pin": "0000"})
    assert response.status_code == 200
    assert response.json()["valid"] is False


def test_update_pin_wrong_current(client, headers):
    response = client.put(
        "/kiosk/update-pin",
        json={"current_pin": "wrong", "new_pin": "5678"},
        headers=headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid current PIN"


def test_setup_kiosk(client, headers):
    response = client.post(
        "/kiosk/setup",
        json={"pin": "4321"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Kiosk configured"
