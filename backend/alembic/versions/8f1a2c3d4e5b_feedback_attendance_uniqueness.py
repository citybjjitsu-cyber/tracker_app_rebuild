"""Ensure an attendance record receives at most one feedback response.

Revision ID: 8f1a2c3d4e5b
Revises: 7c0f5e4d8a21
"""

from alembic import op
import sqlalchemy as sa


revision = "8f1a2c3d4e5b"
down_revision = "7c0f5e4d8a21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    duplicates = connection.execute(
        sa.text(
            """
            SELECT attendance_id, COUNT(*) AS row_count
            FROM class_feedback
            WHERE attendance_id IS NOT NULL
            GROUP BY attendance_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    if duplicates:
        raise RuntimeError("Cannot add feedback uniqueness constraint until duplicate rows are reconciled")

    op.create_index(
        "uq_class_feedback_attendance",
        "class_feedback",
        ["attendance_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_class_feedback_attendance", table_name="class_feedback")
