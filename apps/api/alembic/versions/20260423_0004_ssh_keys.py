"""ssh keys

Revision ID: 20260423_0004
Revises: 20260416_0003
Create Date: 2026-04-23 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260423_0004"
down_revision = "20260416_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ssh_keys",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("public_key", sa.Text(), nullable=False),
        sa.Column("fingerprint", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_ssh_keys_user_id", "ssh_keys", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_ssh_keys_user_id", table_name="ssh_keys")
    op.drop_table("ssh_keys")
