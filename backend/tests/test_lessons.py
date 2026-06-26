import pytest
from app.routers.lessons import get_db as lessons_get_db
from app import models


@pytest.fixture(autouse=True)
def override_deps(client, db_session):
    from app.main import app

    def override():
        yield db_session

    app.dependency_overrides[lessons_get_db] = override
    yield
    app.dependency_overrides.clear()


def _create_curriculum(db_session):
    curriculum = models.Curriculum(class_id=1, name="Test Curriculum")
    db_session.add(curriculum)
    db_session.commit()
    db_session.refresh(curriculum)
    return curriculum


def test_list_lessons(client, db_session):
    resp = client.get("/lessons/")
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_lesson(client, db_session):
    curriculum = _create_curriculum(db_session)
    resp = client.post(
        "/lessons/",
        json={
            "curriculum_id": curriculum.id,
            "title": "First Lesson",
            "description": "Intro",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "First Lesson"
    assert data["curriculum_id"] == curriculum.id


def test_update_lesson(client, db_session):
    curriculum = _create_curriculum(db_session)
    lesson = client.post(
        "/lessons/",
        json={"curriculum_id": curriculum.id, "title": "Original Title"},
    ).json()

    resp = client.put(
        f"/lessons/{lesson['id']}",
        json={"curriculum_id": curriculum.id, "title": "Updated Title"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"


def test_delete_lesson(client, db_session):
    curriculum = _create_curriculum(db_session)
    lesson = client.post(
        "/lessons/",
        json={"curriculum_id": curriculum.id, "title": "To Delete"},
    ).json()

    resp = client.delete(f"/lessons/{lesson['id']}")
    assert resp.status_code == 200
    assert resp.json()["message"] == "Lesson deleted"


def test_delete_lesson_not_found(client):
    resp = client.delete("/lessons/999")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Lesson not found"
