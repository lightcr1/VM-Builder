import base64
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.domain import SshKey, User
from app.schemas.ssh_keys import SshKeyCreate, SshKeyRead
from app.services.auth import get_current_user


router = APIRouter()


@router.get("", response_model=list[SshKeyRead])
def list_ssh_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SshKey]:
    return db.scalars(
        select(SshKey).where(SshKey.user_id == current_user.id).order_by(SshKey.created_at.desc())
    ).all()


@router.post("", response_model=SshKeyRead, status_code=status.HTTP_201_CREATED)
def create_ssh_key(
    payload: SshKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SshKey:
    fingerprint = _compute_fingerprint(payload.public_key)
    existing = db.scalar(
        select(SshKey).where(SshKey.user_id == current_user.id, SshKey.fingerprint == fingerprint)
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SSH key already registered")

    ssh_key = SshKey(
        user_id=current_user.id,
        name=payload.name,
        public_key=payload.public_key.strip(),
        fingerprint=fingerprint,
    )
    db.add(ssh_key)
    db.commit()
    db.refresh(ssh_key)
    return ssh_key


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ssh_key(
    key_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    ssh_key = db.scalar(
        select(SshKey).where(SshKey.id == key_id, SshKey.user_id == current_user.id)
    )
    if not ssh_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="SSH key not found")
    db.delete(ssh_key)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _compute_fingerprint(public_key: str) -> str:
    parts = public_key.strip().split()
    if len(parts) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid SSH public key format")
    try:
        key_bytes = base64.b64decode(parts[1])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid SSH public key encoding") from exc
    digest = hashlib.md5(key_bytes).hexdigest()
    return ":".join(digest[i : i + 2] for i in range(0, len(digest), 2))
