"""initial schema

Revision ID: 20260402_0001
Revises: None
Create Date: 2026-04-02 14:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260402_0001"
down_revision = None
branch_labels = None
depends_on = None


role_enum = sa.Enum("ADMIN", "USER", name="role")
vm_status_enum = sa.Enum("REQUESTED", "PROVISIONING", "RUNNING", "STOPPED", "ERROR", name="vmstatus")
request_status_enum = sa.Enum("PENDING", "APPROVED", "COMPLETED", "FAILED", name="requeststatus")


def upgrade() -> None:
    bind = op.get_bind()
    role_enum.create(bind, checkfirst=True)
    vm_status_enum.create(bind, checkfirst=True)
    request_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("slug", sa.String(length=120), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("auth_source", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table(
        "vm_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("cpu_cores", sa.Integer(), nullable=False),
        sa.Column("memory_mb", sa.Integer(), nullable=False),
        sa.Column("disk_gb", sa.Integer(), nullable=False),
        sa.Column("image_ref", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=120), nullable=False),
        sa.Column("entity_id", sa.String(length=120), nullable=False),
        sa.Column("details", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"]),
    )
    op.create_index("ix_audit_events_actor_user_id", "audit_events", ["actor_user_id"], unique=False)
    op.create_table(
        "memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_memberships_user_id", "memberships", ["user_id"], unique=False)
    op.create_index("ix_memberships_tenant_id", "memberships", ["tenant_id"], unique=False)
    op.create_table(
        "vm_instances",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), nullable=False),
        sa.Column("template_id", sa.Integer(), nullable=False),
        sa.Column("status", vm_status_enum, nullable=False),
        sa.Column("provider_name", sa.String(length=50), nullable=False),
        sa.Column("provider_vm_id", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["vm_templates.id"]),
    )
    op.create_index("ix_vm_instances_owner_user_id", "vm_instances", ["owner_user_id"], unique=False)
    op.create_index("ix_vm_instances_tenant_id", "vm_instances", ["tenant_id"], unique=False)
    op.create_table(
        "provisioning_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vm_instance_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
        sa.Column("status", request_status_enum, nullable=False),
        sa.Column("provider_payload", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["vm_instance_id"], ["vm_instances.id"]),
    )
    op.create_index("ix_provisioning_requests_vm_instance_id", "provisioning_requests", ["vm_instance_id"], unique=False)
    op.create_index(
        "ix_provisioning_requests_requested_by_user_id",
        "provisioning_requests",
        ["requested_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_provisioning_requests_requested_by_user_id", table_name="provisioning_requests")
    op.drop_index("ix_provisioning_requests_vm_instance_id", table_name="provisioning_requests")
    op.drop_table("provisioning_requests")
    op.drop_index("ix_vm_instances_tenant_id", table_name="vm_instances")
    op.drop_index("ix_vm_instances_owner_user_id", table_name="vm_instances")
    op.drop_table("vm_instances")
    op.drop_index("ix_memberships_tenant_id", table_name="memberships")
    op.drop_index("ix_memberships_user_id", table_name="memberships")
    op.drop_table("memberships")
    op.drop_index("ix_audit_events_actor_user_id", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_table("vm_templates")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("tenants")

    bind = op.get_bind()
    request_status_enum.drop(bind, checkfirst=True)
    vm_status_enum.drop(bind, checkfirst=True)
    role_enum.drop(bind, checkfirst=True)
