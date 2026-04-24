from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.providers.auth.ldap import LdapAuthProvider
from app.providers.auth.local import LocalAuthProvider
from app.schemas.auth import LoginRequest, TokenResponse
from app.services.audit import write_audit_event


router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = None
    if settings.ldap_enabled:
        user = LdapAuthProvider(db).authenticate(payload.email, payload.password)
    if not user:
        user = LocalAuthProvider(db).authenticate(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    write_audit_event(
        db,
        action="auth.login",
        entity_type="user",
        entity_id=str(user.id),
        actor_user_id=user.id,
        details={"source": user.auth_source},
    )
    return TokenResponse(access_token=create_access_token(str(user.id)))

