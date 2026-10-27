"""Add gym-scoped recurring teacher rosters.

Revision ID: c4d5e6f7a8b9
Revises: b3c4d5e6f7a8
"""

from alembic import op
import sqlalchemy as sa


revision = "c4d5e6f7a8b9"
down_revision = "b3c4d5e6f7a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "class_teacher_rosters",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("gym_id", sa.Integer(), nullable=False),
        sa.Column("class_id", sa.Integer(), nullable=False),
        sa.Column("teacher_uuid", sa.String(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("assignment_role", sa.String(), nullable=False, server_default="primary"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["gym_id"], ["gym_locations.id"]),
        sa.ForeignKeyConstraint(["class_id"], ["classes.id"]),
        sa.ForeignKeyConstraint(["teacher_uuid"], ["users.user_uuid"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_uuid"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "gym_id",
            "class_id",
            "teacher_uuid",
            "start_date",
            name="uq_class_teacher_roster_assignment",
        ),
    )
    op.create_index("ix_class_teacher_rosters_id", "class_teacher_rosters", ["id"], unique=False)
    op.create_index("ix_class_teacher_rosters_gym_id", "class_teacher_rosters", ["gym_id"], unique=False)
    op.create_index("ix_class_teacher_rosters_class_id", "class_teacher_rosters", ["class_id"], unique=False)
    op.create_index("ix_class_teacher_rosters_teacher_uuid", "class_teacher_rosters", ["teacher_uuid"], unique=False)
    op.create_index("ix_class_teacher_rosters_is_current", "class_teacher_rosters", ["is_current"], unique=False)


def downgrade() -> None:
    op.drop_table("class_teacher_rosters")
