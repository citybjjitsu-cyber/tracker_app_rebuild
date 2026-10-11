"""Create and attach dated class instances for existing attendance rows.

Revision ID: 9b2c3d4e5f6a
Revises: 8f1a2c3d4e5b
"""

from alembic import op
import sqlalchemy as sa


revision = "9b2c3d4e5f6a"
down_revision = "8f1a2c3d4e5b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            """
            INSERT INTO class_instances
                (class_id, class_date, teacher_uuid, created_at, updated_at)
            SELECT DISTINCT
                a.class_id,
                a.attendance_date,
                a.teacher_uuid,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM attendance a
            JOIN classes c ON c.id = a.class_id
            LEFT JOIN class_instances ci
                ON ci.class_id = a.class_id
                AND ci.class_date = a.attendance_date
            WHERE a.class_instance_id IS NULL
              AND ci.id IS NULL
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE attendance
            SET class_instance_id = (
                SELECT ci.id
                FROM class_instances ci
                WHERE ci.class_id = attendance.class_id
                  AND ci.class_date = attendance.attendance_date
                LIMIT 1
            )
            WHERE attendance.class_instance_id IS NULL
            """
        )
    )
    connection.execute(
        sa.text(
            """
            UPDATE class_feedback
            SET class_instance_id = (
                SELECT a.class_instance_id
                FROM attendance a
                WHERE a.id = class_feedback.attendance_id
            )
            WHERE class_feedback.class_instance_id IS NULL
            """
        )
    )


def downgrade() -> None:
    # Existing attendance and feedback records must not be detached on downgrade.
    pass
