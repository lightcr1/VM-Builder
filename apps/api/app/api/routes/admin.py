from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import get_db
from app.models.domain import Membership, Tenant, User
from app.schemas.common import AuditEventRead
from app.schemas.vms import ProvisioningRequestRead
from app.schemas.users import TenantCreate, TenantRead, UserCreate, UserRead
from app.services.audit import write_audit_event
from app.services.auth import require_admin
from app.services.bootstrap import ensure_vm_templates
from app.services.provisioning import requeue_failed_request


router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[UserRead])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), admin=Depends(require_admin)) -> User:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    tenant = None
    if payload.tenant_id is not None:
        tenant = db.scalar(select(Tenant).where(Tenant.id == payload.tenant_id))
        if not tenant:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    elif payload.tenant_name:
        tenant = db.scalar(select(Tenant).where(Tenant.name == payload.tenant_name))
        if not tenant:
            tenant = Tenant(name=payload.tenant_name, slug=payload.tenant_name.lower().replace(" ", "-"))
            db.add(tenant)
            db.flush()
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Tenant assignment required")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        role=payload.role,
        auth_source="local",
        is_active=True,
    )
    db.add(user)
    db.flush()
    db.add(Membership(user_id=user.id, tenant_id=tenant.id, is_default=True))
    db.commit()
    db.refresh(user)

    write_audit_event(
        db,
        action="admin.user_created",
        entity_type="user",
        entity_id=str(user.id),
        actor_user_id=admin.id,
        details={"tenant_id": tenant.id, "email": user.email},
    )
    return user


@router.get("/tenants", response_model=list[TenantRead])
def list_tenants(db: Session = Depends(get_db)) -> list[Tenant]:
    return db.scalars(select(Tenant).order_by(Tenant.name.asc())).all()


@router.post("/tenants", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), admin=Depends(require_admin)) -> Tenant:
    if db.scalar(select(Tenant).where(Tenant.slug == payload.slug)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant slug already exists")
    tenant = Tenant(name=payload.name, slug=payload.slug)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    write_audit_event(
        db,
        action="admin.tenant_created",
        entity_type="tenant",
        entity_id=str(tenant.id),
        actor_user_id=admin.id,
        details={"slug": tenant.slug},
    )
    return tenant


@router.get("/audit-events", response_model=list[AuditEventRead])
def list_audit_events(db: Session = Depends(get_db)) -> list:
    from app.models.domain import AuditEvent

    return db.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(50)).all()


@router.post("/provisioning-requests/{request_id}/requeue", response_model=ProvisioningRequestRead)
def requeue_provisioning_request(
    request_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    return requeue_failed_request(db, request_id=request_id, actor=admin)
