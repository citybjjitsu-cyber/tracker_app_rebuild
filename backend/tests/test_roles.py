import pytest
from app.routers.roles import get_db as roles_get_db

STAFF_UUID = "staff-uuid-0000-0000-000000000001"
BAD_UUID = "nonexistent-uuid-0000-0000-000000000000"


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[roles_get_db] = override
    yield
    app.dependency_overrides.clear()


def test_list_roles(client, headers):
    resp = client.get("/roles/", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    names = [r["name"] for r in data]
    assert "Kiosk" in names
    assert "Student" in names
    assert "Teacher" in names
    assert "Admin" in names


def test_list_roles_unauthenticated(client):
    resp = client.get("/roles/")
    assert resp.status_code == 401


def test_get_user_roles(client, headers):
    resp = client.get(f"/roles/user/{STAFF_UUID}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["user_uuid"] == STAFF_UUID


def test_get_user_roles_nonexistent(client, headers):
    resp = client.get(f"/roles/user/{BAD_UUID}", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_update_user_roles(client, headers):
    resp = client.put(f"/roles/user/{STAFF_UUID}", json={"role_ids": [3, 4]}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Roles updated"

    verify = client.get(f"/roles/user/{STAFF_UUID}", headers=headers)
    role_ids = {r["role_id"] for r in verify.json()}
    assert 3 in role_ids
    assert 4 in role_ids


def test_get_users_by_role(client, headers):
    resp = client.get("/roles/users/by-role/Kiosk", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["user_uuid"] == STAFF_UUID
