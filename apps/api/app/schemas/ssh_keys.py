from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class SshKeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    public_key: str = Field(min_length=20)


class SshKeyRead(ORMModel):
    id: int
    name: str
    public_key: str
    fingerprint: str
    created_at: datetime
