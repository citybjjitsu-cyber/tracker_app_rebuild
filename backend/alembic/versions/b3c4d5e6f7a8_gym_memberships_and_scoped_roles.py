"""Add gym memberships and gym-scoped role assignments.

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
"""

from alembic import op
import sqlalchemy as sa


revision = "b3c4d5e6f7a8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


ACTIVE_MEMBERSHIP_STATUSES = "status IN ('pending', 'invited', 'active', 'suspended')"


def upgrade() -> None:
    op.create_table(
        "gym_memberships",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_uuid", sa.String(), nullable=False),
        sa.Column("gym_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_by", sa.String(), nullable=True),
        sa.Column("status_reason", sa.Text(), nullable=True),
        sa.Column("status_changed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_uuid"], ["users.user_uuid"]),
        sa.ForeignKeyConstraint(["gym_id"], ["gym_locations.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.user_uuid"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_gym_memberships_id", "gym_memberships", ["id"], unique=False)
    op.create_index("ix_gym_memberships_user_uuid", "gym_memberships", ["user_uuid"], unique=False)
    op.create_index("ix_gym_memberships_gym_id", "gym_memberships", ["gym_id"], unique=False)
    op.create_index("ix_gym_memberships_status", "gym_memberships", ["status"], unique=False)
    op.create_index(
        "uq_gym_memberships_active_user_gym",
        "gym_memberships",
        ["user_uuid", "gym_id"],
        unique=True,
        postgresql_where=sa.text(ACTIVE_MEMBERSHIP_STATUSES),
        sqlite_where=sa.text(ACTIVE_MEMBERSHIP_STATUSES),
    )

    op.create_table(
        "gym_role_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("membership_id", sa.Integer(), nullable=False),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("effective_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("assigned_by", sa.String(), nullable=True),
        sa.Column("revoked_by", sa.String(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["membership_id"], ["gym_memberships.id"]),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.user_uuid"]),
        sa.ForeignKeyConstraint(["revoked_by"], ["users.user_uuid"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_gym_role_assignments_id", "gym_role_assignments", ["id"], unique=False)
    op.create_index("ix_gym_role_assignments_membership_id", "gym_role_assignments", ["membership_id"], unique=False)
    op.create_index("ix_gym_role_assignments_role_id", "gym_role_assignments", ["role_id"], unique=False)
    op.create_index("ix_gym_role_assignments_status", "gym_role_assignments", ["status"], unique=False)
    op.create_index(
        "uq_gym_role_assignments_active",
        "gym_role_assignments",
        ["membership_id", "role_id"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
        sqlite_where=sa.text("status = 'active'"),
    )

    connection = op.get_bind()
    gym_id = connection.execute(sa.text("SELECT id FROM gym_locations ORDER BY id LIMIT 1")).scalar_one_or_none()
    if gym_id is None:
        user_count = connection.execute(sa.text("SELECT COUNT(*) FROM users")).scalar_one()
        if user_count:
            raise RuntimeError("Cannot backfill gym memberships without a current gym")
        return

    connection.execute(
        sa.text(
            """
            INSERT INTO gym_memberships
                (user_uuid, gym_id, status, is_primary, effective_date,
                 status_changed_at, created_at, updated_at)
            SELECT
                u.user_uuid,
                :gym_id,
                'active',
                TRUE,
                CURRENT_DATE,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1
                FROM gym_memberships gm
                WHERE gm.user_uuid = u.user_uuid
                  AND gm.gym_id = :gym_id
            )
            """
        ),
        {"gym_id": gym_id},
    )

    connection.execute(
        sa.text(
            """
            INSERT INTO gym_role_assignments
                (membership_id, role_id, status, effective_date, created_at, updated_at)
            SELECT gm.id, ur.role_id, 'active', CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM user_roles ur
            JOIN gym_memberships gm ON gm.user_uuid = ur.user_uuid
            WHERE ur.is_current = TRUE
              AND gm.gym_id = :gym_id
              AND gm.status = 'active'
              AND NOT EXISTS (
                  SELECT 1
                  FROM gym_role_assignments gra
                  WHERE gra.membership_id = gm.id
                    AND gra.role_id = ur.role_id
                    AND gra.status = 'active'
              )
            """
        ),
        {"gym_id": gym_id},
    )


def downgrade() -> None:
    op.drop_index("uq_gym_role_assignments_active", table_name="gym_role_assignments")
    op.drop_index("ix_gym_role_assignments_status", table_name="gym_role_assignments")
    op.drop_index("ix_gym_role_assignments_role_id", table_name="gym_role_assignments")
    op.drop_index("ix_gym_role_assignments_membership_id", table_name="gym_role_assignments")
    op.drop_index("ix_gym_role_assignments_id", table_name="gym_role_assignments")
    op.drop_table("gym_role_assignments")
    op.drop_index("uq_gym_memberships_active_user_gym", table_name="gym_memberships")
    op.drop_index("ix_gym_memberships_status", table_name="gym_memberships")
    op.drop_index("ix_gym_memberships_gym_id", table_name="gym_memberships")
    op.drop_index("ix_gym_memberships_user_uuid", table_name="gym_memberships")
    op.drop_index("ix_gym_memberships_id", table_name="gym_memberships")
    op.drop_table("gym_memberships")
