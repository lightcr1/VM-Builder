from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.users import MeResponse, MembershipRead, TenantRead
from app.models.domain import User
from app.services.auth import get_current_user, get_memberships


router = APIRouter()


@router.get("", response_model=MeResponse)
def read_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeResponse:
    memberships = [
        MembershipRead(tenant=TenantRead.model_validate(membership.tenant), is_default=membership.is_default)
        for membership in get_memberships(db, current_user.id)
    ]
    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        auth_source=current_user.auth_source,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        memberships=memberships,
    )
