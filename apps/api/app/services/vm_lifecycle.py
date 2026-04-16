import json

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.domain import Membership, ProvisioningRequest, Role, User, VmInstance, VmStatus
from app.providers.compute.factory import get_compute_provider
from app.services.audit import write_audit_event


def get_vm_for_actor(db: Session, *, vm_id: int, actor: User) -> VmInstance:
    query = (
        select(VmInstance)
        .options(joinedload(VmInstance.owner), joinedload(VmInstance.tenant), joinedload(VmInstance.template))
        .where(VmInstance.id == vm_id)
    )
    vm = db.scalar(query)
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VM not found")

    if actor.role == Role.ADMIN:
        return vm

    allowed_tenant_ids = db.scalars(select(Membership.tenant_id).where(Membership.user_id == actor.id)).all()
    if vm.owner_user_id != actor.id or vm.tenant_id not in allowed_tenant_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VM not found")
    return vm


def start_vm(db: Session, *, vm: VmInstance, actor: User) -> VmInstance:
    if vm.status == VmStatus.RUNNING:
        return vm
    if not vm.provider_vm_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="VM has no provider ID yet")

    provider = get_compute_provider()
    try:
        result = provider.start_vm(vm.provider_vm_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Provider start failed: {exc}") from exc

    vm.status = VmStatus.RUNNING
    _append_lifecycle_payload(db, vm.id, {"last_action": "start", "last_task_ref": result.task_ref, "provider_status": result.status})
    db.commit()
    db.refresh(vm)
    write_audit_event(
        db,
        action="vm.started",
        entity_type="vm_instance",
        entity_id=str(vm.id),
        actor_user_id=actor.id,
        details={"provider_vm_id": vm.provider_vm_id, "task_ref": result.task_ref},
    )
    return vm


def stop_vm(db: Session, *, vm: VmInstance, actor: User) -> VmInstance:
    if vm.status == VmStatus.STOPPED:
        return vm
    if not vm.provider_vm_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="VM has no provider ID yet")

    provider = get_compute_provider()
    try:
        result = provider.stop_vm(vm.provider_vm_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Provider stop failed: {exc}") from exc

    vm.status = VmStatus.STOPPED
    _append_lifecycle_payload(db, vm.id, {"last_action": "stop", "last_task_ref": result.task_ref, "provider_status": result.status})
    db.commit()
    db.refresh(vm)
    write_audit_event(
        db,
        action="vm.stopped",
        entity_type="vm_instance",
        entity_id=str(vm.id),
        actor_user_id=actor.id,
        details={"provider_vm_id": vm.provider_vm_id, "task_ref": result.task_ref},
    )
    return vm


def delete_vm(db: Session, *, vm: VmInstance, actor: User) -> None:
    task_ref: str | None = None
    if vm.provider_vm_id:
        provider = get_compute_provider()
        try:
            result = provider.delete_vm(vm.provider_vm_id)
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Provider delete failed: {exc}") from exc
        task_ref = result.task_ref

    requests = db.scalars(select(ProvisioningRequest).where(ProvisioningRequest.vm_instance_id == vm.id)).all()
    for request in requests:
        db.delete(request)
    db.delete(vm)
    db.commit()
    write_audit_event(
        db,
        action="vm.deleted",
        entity_type="vm_instance",
        entity_id=str(vm.id),
        actor_user_id=actor.id,
        details={"provider_vm_id": vm.provider_vm_id, "task_ref": task_ref},
    )


def _append_lifecycle_payload(db: Session, vm_id: int, updates: dict[str, str | None]) -> None:
    request = db.scalar(
        select(ProvisioningRequest)
        .where(ProvisioningRequest.vm_instance_id == vm_id)
        .order_by(ProvisioningRequest.created_at.desc())
    )
    if not request:
        return

    payload = json.loads(request.provider_payload)
    payload.update({key: value for key, value in updates.items() if value is not None})
    request.provider_payload = json.dumps(payload)
