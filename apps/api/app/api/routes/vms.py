from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.domain import ProvisioningRequest, User, VmInstance, VmTemplate
from app.schemas.vms import ProvisioningRequestRead, VmCreate, VmRead, VmTemplateRead
from app.services.auth import get_allowed_tenant_ids, get_current_user
from app.services.bootstrap import ensure_vm_templates
from app.services.provisioning import create_vm_request


router = APIRouter()


@router.get("/templates", response_model=list[VmTemplateRead])
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[VmTemplate]:
    ensure_vm_templates(db)
    return db.scalars(select(VmTemplate).order_by(VmTemplate.name.asc())).all()


@router.get("", response_model=list[VmRead])
def list_vms(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[VmInstance]:
    allowed_tenant_ids = get_allowed_tenant_ids(db, current_user)
    query = (
        select(VmInstance)
        .options(joinedload(VmInstance.owner), joinedload(VmInstance.tenant), joinedload(VmInstance.template))
        .order_by(VmInstance.created_at.desc())
    )
    if current_user.role.value != "admin":
        query = query.where(VmInstance.owner_user_id == current_user.id, VmInstance.tenant_id.in_(allowed_tenant_ids))
    return db.scalars(query).unique().all()


@router.post("", response_model=VmRead, status_code=status.HTTP_201_CREATED)
def create_vm(
    payload: VmCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VmInstance:
    template = db.scalar(select(VmTemplate).where(VmTemplate.id == payload.template_id))
    if not template:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    vm = create_vm_request(
        db,
        actor=current_user,
        name=payload.name,
        description=payload.description,
        template=template,
        tenant_id=payload.tenant_id,
        cpu_cores=payload.cpu_cores,
        memory_mb=payload.memory_mb,
        disk_gb=payload.disk_gb,
        start_on_create=payload.start_on_create,
        cloud_init_user=payload.cloud_init_user,
        ssh_public_key=payload.ssh_public_key,
        network_bridge=payload.network_bridge,
        vlan_tag=payload.vlan_tag,
        ip_config_mode=payload.ip_config_mode,
        ipv4_address=payload.ipv4_address,
        ipv4_gateway=payload.ipv4_gateway,
    )
    return db.scalar(
        select(VmInstance)
        .options(joinedload(VmInstance.owner), joinedload(VmInstance.tenant), joinedload(VmInstance.template))
        .where(VmInstance.id == vm.id)
    )


@router.get("/requests", response_model=list[ProvisioningRequestRead])
def list_requests(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[ProvisioningRequest]:
    query = select(ProvisioningRequest).order_by(ProvisioningRequest.created_at.desc())
    if current_user.role.value != "admin":
        query = query.where(ProvisioningRequest.requested_by_user_id == current_user.id)
    return db.scalars(query).all()
