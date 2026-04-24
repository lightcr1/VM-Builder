from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, inspect, text

from app.core.config import settings


EXPECTED_TABLES = {
    "audit_events",
    "memberships",
    "provisioning_requests",
    "tenants",
    "users",
    "vm_instances",
    "vm_templates",
}
BASELINE_REVISION = "20260402_0001"


def run_migrations() -> None:
    config = Config(str(Path(__file__).resolve().parents[2] / "alembic.ini"))
    _stamp_existing_schema_if_needed(config)
    command.upgrade(config, "head")


def _stamp_existing_schema_if_needed(config: Config) -> None:
    engine = create_engine(settings.database_url, future=True)
    with engine.begin() as connection:
        inspector = inspect(connection)
        tables = set(inspector.get_table_names())
        if "alembic_version" in tables:
            version = connection.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).scalar_one_or_none()
            if version:
                return
        if EXPECTED_TABLES.issubset(tables):
            connection.execute(text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY)"))
            connection.execute(text("DELETE FROM alembic_version"))
            connection.execute(text("INSERT INTO alembic_version (version_num) VALUES (:version)"), {"version": BASELINE_REVISION})
