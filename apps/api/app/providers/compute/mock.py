import uuid

from app.core.config import settings
from app.providers.compute.base import ComputeProvider, ComputeVmActionResult, ComputeVmRequest, ComputeVmResult


class MockProxmoxProvider(ComputeProvider):
    def create_vm(self, request: ComputeVmRequest) -> ComputeVmResult:
        provider_vm_id = str(request.vmid)
        return ComputeVmResult(
            provider_vm_id=provider_vm_id,
            status="running" if request.start_on_create else "stopped",
            task_ref=f"mock-{uuid.uuid4().hex[:12]}",
            metadata={
                "firewall_group": settings.proxmox_default_firewall_group or None,
                "firewall_enabled": str(settings.proxmox_enable_vm_firewall).lower(),
            },
        )

    def start_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        return ComputeVmActionResult(status="running", task_ref=f"mock-{uuid.uuid4().hex[:12]}")

    def stop_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        return ComputeVmActionResult(status="stopped", task_ref=f"mock-{uuid.uuid4().hex[:12]}")

    def delete_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        return ComputeVmActionResult(status="deleted", task_ref=f"mock-{uuid.uuid4().hex[:12]}")
