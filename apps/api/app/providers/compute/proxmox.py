import time
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.providers.compute.base import ComputeProvider, ComputeVmActionResult, ComputeVmRequest, ComputeVmResult


class ProxmoxApiError(RuntimeError):
    pass


class ProxmoxComputeProvider(ComputeProvider):
    def __init__(self) -> None:
        if not settings.proxmox_base_url or not settings.proxmox_token_id or not settings.proxmox_token_secret:
            raise ProxmoxApiError("Proxmox credentials are not configured")
        if not settings.proxmox_node or not settings.proxmox_target_node:
            raise ProxmoxApiError("Proxmox node settings are not configured")

    def create_vm(self, request: ComputeVmRequest) -> ComputeVmResult:
        task_ref = self._clone_template(request)
        self._wait_for_task(task_ref)
        self._configure_vm(request)
        firewall_metadata = self._apply_firewall_guardrail(request)
        if request.start_on_create:
            start_result = self.start_vm(str(request.vmid))
            return ComputeVmResult(
                provider_vm_id=str(request.vmid),
                status=start_result.status,
                task_ref=start_result.task_ref,
                metadata=firewall_metadata,
            )
        return ComputeVmResult(provider_vm_id=str(request.vmid), status="stopped", task_ref=task_ref, metadata=firewall_metadata)

    def start_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        task_ref = self._post(f"/nodes/{settings.proxmox_target_node}/qemu/{provider_vm_id}/status/start", {})
        self._wait_for_task(task_ref)
        return ComputeVmActionResult(status="running", task_ref=task_ref)

    def stop_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        task_ref = self._post(f"/nodes/{settings.proxmox_target_node}/qemu/{provider_vm_id}/status/stop", {})
        self._wait_for_task(task_ref)
        return ComputeVmActionResult(status="stopped", task_ref=task_ref)

    def delete_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        task_ref = self._delete(f"/nodes/{settings.proxmox_target_node}/qemu/{provider_vm_id}")
        self._wait_for_task(task_ref)
        return ComputeVmActionResult(status="deleted", task_ref=task_ref)

    def _clone_template(self, request: ComputeVmRequest) -> str:
        path = (
            f"/nodes/{settings.proxmox_node}/qemu/"
            f"{settings.proxmox_template_vmid}/clone"
        )
        clone_mode = settings.proxmox_clone_mode.lower()
        is_full_clone = clone_mode == "full"
        payload = {
            "newid": str(request.vmid),
            "name": request.name,
            "target": settings.proxmox_target_node,
            "storage": settings.proxmox_storage,
            "full": "1" if is_full_clone else "0",
            "description": f"VM Builder tenant={request.tenant_slug} template={request.template_name}",
        }
        data = self._post(path, payload)
        return str(data)

    def _wait_for_task(self, task_ref: str) -> None:
        started_at = time.monotonic()
        task_node = self._node_from_task(task_ref)
        path = f"/nodes/{task_node}/tasks/{task_ref}/status"

        while True:
            data = self._get(path)
            if data.get("status") == "stopped":
                exit_status = str(data.get("exitstatus", ""))
                if exit_status != "OK":
                    raise ProxmoxApiError(f"Proxmox task failed with exit status '{exit_status}'")
                return

            if time.monotonic() - started_at > settings.proxmox_task_timeout_seconds:
                raise ProxmoxApiError("Proxmox task timed out")

            time.sleep(settings.proxmox_poll_interval_seconds)

    def _configure_vm(self, request: ComputeVmRequest) -> None:
        config_task = self._post(
            f"/nodes/{settings.proxmox_target_node}/qemu/{request.vmid}/config",
            self._config_payload(request),
        )
        self._wait_for_task(config_task)

<<<<<<< HEAD
=======
        if request.disk_gb > settings.proxmox_template_vmid:
            pass

>>>>>>> origin/main
        resize_task = self._maybe_resize_disk(request)
        if resize_task:
            self._wait_for_task(resize_task)

    def _config_payload(self, request: ComputeVmRequest) -> dict[str, str]:
        payload = {
            "cores": str(request.cpu_cores),
            "memory": str(request.memory_mb),
            "ciuser": request.cloud_init_user or "ubuntu",
            "ipconfig0": self._ipconfig(request),
            "net0": self._net0(request),
            "description": request.description or f"VM Builder tenant={request.tenant_slug}",
        }
        if request.ssh_public_key:
            payload["sshkeys"] = request.ssh_public_key
        return payload

    def _maybe_resize_disk(self, request: ComputeVmRequest) -> str | None:
        if request.disk_gb <= settings.proxmox_template_disk_gb:
            return None
        return self._post(
            f"/nodes/{settings.proxmox_target_node}/qemu/{request.vmid}/resize",
            {"disk": "scsi0", "size": f"{request.disk_gb}G"},
        )

    def _ipconfig(self, request: ComputeVmRequest) -> str:
        if request.ip_config_mode == "static":
            if not request.ipv4_address or not request.ipv4_gateway:
                raise ProxmoxApiError("Static IP mode requires ipv4_address and ipv4_gateway")
            return f"ip={request.ipv4_address},gw={request.ipv4_gateway}"
        return "ip=dhcp"

    def _net0(self, request: ComputeVmRequest) -> str:
        bridge = request.network_bridge or settings.proxmox_bridge
        parts = [f"virtio,bridge={bridge}"]
        if request.vlan_tag is not None:
            parts.append(f"tag={request.vlan_tag}")
        if settings.proxmox_enable_vm_firewall or settings.proxmox_default_firewall_group:
            parts.append("firewall=1")
        return ",".join(parts)

    def _apply_firewall_guardrail(self, request: ComputeVmRequest) -> dict[str, str | None]:
        metadata = {
            "firewall_group": settings.proxmox_default_firewall_group or None,
            "firewall_enabled": str(settings.proxmox_enable_vm_firewall).lower(),
        }
        if settings.proxmox_enable_vm_firewall:
            self._put(
                f"/nodes/{settings.proxmox_target_node}/qemu/{request.vmid}/firewall/options",
                {"enable": "1"},
            )
        if settings.proxmox_default_firewall_group:
            self._post(
                f"/nodes/{settings.proxmox_target_node}/qemu/{request.vmid}/firewall/rules",
                {
                    "type": "group",
                    "action": settings.proxmox_default_firewall_group,
                    "enable": "1",
                    "comment": "Managed by VM Builder",
                },
            )
        return metadata

    def _post(self, path: str, payload: dict[str, str]) -> str:
        url = f"{settings.proxmox_base_url.rstrip('/')}{path}"
        response = httpx.post(
            url,
            content=urlencode(payload),
            headers={**self._headers(), "Content-Type": "application/x-www-form-urlencoded"},
            verify=settings.proxmox_verify_tls,
            timeout=30.0,
        )
        response.raise_for_status()
        body = response.json()
        if "data" not in body:
            raise ProxmoxApiError("Unexpected Proxmox response")
        return str(body["data"])

    def _get(self, path: str) -> dict:
        url = f"{settings.proxmox_base_url.rstrip('/')}{path}"
        response = httpx.get(
            url,
            headers=self._headers(),
            verify=settings.proxmox_verify_tls,
            timeout=30.0,
        )
        response.raise_for_status()
        body = response.json()
        if "data" not in body or not isinstance(body["data"], dict):
            raise ProxmoxApiError("Unexpected Proxmox response")
        return body["data"]

    def _delete(self, path: str) -> str:
        url = f"{settings.proxmox_base_url.rstrip('/')}{path}"
        response = httpx.delete(
            url,
            headers=self._headers(),
            verify=settings.proxmox_verify_tls,
            timeout=30.0,
        )
        response.raise_for_status()
        body = response.json()
        if "data" not in body:
            raise ProxmoxApiError("Unexpected Proxmox response")
        return str(body["data"])

    def _put(self, path: str, payload: dict[str, str]) -> object:
        url = f"{settings.proxmox_base_url.rstrip('/')}{path}"
        response = httpx.put(
            url,
            content=urlencode(payload),
            headers={**self._headers(), "Content-Type": "application/x-www-form-urlencoded"},
            verify=settings.proxmox_verify_tls,
            timeout=30.0,
        )
        response.raise_for_status()
        body = response.json()
        if "data" not in body:
            raise ProxmoxApiError("Unexpected Proxmox response")
        return body["data"]

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": (
                f"PVEAPIToken={settings.proxmox_token_id}="
                f"{settings.proxmox_token_secret}"
            )
        }

    def _node_from_task(self, task_ref: str) -> str:
        parts = task_ref.split(":")
        if len(parts) < 2 or not parts[1]:
            raise ProxmoxApiError("Unable to determine Proxmox task node")
        return parts[1]
