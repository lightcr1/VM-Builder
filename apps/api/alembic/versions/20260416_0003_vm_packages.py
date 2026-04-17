"""vm packages

Revision ID: 20260416_0003
Revises: 20260416_0002
Create Date: 2026-04-16 00:10:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260416_0003"
down_revision = "20260416_0002"
branch_labels = None
depends_on = None


vm_packages = sa.table(
    "vm_packages",
    sa.column("public_id", sa.String),
    sa.column("name", sa.String),
    sa.column("description", sa.Text),
    sa.column("cpu_cores", sa.Integer),
    sa.column("memory_mb", sa.Integer),
    sa.column("disk_gb", sa.Integer),
    sa.column("badge", sa.String),
    sa.column("sort_order", sa.Integer),
    sa.column("is_active", sa.Boolean),
)


def upgrade() -> None:
    op.create_table(
        "vm_packages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(length=80), nullable=False, unique=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("cpu_cores", sa.Integer(), nullable=False),
        sa.Column("memory_mb", sa.Integer(), nullable=False),
        sa.Column("disk_gb", sa.Integer(), nullable=False),
        sa.Column("badge", sa.String(length=80), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_vm_packages_public_id", "vm_packages", ["public_id"], unique=True)
    op.bulk_insert(
        vm_packages,
        [
            {
                "public_id": "cloud-s",
                "name": "Cloud S",
                "description": "Small services, test systems and lightweight web apps.",
                "cpu_cores": 2,
                "memory_mb": 1024,
                "disk_gb": 30,
                "badge": "Starter",
                "sort_order": 10,
                "is_active": True,
            },
            {
                "public_id": "cloud-m",
                "name": "Cloud M",
                "description": "Default choice for application servers and small databases.",
                "cpu_cores": 2,
                "memory_mb": 2048,
                "disk_gb": 50,
                "badge": "Popular",
                "sort_order": 20,
                "is_active": True,
            },
            {
                "public_id": "cloud-l",
                "name": "Cloud L",
                "description": "More memory and storage for heavier tenant workloads.",
                "cpu_cores": 4,
                "memory_mb": 4096,
                "disk_gb": 80,
                "badge": "Growth",
                "sort_order": 30,
                "is_active": True,
            },
            {
                "public_id": "cloud-xl",
                "name": "Cloud XL",
                "description": "Bigger application nodes, build workers and staging stacks.",
                "cpu_cores": 4,
                "memory_mb": 8192,
                "disk_gb": 120,
                "badge": "Performance",
                "sort_order": 40,
                "is_active": True,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_vm_packages_public_id", table_name="vm_packages")
    op.drop_table("vm_packages")
