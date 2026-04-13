from typing import Protocol


class NetworkProvider(Protocol):
    def assign_segment(self, tenant_slug: str) -> str:
        ...

