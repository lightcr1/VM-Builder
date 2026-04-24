from sqlalchemy import func, select
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import get_db
from app.models.domain import Membership, Tenant, User, VmInstance, VmStatus
from app.schemas.common import AuditEventRead
from app.schemas.vms import ProvisioningRequestRead, VmPackageCreate, VmPackageRead, VmPackageUpdate
from app.schemas.users import TenantCreate, TenantQuotaUpdate, TenantRead, TenantUsageRead, UserCreate, UserRead
from app.services.audit import write_audit_event
from app.services.auth import require_admin
from app.services.bootstrap import ensure_vm_templates
from app.services.provisioning import requeue_failed_request
from app.services.vm_packages import create_vm_package, delete_vm_package, list_vm_packages, package_to_read, update_vm_package


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


@router.get("/tenants/usage", response_model=list[TenantUsageRead])
def get_tenants_usage(db: Session = Depends(get_db)) -> list[TenantUsageRead]:
    tenants = db.scalars(select(Tenant).order_by(Tenant.name.asc())).all()
    result = []
    for tenant in tenants:
        row = db.execute(
            select(
                func.count(VmInstance.id),
                func.coalesce(func.sum(VmInstance.cpu_cores), 0),
                func.coalesce(func.sum(VmInstance.memory_mb), 0),
                func.coalesce(func.sum(VmInstance.disk_gb), 0),
            )
            .where(VmInstance.tenant_id == tenant.id)
            .where(VmInstance.status != VmStatus.ERROR)
        ).one()
        result.append(
            TenantUsageRead(
                id=tenant.id,
                name=tenant.name,
                slug=tenant.slug,
                used_vms=int(row[0]),
                used_cpu_cores=int(row[1]),
                used_memory_mb=int(row[2]),
                used_disk_gb=int(row[3]),
                max_vms=tenant.max_vms,
                max_cpu_cores=tenant.max_cpu_cores,
                max_memory_mb=tenant.max_memory_mb,
                max_disk_gb=tenant.max_disk_gb,
            )
        )
    return result


@router.post("/tenants", response_model=TenantRead, status_code=status.HTTP_201_CREATED)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), admin=Depends(require_admin)) -> Tenant:
    if db.scalar(select(Tenant).where(Tenant.slug == payload.slug)):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Tenant slug already exists")
    tenant = Tenant(
        name=payload.name,
        slug=payload.slug,
        max_vms=payload.max_vms,
        max_cpu_cores=payload.max_cpu_cores,
        max_memory_mb=payload.max_memory_mb,
        max_disk_gb=payload.max_disk_gb,
    )
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


@router.patch("/tenants/{tenant_id}/quotas", response_model=TenantRead)
def update_tenant_quotas(
    tenant_id: int,
    payload: TenantQuotaUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
) -> Tenant:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    tenant.max_vms = payload.max_vms
    tenant.max_cpu_cores = payload.max_cpu_cores
    tenant.max_memory_mb = payload.max_memory_mb
    tenant.max_disk_gb = payload.max_disk_gb
    db.commit()
    db.refresh(tenant)
    write_audit_event(
        db,
        action="admin.tenant_quotas_updated",
        entity_type="tenant",
        entity_id=str(tenant.id),
        actor_user_id=admin.id,
        details={
            "max_vms": tenant.max_vms,
            "max_cpu_cores": tenant.max_cpu_cores,
            "max_memory_mb": tenant.max_memory_mb,
            "max_disk_gb": tenant.max_disk_gb,
        },
    )
    return tenant


@router.get("/vm-packages", response_model=list[VmPackageRead])
def list_admin_vm_packages(db: Session = Depends(get_db)) -> list[VmPackageRead]:
    return [package_to_read(vm_package) for vm_package in list_vm_packages(db, include_inactive=True)]


@router.post("/vm-packages", response_model=VmPackageRead, status_code=status.HTTP_201_CREATED)
def create_admin_vm_package(
    payload: VmPackageCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
) -> VmPackageRead:
    vm_package = create_vm_package(db, payload)
    write_audit_event(
        db,
        action="admin.vm_package_created",
        entity_type="vm_package",
        entity_id=vm_package.public_id,
        actor_user_id=admin.id,
        details={"name": vm_package.name},
    )
    return package_to_read(vm_package)


@router.patch("/vm-packages/{package_id}", response_model=VmPackageRead)
def update_admin_vm_package(
    package_id: str,
    payload: VmPackageUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
) -> VmPackageRead:
    vm_package = update_vm_package(db, package_id, payload)
    write_audit_event(
        db,
        action="admin.vm_package_updated",
        entity_type="vm_package",
        entity_id=vm_package.public_id,
        actor_user_id=admin.id,
        details={
            "name": vm_package.name,
            "cpu_cores": vm_package.cpu_cores,
            "memory_mb": vm_package.memory_mb,
            "disk_gb": vm_package.disk_gb,
            "is_active": vm_package.is_active,
        },
    )
    return package_to_read(vm_package)


@router.delete("/vm-packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_admin_vm_package(
    package_id: str,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
) -> Response:
    delete_vm_package(db, package_id)
    write_audit_event(
        db,
        action="admin.vm_package_deleted",
        entity_type="vm_package",
        entity_id=package_id,
        actor_user_id=admin.id,
        details={"package_id": package_id},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
