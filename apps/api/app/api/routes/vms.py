from sqlalchemy import select
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.models.domain import ProvisioningRequest, User, VmInstance, VmTemplate
from app.schemas.vms import ProvisioningRequestRead, VmAction, VmCreate, VmPackageRead, VmRead, VmTemplateRead
from app.services.auth import get_allowed_tenant_ids, get_current_user
from app.services.bootstrap import ensure_vm_templates
from app.services.provisioning import create_vm_request
from app.services.vm_lifecycle import delete_vm, get_vm_for_actor, start_vm, stop_vm
from app.services.vm_packages import get_vm_package, list_vm_packages, package_to_read


router = APIRouter()


@router.get("/templates", response_model=list[VmTemplateRead])
def list_templates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[VmTemplate]:
    ensure_vm_templates(db)
    return db.scalars(select(VmTemplate).order_by(VmTemplate.name.asc())).all()


@router.get("/packages", response_model=list[VmPackageRead])
def list_packages(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[VmPackageRead]:
    return [package_to_read(vm_package) for vm_package in list_vm_packages(db)]


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

    vm_package = get_vm_package(db, payload.package_id)
    vm = create_vm_request(
        db,
        actor=current_user,
        name=payload.name,
        description=payload.description,
        template=template,
        tenant_id=payload.tenant_id,
        package_id=vm_package.public_id,
        cpu_cores=vm_package.cpu_cores,
        memory_mb=vm_package.memory_mb,
        disk_gb=vm_package.disk_gb,
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


@router.get("/{vm_id}", response_model=VmRead)
def get_vm(
    vm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VmInstance:
    return get_vm_for_actor(db, vm_id=vm_id, actor=current_user)


@router.get("/{vm_id}/requests", response_model=list[ProvisioningRequestRead])
def list_vm_requests(
    vm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProvisioningRequest]:
    vm = get_vm_for_actor(db, vm_id=vm_id, actor=current_user)
    query = (
        select(ProvisioningRequest)
        .where(ProvisioningRequest.vm_instance_id == vm.id)
        .order_by(ProvisioningRequest.created_at.desc())
    )
    return db.scalars(query).all()


@router.post("/{vm_id}/actions/{action}", response_model=VmRead)
def run_vm_action(
    vm_id: int,
    action: VmAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> VmInstance:
    vm = get_vm_for_actor(db, vm_id=vm_id, actor=current_user)
    if action == VmAction.START:
        return start_vm(db, vm=vm, actor=current_user)
    if action == VmAction.STOP:
        return stop_vm(db, vm=vm, actor=current_user)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported action")


@router.delete("/{vm_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vm(
    vm_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    vm = get_vm_for_actor(db, vm_id=vm_id, actor=current_user)
    delete_vm(db, vm=vm, actor=current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
