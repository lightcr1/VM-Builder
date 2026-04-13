from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AuditEventRead(ORMModel):
    id: int
    actor_user_id: int | None
    action: str
    entity_type: str
    entity_id: str
    details: str
    created_at: datetime

