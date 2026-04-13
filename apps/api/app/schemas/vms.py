from datetime import datetime

from pydantic import BaseModel, Field

from app.models.domain import RequestStatus, VmStatus
from app.schemas.common import ORMModel
from app.schemas.users import TenantRead, UserRead


class VmTemplateRead(ORMModel):
    id: int
    name: str
    cpu_cores: int
    memory_mb: int
    disk_gb: int
    image_ref: str


class VmCreate(BaseModel):
    name: str
    description: str = ""
    template_id: int
    tenant_id: int
    cpu_cores: int | None = Field(default=None, ge=1, le=64)
    memory_mb: int | None = Field(default=None, ge=512, le=262144)
    disk_gb: int | None = Field(default=None, ge=5, le=4096)
    start_on_create: bool = False
    cloud_init_user: str | None = None
    ssh_public_key: str | None = None
    network_bridge: str | None = None
    vlan_tag: int | None = Field(default=None, ge=1, le=4094)
    ip_config_mode: str = Field(default="dhcp", pattern="^(dhcp|static)$")
    ipv4_address: str | None = None
    ipv4_gateway: str | None = None


class VmRead(ORMModel):
    id: int
    name: str
    description: str
    status: VmStatus
    provider_name: str
    provider_vm_id: str | None
    created_at: datetime
    tenant: TenantRead
    owner: UserRead
    template: VmTemplateRead


class ProvisioningRequestRead(ORMModel):
    id: int
    status: RequestStatus
    provider_payload: str
    created_at: datetime
    vm_instance_id: int
