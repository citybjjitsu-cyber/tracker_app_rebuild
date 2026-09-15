import types
from unittest.mock import patch

from app.cli import cmd_bootstrap, cmd_migrate_and_bootstrap
from app import models
from app.database import Base


def test_cmd_bootstrap_fresh(db_session):
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()

    args = types.SimpleNamespace(
        email="admin@test.com",
        password="AdminPass1!",
        first_name="Test",
        last_name="Admin",
    )

    with patch("app.database.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            cmd_bootstrap(args)

    roles = db_session.query(models.Role).all()
    role_names = {r.name for r in roles}
    assert role_names == {"Student", "Teacher", "Admin", "Tablet", "Lite-Admin", "Kiosk"}

    admin = db_session.query(models.User).filter(models.User.email == "admin@test.com").first()
    assert admin is not None
    assert admin.first_name == "Test"
    assert admin.last_name == "Admin"
    assert admin.password_hash is not None
    assert admin.pin_hash is not None

    admin_role = db_session.query(models.Role).filter(models.Role.name == "Admin").first()
    admin_ur = (
        db_session.query(models.UserRole)
        .filter(models.UserRole.user_uuid == admin.user_uuid, models.UserRole.role_id == admin_role.id)
        .first()
    )
    assert admin_ur is not None

    kiosk = db_session.query(models.User).filter(models.User.email == "kiosk@ckbtracker.com").first()
    assert kiosk is not None
    assert kiosk.first_name == "Kiosk"
    assert kiosk.last_name == "Service"

    kiosk_role = db_session.query(models.Role).filter(models.Role.name == "Kiosk").first()
    kiosk_ur = (
        db_session.query(models.UserRole)
        .filter(models.UserRole.user_uuid == kiosk.user_uuid, models.UserRole.role_id == kiosk_role.id)
        .first()
    )
    assert kiosk_ur is not None


def test_cmd_bootstrap_idempotent(db_session):
    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()

    args = types.SimpleNamespace(
        email="admin@test.com",
        password="AdminPass1!",
        first_name="Test",
        last_name="Admin",
    )

    with patch("app.database.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            cmd_bootstrap(args)

    roles_count_1 = db_session.query(models.Role).count()
    users_count_1 = db_session.query(models.User).count()
    user_roles_count_1 = db_session.query(models.UserRole).count()

    with patch("app.database.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            cmd_bootstrap(args)

    assert db_session.query(models.Role).count() == roles_count_1
    assert db_session.query(models.User).count() == users_count_1
    assert db_session.query(models.UserRole).count() == user_roles_count_1


def test_cmd_bootstrap_existing_admin(db_session):
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    for table in reversed(Base.metadata.sorted_tables):
        db_session.execute(table.delete())
    db_session.commit()

    for name, desc in [
        ("Student", "Member attending classes"),
        ("Teacher", "Instructor teaching classes"),
        ("Admin", "Administrator with full access"),
        ("Tablet", "Tablet-only user for check-in kiosk"),
        ("Lite-Admin", "Can send invites and reset passwords/PINs. Limited admin access."),
        ("Kiosk", "Kiosk service account for unlocking the check-in kiosk"),
    ]:
        db_session.add(models.Role(name=name, description=desc))
    db_session.commit()

    admin = models.User(
        user_uuid="existing-admin-uuid",
        first_name="Existing",
        last_name="Admin",
        email="admin@test.com",
        password_hash=pwd_context.hash("OldPass1!"),
        pin_hash=pwd_context.hash("0000"),
        is_current=True,
    )
    db_session.add(admin)
    db_session.commit()

    args = types.SimpleNamespace(
        email="admin@test.com",
        password="NewPass1!",
        first_name="New",
        last_name="Admin",
    )

    with patch("app.database.SessionLocal", return_value=db_session):
        with patch.object(db_session, "close"):
            cmd_bootstrap(args)

    admin_user = db_session.query(models.User).filter(models.User.email == "admin@test.com").first()
    assert admin_user.first_name == "Existing"
    assert admin_user.last_name == "Admin"

    kiosk = db_session.query(models.User).filter(models.User.email == "kiosk@ckbtracker.com").first()
    assert kiosk is not None


def test_cmd_migrate_and_bootstrap():
    args = types.SimpleNamespace(
        email="admin@test.com",
        password="AdminPass1!",
        first_name="Test",
        last_name="Admin",
    )

    with patch("app.cli.subprocess.run") as mock_run, patch("app.cli.cmd_bootstrap") as mock_bootstrap:
        mock_run.return_value = types.SimpleNamespace(returncode=0)
        cmd_migrate_and_bootstrap(args)

    mock_run.assert_called_once()
    mock_bootstrap.assert_called_once_with(args)


def test_cmd_migrate_and_bootstrap_migration_fails():
    args = types.SimpleNamespace(
        email="admin@test.com",
        password="AdminPass1!",
    )

    with (
        patch("app.cli.subprocess.run") as mock_run,
        patch("app.cli.cmd_bootstrap") as mock_bootstrap,
        patch("app.cli.sys.exit", side_effect=SystemExit(1)) as mock_exit,
    ):
        mock_run.return_value = types.SimpleNamespace(returncode=1)
        try:
            cmd_migrate_and_bootstrap(args)
        except SystemExit:
            pass

    mock_exit.assert_called_once_with(1)
    mock_bootstrap.assert_not_called()
