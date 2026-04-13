from datetime import datetime

from pydantic import BaseModel, EmailStr

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


class TenantRead(ORMModel):
    id: int
    name: str
    slug: str
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
