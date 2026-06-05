import pytest
from app.main import app
from app.routers.comments import get_db as comments_get_db
from tests.conftest import STAFF_UUID, STUDENT_UUID


@pytest.fixture(autouse=True)
def _override_deps(db_session):
    app.dependency_overrides[comments_get_db] = lambda: db_session
    yield


def test_create_comment(client):
    response = client.post(
        "/comments/",
        params={"author_uuid": STAFF_UUID},
        json={
            "content": "Great job!",
            "rating": "positive",
            "target_user_uuid": STUDENT_UUID,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["content"] == "Great job!"
    assert data["author"]["user_uuid"] == STAFF_UUID
    assert data["target_user"]["user_uuid"] == STUDENT_UUID


def test_get_comment_feed(client):
    client.post(
        "/comments/",
        params={"author_uuid": STAFF_UUID},
        json={
            "content": "Feed test",
            "rating": "positive",
            "target_user_uuid": STUDENT_UUID,
        },
    )
    response = client.get("/comments/feed", params={"user_uuid": STAFF_UUID})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["content"] == "Feed test"


def test_get_comment_by_uuid(client):
    create_resp = client.post(
        "/comments/",
        params={"author_uuid": STAFF_UUID},
        json={
            "content": "Get me",
            "rating": "positive",
            "target_user_uuid": STUDENT_UUID,
        },
    )
    comment_uuid = create_resp.json()["comment_uuid"]
    response = client.get(f"/comments/{comment_uuid}")
    assert response.status_code == 200
    assert response.json()["comment_uuid"] == comment_uuid


def test_update_comment(client):
    create_resp = client.post(
        "/comments/",
        params={"author_uuid": STAFF_UUID},
        json={
            "content": "Original",
            "rating": "positive",
            "target_user_uuid": STUDENT_UUID,
        },
    )
    comment_uuid = create_resp.json()["comment_uuid"]
    response = client.put(
        f"/comments/{comment_uuid}",
        params={"author_uuid": STAFF_UUID},
        json={"content": "Updated content"},
    )
    assert response.status_code == 200
    assert response.json()["content"] == "Updated content"


def test_delete_comment(client):
    create_resp = client.post(
        "/comments/",
        params={"author_uuid": STAFF_UUID},
        json={
            "content": "Delete me",
            "rating": "positive",
            "target_user_uuid": STUDENT_UUID,
        },
    )
    comment_uuid = create_resp.json()["comment_uuid"]
    response = client.delete(
        f"/comments/{comment_uuid}",
        params={"author_uuid": STAFF_UUID},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Comment deleted"


def test_delete_nonexistent_comment(client):
    response = client.delete(
        "/comments/nonexistent-uuid",
        params={"author_uuid": STAFF_UUID},
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Comment not found"
