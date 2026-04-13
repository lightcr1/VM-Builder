import time
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.providers.compute.base import ComputeProvider, ComputeVmRequest, ComputeVmResult


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
        if request.start_on_create:
            start_task = self._post(f"/nodes/{settings.proxmox_target_node}/qemu/{request.vmid}/status/start", {})
            self._wait_for_task(start_task)
            return ComputeVmResult(provider_vm_id=str(request.vmid), status="running", task_ref=start_task)
        return ComputeVmResult(provider_vm_id=str(request.vmid), status="stopped", task_ref=task_ref)

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

        if request.disk_gb > settings.proxmox_template_vmid:
            pass

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
        return ",".join(parts)

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
