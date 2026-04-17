from collections.abc import Iterator

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import hash_password
from app.models.domain import Membership, Role, Tenant, User
from app.services.bootstrap import ensure_vm_templates
from app.services.vm_packages import ensure_vm_packages


engine = create_engine(settings.database_url, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_db_and_seed() -> None:
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == settings.app_admin_email))
        if not admin:
            default_tenant = Tenant(name="Platform Admin", slug="platform-admin")
            admin = User(
                email=settings.app_admin_email,
                full_name="Platform Administrator",
                password_hash=hash_password(settings.app_admin_password),
                role=Role.ADMIN,
                auth_source="local",
                is_active=True,
            )
            db.add_all([default_tenant, admin])
            db.flush()
            db.add(
                Membership(
                    user_id=admin.id,
                    tenant_id=default_tenant.id,
                    is_default=True,
                )
            )
            db.commit()
        ensure_vm_templates(db)
        ensure_vm_packages(db)
