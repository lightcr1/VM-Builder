import uuid

from app.providers.compute.base import ComputeProvider, ComputeVmRequest, ComputeVmResult


class MockProxmoxProvider(ComputeProvider):
    def create_vm(self, request: ComputeVmRequest) -> ComputeVmResult:
        provider_vm_id = str(request.vmid)
        return ComputeVmResult(
            provider_vm_id=provider_vm_id,
            status="running" if request.start_on_create else "stopped",
            task_ref=f"mock-{uuid.uuid4().hex[:12]}",
        )
