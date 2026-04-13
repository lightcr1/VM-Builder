from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=False, env_file=".env", extra="ignore")

    app_env: str = "development"
    app_secret_key: str = "change-me"
    app_admin_email: str = "admin@example.com"
    app_admin_password: str = "change-me-now"
    database_url: str = "sqlite:///./vm_builder.db"
    app_cors_origins: str = Field(default="http://localhost:8080")
    provisioning_mode: str = "inline"
    redis_url: str = "redis://redis:6379/0"
    redis_queue_name: str = "provisioning"
    redis_job_timeout_seconds: int = 600
    provisioning_retry_max: int = 3
    provisioning_retry_intervals: str = "10,30,60"

    ldap_enabled: bool = False
    ldap_server_uri: str = ""
    ldap_bind_dn: str = ""
    ldap_bind_password: str = ""
    ldap_base_dn: str = ""
    ldap_allowed_groups: str = ""

    proxmox_base_url: str = ""
    proxmox_token_id: str = ""
    proxmox_token_secret: str = ""
    proxmox_verify_tls: bool = True
    proxmox_enabled: bool = False
    proxmox_node: str = ""
    proxmox_template_vmid: int = 9000
    proxmox_target_node: str = ""
    proxmox_storage: str = "local-lvm"
    proxmox_bridge: str = "vmbr0"
    proxmox_clone_mode: str = "full"
    proxmox_poll_interval_seconds: float = 2.0
    proxmox_task_timeout_seconds: int = 180
    proxmox_template_disk_gb: int = 20

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.app_cors_origins.split(",") if origin.strip()]

    @property
    def ldap_allowed_groups_list(self) -> list[str]:
        return [group.strip() for group in self.ldap_allowed_groups.split(",") if group.strip()]

    @property
    def provisioning_retry_intervals_list(self) -> list[int]:
        return [int(value.strip()) for value in self.provisioning_retry_intervals.split(",") if value.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
