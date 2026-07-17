"""CLI tool for CKB Tracker database management."""

import argparse
import logging
import subprocess
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


def cmd_bootstrap(args):
    """Create roles, admin user, and kiosk service account (idempotent)."""
    from app.database import SessionLocal
    from app.models import Role, User, UserRole
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    db = SessionLocal()
    try:
        # Roles
        roles_to_create = [
            ("Student", "Member attending classes"),
            ("Teacher", "Instructor teaching classes"),
            ("Admin", "Administrator with full access"),
            ("Tablet", "Tablet-only user for check-in kiosk"),
            ("Lite-Admin", "Can send invites and reset passwords/PINs. Limited admin access."),
            ("Kiosk", "Kiosk service account for unlocking the check-in kiosk"),
        ]
        created_roles = 0
        for name, desc in roles_to_create:
            existing = db.query(Role).filter(Role.name == name).first()
            if not existing:
                db.add(Role(name=name, description=desc))
                created_roles += 1
        if created_roles:
            db.commit()
            log.info(f"Created {created_roles} roles")
        else:
            log.info("All roles already exist")

        # Admin user
        admin_email = args.email
        admin_password = args.password
        existing_admin = db.query(User).filter(User.email == admin_email).first()
        if existing_admin:
            log.info(f"Admin user '{admin_email}' already exists")
        else:
            admin = User(
                first_name=args.first_name or "Admin",
                last_name=args.last_name or "User",
                email=admin_email,
                password_hash=pwd_context.hash(admin_password),
                pin_hash=pwd_context.hash("0000"),
                is_current=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

            admin_role = db.query(Role).filter(Role.name == "Admin").first()
            if admin_role:
                db.add(UserRole(user_uuid=admin.user_uuid, role_id=admin_role.id, is_current=True))
                db.commit()
            log.info(f"Created admin user '{admin_email}'")

        # Kiosk service account
        kiosk_email = "kiosk@ckbtracker.com"
        existing_kiosk = db.query(User).filter(User.email == kiosk_email).first()
        if existing_kiosk:
            log.info("Kiosk service account already exists")
        else:
            kiosk = User(
                first_name="Kiosk",
                last_name="Service",
                email=kiosk_email,
                password_hash=pwd_context.hash("kiosk-ckb-tracker-2026"),
                pin_hash=pwd_context.hash("1234"),
                is_current=True,
            )
            db.add(kiosk)
            db.commit()
            db.refresh(kiosk)

            kiosk_role = db.query(Role).filter(Role.name == "Kiosk").first()
            if kiosk_role:
                db.add(UserRole(user_uuid=kiosk.user_uuid, role_id=kiosk_role.id, is_current=True))
                db.commit()
            log.info("Created kiosk service account")

        log.info("Bootstrap complete")
    finally:
        db.close()


def cmd_migrate_and_bootstrap(args):
    """Run alembic upgrade head, then bootstrap."""
    log.info("Running database migrations...")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=".",
    )
    if result.returncode != 0:
        log.error("Migration failed")
        sys.exit(1)

    log.info("Running bootstrap...")
    cmd_bootstrap(args)


def main():
    parser = argparse.ArgumentParser(prog="ckb", description="CKB Tracker CLI")
    sub = parser.add_subparsers(dest="command")

    # bootstrap
    p_boot = sub.add_parser("bootstrap", help="Create roles, admin, and kiosk account")
    p_boot.add_argument("--email", required=True, help="Admin email address")
    p_boot.add_argument("--password", required=True, help="Admin password")
    p_boot.add_argument("--first-name", default=None, help="Admin first name (default: Admin)")
    p_boot.add_argument("--last-name", default=None, help="Admin last name (default: User)")
    p_boot.set_defaults(func=cmd_bootstrap)

    # migrate-and-bootstrap
    p_mig = sub.add_parser("migrate-and-bootstrap", help="Run migrations then bootstrap")
    p_mig.add_argument("--email", required=True, help="Admin email address")
    p_mig.add_argument("--password", required=True, help="Admin password")
    p_mig.add_argument("--first-name", default=None, help="Admin first name (default: Admin)")
    p_mig.add_argument("--last-name", default=None, help="Admin last name (default: User)")
    p_mig.set_defaults(func=cmd_migrate_and_bootstrap)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
