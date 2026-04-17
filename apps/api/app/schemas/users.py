from datetime import datetime

<<<<<<< HEAD
from pydantic import BaseModel, EmailStr, Field
=======
from pydantic import BaseModel, EmailStr
>>>>>>> origin/main

from app.models.domain import Role
from app.schemas.common import ORMModel


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: Role = Role.USER
    tenant_id: int | None = None
    tenant_name: str | None = None


class TenantCreate(BaseModel):
    name: str
    slug: str
<<<<<<< HEAD
    max_vms: int = Field(default=10, ge=0)
    max_cpu_cores: int = Field(default=16, ge=0)
    max_memory_mb: int = Field(default=32768, ge=0)
    max_disk_gb: int = Field(default=500, ge=0)


class TenantQuotaUpdate(BaseModel):
    max_vms: int = Field(ge=0)
    max_cpu_cores: int = Field(ge=0)
    max_memory_mb: int = Field(ge=0)
    max_disk_gb: int = Field(ge=0)
=======
>>>>>>> origin/main


class TenantRead(ORMModel):
    id: int
    name: str
    slug: str
<<<<<<< HEAD
    max_vms: int
    max_cpu_cores: int
    max_memory_mb: int
    max_disk_gb: int
=======
>>>>>>> origin/main
    created_at: datetime


class UserRead(ORMModel):
    id: int
    email: EmailStr
    full_name: str
    role: Role
    auth_source: str
    is_active: bool
    created_at: datetime


class MembershipRead(BaseModel):
    tenant: TenantRead
    is_default: bool


class MeResponse(UserRead):
    memberships: list[MembershipRead]
