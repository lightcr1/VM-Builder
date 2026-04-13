from app.core.config import settings
from app.providers.compute.base import ComputeProvider
from app.providers.compute.mock import MockProxmoxProvider
from app.providers.compute.proxmox import ProxmoxComputeProvider


def get_compute_provider() -> ComputeProvider:
    if settings.proxmox_enabled:
        return ProxmoxComputeProvider()
    return MockProxmoxProvider()
