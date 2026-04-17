import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from rq import Retry

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.domain import Membership, ProvisioningRequest, RequestStatus, Role, Tenant, User, VmInstance, VmStatus, VmTemplate
from app.providers.compute.base import ComputeVmRequest
from app.providers.compute.factory import get_compute_provider
from app.services.audit import write_audit_event
from app.services.queue import get_queue


def create_vm_request(
    db: Session,
    *,
    actor: User,
    name: str,
    description: str,
    template: VmTemplate,
    tenant_id: int,
    package_id: str = "custom",
    cpu_cores: int | None = None,
    memory_mb: int | None = None,
    disk_gb: int | None = None,
    start_on_create: bool = False,
    cloud_init_user: str | None = None,
    ssh_public_key: str | None = None,
    network_bridge: str | None = None,
    vlan_tag: int | None = None,
    ip_config_mode: str = "dhcp",
    ipv4_address: str | None = None,
    ipv4_gateway: str | None = None,
) -> VmInstance:
    actor_membership_ids = db.scalars(select(Membership.tenant_id).where(Membership.user_id == actor.id)).all()
    if actor.role != Role.ADMIN and tenant_id not in actor_membership_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant not allowed")

    requested_cpu_cores = cpu_cores or template.cpu_cores
    requested_memory_mb = memory_mb or template.memory_mb
    requested_disk_gb = disk_gb or template.disk_gb
    _ensure_tenant_quota(
        db,
        tenant_id=tenant_id,
        requested_cpu_cores=requested_cpu_cores,
        requested_memory_mb=requested_memory_mb,
        requested_disk_gb=requested_disk_gb,
    )

    vm = VmInstance(
        name=name,
        description=description,
        owner_user_id=actor.id,
        tenant_id=tenant_id,
        template_id=template.id,
        package_id=package_id,
        cpu_cores=requested_cpu_cores,
        memory_mb=requested_memory_mb,
        disk_gb=requested_disk_gb,
        status=VmStatus.REQUESTED,
        provider_name="proxmox" if _is_proxmox_enabled() else "mock-proxmox",
    )
    db.add(vm)
    db.flush()

    request = ProvisioningRequest(
        vm_instance_id=vm.id,
        requested_by_user_id=actor.id,
        status=RequestStatus.PENDING,
        provider_payload=json.dumps(
            _provider_payload(
                template,
                requested_cpu_cores=requested_cpu_cores,
                requested_memory_mb=requested_memory_mb,
                requested_disk_gb=requested_disk_gb,
                start_on_create=start_on_create,
                cloud_init_user=cloud_init_user,
                ssh_public_key=ssh_public_key,
                network_bridge=network_bridge,
                vlan_tag=vlan_tag,
                ip_config_mode=ip_config_mode,
                ipv4_address=ipv4_address,
                ipv4_gateway=ipv4_gateway,
            )
        ),
    )
    db.add(request)
    db.flush()

    try:
        _dispatch_provisioning_job(request.id)
    except Exception as exc:
        vm.status = VmStatus.ERROR
        request.status = RequestStatus.FAILED
        request.provider_payload = json.dumps(
            {
                **_provider_payload(
                    template,
                    requested_cpu_cores=requested_cpu_cores,
                    requested_memory_mb=requested_memory_mb,
                    requested_disk_gb=requested_disk_gb,
                    start_on_create=start_on_create,
                    cloud_init_user=cloud_init_user,
                    ssh_public_key=ssh_public_key,
                    network_bridge=network_bridge,
                    vlan_tag=vlan_tag,
                    ip_config_mode=ip_config_mode,
                    ipv4_address=ipv4_address,
                    ipv4_gateway=ipv4_gateway,
                ),
                "error": str(exc),
            }
        )
        db.commit()
        write_audit_event(
            db,
            action="vm.request_failed",
            entity_type="vm_instance",
            entity_id=str(vm.id),
            actor_user_id=actor.id,
            details={"name": vm.name, "tenant_id": tenant_id, "error": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Provisioning queue unavailable") from exc

    db.commit()
    db.refresh(vm)

    write_audit_event(
        db,
        action="vm.requested",
        entity_type="vm_instance",
        entity_id=str(vm.id),
        actor_user_id=actor.id,
        details={
            "name": vm.name,
            "tenant_id": tenant_id,
            "request_id": request.id,
            "status": vm.status.value,
        },
    )
    return vm


def process_provisioning_request(request_id: int) -> None:
    with SessionLocal() as db:
        request = db.scalar(select(ProvisioningRequest).where(ProvisioningRequest.id == request_id))
        if not request:
            return

        vm = db.scalar(select(VmInstance).where(VmInstance.id == request.vm_instance_id))
        actor = db.scalar(select(User).where(User.id == request.requested_by_user_id))
        if not vm or not actor:
            return

        template = db.scalar(select(VmTemplate).where(VmTemplate.id == vm.template_id))
        if not template:
            vm.status = VmStatus.ERROR
            request.status = RequestStatus.FAILED
            db.commit()
            return

        payload = json.loads(request.provider_payload)
        payload["attempt_count"] = int(payload.get("attempt_count", 0)) + 1
        payload["last_attempt_at"] = datetime.now(timezone.utc).isoformat()
        request.provider_payload = json.dumps(payload)
        request.status = RequestStatus.APPROVED
        vm.status = VmStatus.PROVISIONING
        db.commit()

        provider = get_compute_provider()
        try:
            compute_result = provider.create_vm(
                ComputeVmRequest(
                    vmid=vm.id,
                    name=vm.name,
                    template_name=template.name,
                    cpu_cores=int(payload["cpu_cores"]),
                    memory_mb=int(payload["memory_mb"]),
                    disk_gb=int(payload["disk_gb"]),
                    tenant_slug=str(vm.tenant_id),
                    description=vm.description,
                    start_on_create=bool(payload.get("start_on_create", False)),
                    cloud_init_user=_optional_str(payload.get("cloud_init_user")),
                    ssh_public_key=_optional_str(payload.get("ssh_public_key")),
                    network_bridge=_optional_str(payload.get("network_bridge")),
                    vlan_tag=_optional_int(payload.get("vlan_tag")),
                    ip_config_mode=str(payload.get("ip_config_mode", "dhcp")),
                    ipv4_address=_optional_str(payload.get("ipv4_address")),
                    ipv4_gateway=_optional_str(payload.get("ipv4_gateway")),
                )
            )
        except Exception as exc:
            vm.status = VmStatus.ERROR
            request.status = RequestStatus.FAILED
            payload["error"] = str(exc)
            payload["last_failed_at"] = datetime.now(timezone.utc).isoformat()
            request.provider_payload = json.dumps(payload)
            db.commit()
            write_audit_event(
                db,
                action="vm.request_failed",
                entity_type="vm_instance",
                entity_id=str(vm.id),
                actor_user_id=actor.id,
                details={"name": vm.name, "tenant_id": vm.tenant_id, "error": str(exc)},
            )
            return

        vm.provider_vm_id = compute_result.provider_vm_id
        request.status = (
            RequestStatus.COMPLETED if compute_result.status in {VmStatus.STOPPED.value, VmStatus.RUNNING.value} else RequestStatus.APPROVED
        )
        if compute_result.status in VmStatus._value2member_map_:
            vm.status = VmStatus(compute_result.status)
        payload["task_ref"] = compute_result.task_ref
        payload["provider_vm_id"] = compute_result.provider_vm_id
        payload["provider_status"] = compute_result.status
        if compute_result.metadata:
            payload.update(compute_result.metadata)
        payload.pop("error", None)
        request.provider_payload = json.dumps(payload)
        db.commit()
        write_audit_event(
            db,
            action="vm.provisioned",
            entity_type="vm_instance",
            entity_id=str(vm.id),
            actor_user_id=actor.id,
            details={"provider_vm_id": compute_result.provider_vm_id, "status": compute_result.status},
        )


def _provider_payload(
    template: VmTemplate,
    *,
    requested_cpu_cores: int,
    requested_memory_mb: int,
    requested_disk_gb: int,
    start_on_create: bool,
    cloud_init_user: str | None,
    ssh_public_key: str | None,
    network_bridge: str | None,
    vlan_tag: int | None,
    ip_config_mode: str,
    ipv4_address: str | None,
    ipv4_gateway: str | None,
) -> dict[str, int | str | bool | None]:
    return {
        "template": template.name,
        "cpu_cores": requested_cpu_cores,
        "memory_mb": requested_memory_mb,
        "disk_gb": requested_disk_gb,
        "start_on_create": start_on_create,
        "cloud_init_user": cloud_init_user,
        "ssh_public_key": ssh_public_key,
        "network_bridge": network_bridge,
        "vlan_tag": vlan_tag,
        "ip_config_mode": ip_config_mode,
        "ipv4_address": ipv4_address,
        "ipv4_gateway": ipv4_gateway,
    }


def _is_proxmox_enabled() -> bool:
    return settings.proxmox_enabled


def _ensure_tenant_quota(
    db: Session,
    *,
    tenant_id: int,
    requested_cpu_cores: int,
    requested_memory_mb: int,
    requested_disk_gb: int,
) -> None:
    tenant = db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    usage = db.execute(
        select(
            func.count(VmInstance.id),
            func.coalesce(func.sum(VmInstance.cpu_cores), 0),
            func.coalesce(func.sum(VmInstance.memory_mb), 0),
            func.coalesce(func.sum(VmInstance.disk_gb), 0),
        )
        .where(VmInstance.tenant_id == tenant_id)
        .where(VmInstance.status != VmStatus.ERROR)
    ).one()

    next_usage = {
        "vms": int(usage[0]) + 1,
        "cpu_cores": int(usage[1]) + requested_cpu_cores,
        "memory_mb": int(usage[2]) + requested_memory_mb,
        "disk_gb": int(usage[3]) + requested_disk_gb,
    }
    limits = {
        "vms": tenant.max_vms,
        "cpu_cores": tenant.max_cpu_cores,
        "memory_mb": tenant.max_memory_mb,
        "disk_gb": tenant.max_disk_gb,
    }
    exceeded = {key: {"requested": next_usage[key], "limit": limits[key]} for key in limits if next_usage[key] > limits[key]}
    if exceeded:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"message": "Tenant quota exceeded", "exceeded": exceeded},
        )


def _dispatch_provisioning_job(request_id: int) -> None:
    if settings.provisioning_mode == "inline":
        process_provisioning_request(request_id)
        return
    queue = get_queue()
    queue.enqueue(
        "app.services.provisioning.process_provisioning_request",
        request_id,
        job_timeout=settings.redis_job_timeout_seconds,
        retry=Retry(max=settings.provisioning_retry_max, interval=settings.provisioning_retry_intervals_list),
        failure_ttl=86400,
    )


def _optional_str(value: object) -> str | None:
    if value is None or value == "":
        return None
    return str(value)


def requeue_failed_request(db: Session, *, request_id: int, actor: User) -> ProvisioningRequest:
    request = db.scalar(select(ProvisioningRequest).where(ProvisioningRequest.id == request_id))
    if not request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Provisioning request not found")

    vm = db.scalar(select(VmInstance).where(VmInstance.id == request.vm_instance_id))
    if not vm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="VM not found")

    if request.status != RequestStatus.FAILED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only failed requests can be requeued")

    payload = json.loads(request.provider_payload)
    payload["requeue_count"] = int(payload.get("requeue_count", 0)) + 1
    payload["last_requeued_at"] = datetime.now(timezone.utc).isoformat()
    payload.pop("error", None)
    payload.pop("last_failed_at", None)
    request.provider_payload = json.dumps(payload)
    request.status = RequestStatus.PENDING
    vm.status = VmStatus.REQUESTED
    db.commit()

    try:
        _dispatch_provisioning_job(request.id)
    except Exception as exc:
        request.status = RequestStatus.FAILED
        vm.status = VmStatus.ERROR
        payload["error"] = str(exc)
        request.provider_payload = json.dumps(payload)
        db.commit()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Provisioning queue unavailable") from exc

    db.commit()
    db.refresh(request)
    write_audit_event(
        db,
        action="admin.provisioning_request_requeued",
        entity_type="provisioning_request",
        entity_id=str(request.id),
        actor_user_id=actor.id,
        details={"vm_instance_id": vm.id, "requeue_count": payload["requeue_count"]},
    )
    return request


def _optional_int(value: object) -> int | None:
    if value is None or value == "":
        return None
    return int(value)
