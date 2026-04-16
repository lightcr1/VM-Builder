from dataclasses import dataclass
from typing import Protocol


@dataclass
class ComputeVmRequest:
    vmid: int
    name: str
    template_name: str
    cpu_cores: int
    memory_mb: int
    disk_gb: int
    tenant_slug: str
    description: str = ""
    start_on_create: bool = False
    cloud_init_user: str | None = None
    ssh_public_key: str | None = None
    network_bridge: str | None = None
    vlan_tag: int | None = None
    ip_config_mode: str = "dhcp"
    ipv4_address: str | None = None
    ipv4_gateway: str | None = None


@dataclass
class ComputeVmResult:
    provider_vm_id: str
    status: str
    task_ref: str | None = None
    metadata: dict[str, str | None] | None = None


@dataclass
class ComputeVmActionResult:
    status: str
    task_ref: str | None = None


class ComputeProvider(Protocol):
    def create_vm(self, request: ComputeVmRequest) -> ComputeVmResult:
        ...

    def start_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        ...

    def stop_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        ...

    def delete_vm(self, provider_vm_id: str) -> ComputeVmActionResult:
        ...
