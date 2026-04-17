"""tenant quotas and vm resources

Revision ID: 20260416_0002
Revises: 20260402_0001
Create Date: 2026-04-16 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260416_0002"
down_revision = "20260402_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("max_vms", sa.Integer(), server_default="10", nullable=False))
    op.add_column("tenants", sa.Column("max_cpu_cores", sa.Integer(), server_default="16", nullable=False))
    op.add_column("tenants", sa.Column("max_memory_mb", sa.Integer(), server_default="32768", nullable=False))
    op.add_column("tenants", sa.Column("max_disk_gb", sa.Integer(), server_default="500", nullable=False))

    op.add_column("vm_instances", sa.Column("package_id", sa.String(length=80), server_default="custom", nullable=False))
    op.add_column("vm_instances", sa.Column("cpu_cores", sa.Integer(), server_default="2", nullable=False))
    op.add_column("vm_instances", sa.Column("memory_mb", sa.Integer(), server_default="2048", nullable=False))
    op.add_column("vm_instances", sa.Column("disk_gb", sa.Integer(), server_default="20", nullable=False))


def downgrade() -> None:
    op.drop_column("vm_instances", "disk_gb")
    op.drop_column("vm_instances", "memory_mb")
    op.drop_column("vm_instances", "cpu_cores")
    op.drop_column("vm_instances", "package_id")

    op.drop_column("tenants", "max_disk_gb")
    op.drop_column("tenants", "max_memory_mb")
    op.drop_column("tenants", "max_cpu_cores")
    op.drop_column("tenants", "max_vms")
