import pytest
import os
import tempfile

os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from passlib.context import CryptContext

from app.database import Base
from app.main import app
from app.routers.kiosk import get_db, clear_pin_lockout
from app.routers.attendance import get_db as att_get_db
from app.routers.auth import get_db as auth_get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

db_fd, db_path = tempfile.mkstemp(suffix=".db")
engine = create_engine(
    f"sqlite:///{db_path}",
    connect_args={"check_same_thread": False},
    poolclass=NullPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

STAFF_UUID = "staff-uuid-0000-0000-000000000001"
STUDENT_UUID = "student-uuid-0000-0000-000000000002"
PINLESS_UUID = "pinless-uuid-0000-0000-000000000003"

STAFF_PIN = "1111"
STUDENT_PIN = "1234"
WRONG_PIN = "9999"
STAFF_PASSWORD = "password123"

app.state.limiter.enabled = False


def seed_data(db):
    from app import models

    roles_data = [
        models.Role(id=1, name="Kiosk", description="Kiosk service account"),
        models.Role(id=2, name="Student", description="Student"),
        models.Role(id=3, name="Teacher", description="Teacher"),
        models.Role(id=4, name="Admin", description="Administrator"),
    ]
    for role in roles_data:
        db.add(role)

    users_data = [
        models.User(
            user_uuid=STAFF_UUID,
            first_name="Staff",
            last_name="User",
            email="staff@test.com",
            password_hash=pwd_context.hash(STAFF_PASSWORD),
            pin_hash=pwd_context.hash(STAFF_PIN),
            rank="Black",
            is_current=True,
        ),
        models.User(
            user_uuid=STUDENT_UUID,
            first_name="Student",
            last_name="User",
            email="student@test.com",
            password_hash=pwd_context.hash("password123"),
            pin_hash=pwd_context.hash(STUDENT_PIN),
            rank="White",
            is_current=True,
        ),
        models.User(
            user_uuid=PINLESS_UUID,
            first_name="Pinless",
            last_name="User",
            email="pinless@test.com",
            rank="Blue",
            is_current=True,
        ),
    ]
    for user in users_data:
        db.add(user)

    user_roles_data = [
        models.UserRole(user_uuid=STAFF_UUID, role_id=1, is_current=True),
        models.UserRole(user_uuid=STUDENT_UUID, role_id=2, is_current=True),
    ]
    for ur in user_roles_data:
        db.add(ur)

    classes_data = [
        models.ClassSchedule(
            id=1,
            class_uuid="class-uuid-0000-0000-000000000001",
            class_name="Test Class",
            day="Monday",
            time="10:00",
            is_current=True,
        ),
    ]
    for cls in classes_data:
        db.add(cls)

    db.commit()


@pytest.fixture(scope="session", autouse=True)
def setup_teardown():
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()
    Base.metadata.drop_all(bind=engine)
    try:
        os.close(db_fd)
        os.unlink(db_path)
    except PermissionError:
        pass


@pytest.fixture(scope="function", autouse=True)
def _reset_pin_lockout():
    clear_pin_lockout(STAFF_PIN)
    clear_pin_lockout(STUDENT_PIN)
    clear_pin_lockout(WRONG_PIN)
    clear_pin_lockout(f"user:{STUDENT_UUID}")


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        session.execute(table.delete())
    session.commit()
    seed_data(session)
    yield session
    session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[att_get_db] = override_get_db
    app.dependency_overrides[auth_get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def headers(client):
    response = client.post(
        "/kiosk/unlock", json={"email": "staff@test.com", "password": STAFF_PASSWORD}
    )
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
