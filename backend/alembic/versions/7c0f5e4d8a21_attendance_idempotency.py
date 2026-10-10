"""Enforce one attendance record per user, class, and date.

Revision ID: 7c0f5e4d8a21
Revises: 36484c036213
"""

from alembic import op
import sqlalchemy as sa


revision = "7c0f5e4d8a21"
down_revision = "36484c036213"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    duplicates = connection.execute(
        sa.text(
            """
            SELECT user_uuid, class_id, attendance_date, COUNT(*) AS row_count
            FROM attendance
            GROUP BY user_uuid, class_id, attendance_date
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    if duplicates:
        raise RuntimeError("Cannot add attendance uniqueness constraint until duplicate rows are reconciled")

    op.create_index(
        "uq_attendance_user_class_date",
        "attendance",
        ["user_uuid", "class_id", "attendance_date"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_attendance_user_class_date", table_name="attendance")
