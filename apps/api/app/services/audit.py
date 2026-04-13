import json

from sqlalchemy.orm import Session

from app.models.domain import AuditEvent


def write_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    actor_user_id: int | None = None,
    details: dict | None = None,
) -> None:
    event = AuditEvent(
        actor_user_id=actor_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details or {}),
    )
    db.add(event)
    db.commit()

