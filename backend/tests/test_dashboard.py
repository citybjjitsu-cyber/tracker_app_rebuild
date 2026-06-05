import pytest
from app.main import app
from app.routers.dashboard import get_db as dashboard_get_db
from tests.conftest import STAFF_UUID


@pytest.fixture(autouse=True)
def _override_deps(db_session):
    app.dependency_overrides[dashboard_get_db] = lambda: db_session
    yield


def test_get_dashboard_stats(client):
    response = client.get(f"/dashboard/stats/{STAFF_UUID}")
    assert response.status_code == 200
    data = response.json()
    assert "totalClasses" in data
    assert "totalPoints" in data
    assert "classesThisMonth" in data
    assert data["totalClasses"] == 0
    assert data["totalPoints"] == 0


def test_get_attendance_trend(client):
    response = client.get(
        f"/dashboard/attendance-trend/{STAFF_UUID}", params={"days": 90}
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
