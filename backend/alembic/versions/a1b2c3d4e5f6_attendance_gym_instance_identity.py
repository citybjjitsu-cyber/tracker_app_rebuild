"""Scope attendance uniqueness to gym, occurrence, student, and date.

Revision ID: a1b2c3d4e5f6
Revises: 9b2c3d4e5f6a
"""

from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "9b2c3d4e5f6a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    attendance_columns = {column["name"] for column in inspector.get_columns("attendance")}

    if "gym_id" not in attendance_columns:
        op.add_column("attendance", sa.Column("gym_id", sa.Integer(), nullable=True))

    connection.execute(
        sa.text(
            """
            UPDATE attendance
            SET gym_id = (
                SELECT c.gym_id
                FROM classes c
                WHERE c.id = attendance.class_id
            )
            WHERE gym_id IS NULL
            """
        )
    )

    missing = connection.execute(sa.text("SELECT COUNT(*) FROM attendance WHERE gym_id IS NULL")).scalar_one()
    if missing:
        raise RuntimeError("Cannot enforce attendance gym scope until all rows have a gym")

    duplicate_instances = connection.execute(
        sa.text(
            """
            SELECT class_id, class_date, COUNT(*)
            FROM class_instances
            GROUP BY class_id, class_date
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    if duplicate_instances:
        raise RuntimeError("Cannot enforce class-instance identity until duplicate instances are reconciled")

    duplicates = connection.execute(
        sa.text(
            """
            SELECT gym_id, class_instance_id, user_uuid, attendance_date, COUNT(*)
            FROM attendance
            GROUP BY gym_id, class_instance_id, user_uuid, attendance_date
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    if duplicates:
        raise RuntimeError("Cannot add attendance uniqueness constraint until duplicate rows are reconciled")

    for index_name in ("uq_attendance_user_class_date", "ix_attendance_user_class_date"):
        if any(index["name"] == index_name for index in inspector.get_indexes("attendance")):
            op.drop_index(index_name, table_name="attendance")

    if not any(index["name"] == "uq_class_instances_class_date" for index in inspector.get_indexes("class_instances")):
        op.create_index(
            "uq_class_instances_class_date",
            "class_instances",
            ["class_id", "class_date"],
            unique=True,
        )

    op.create_index(
        "uq_attendance_gym_instance_user_date",
        "attendance",
        ["gym_id", "class_instance_id", "user_uuid", "attendance_date"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_attendance_gym_instance_user_date", table_name="attendance")
    if op.get_bind().dialect.name != "sqlite":
        op.alter_column("attendance", "gym_id", nullable=True)
    op.drop_column("attendance", "gym_id")
