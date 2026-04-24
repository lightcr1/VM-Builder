import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.domain import Membership, Role, Tenant, User
from app.providers.auth.base import AuthProvider

logger = logging.getLogger(__name__)


class LdapAuthProvider(AuthProvider):
    def __init__(self, db: Session) -> None:
        self.db = db

    def authenticate(self, email: str, password: str) -> User | None:
        try:
            from ldap3 import ALL, SUBTREE, Connection, Server
            from ldap3.utils.conv import escape_filter_chars
        except ImportError:
            logger.error("ldap3 library not installed; LDAP authentication unavailable")
            return None

        try:
            server = Server(settings.ldap_server_uri, get_info=ALL)
            bind_conn = Connection(server, user=settings.ldap_bind_dn, password=settings.ldap_bind_password)
            if not bind_conn.bind():
                logger.error("LDAP service bind failed", extra={"uri": settings.ldap_server_uri})
                return None

            search_template = settings.ldap_user_search_filter or "(mail={email})"
            search_filter = search_template.format(email=escape_filter_chars(email))
            attributes = [
                settings.ldap_email_attribute,
                settings.ldap_name_attribute,
                settings.ldap_group_attribute,
            ]
            bind_conn.search(
                search_base=settings.ldap_base_dn,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=attributes,
            )
            if not bind_conn.entries:
                return None

            entry = bind_conn.entries[0]
            user_dn = entry.entry_dn

            user_conn = Connection(server, user=user_dn, password=password)
            if not user_conn.bind():
                return None

            groups = _entry_values(entry, settings.ldap_group_attribute)
            if settings.ldap_allowed_groups_list:
                if not _matches_any_group(groups, settings.ldap_allowed_groups_list):
                    logger.warning("LDAP user not in allowed groups", extra={"email": email})
                    return None

            ldap_email = _first_entry_value(entry, settings.ldap_email_attribute) or email
            full_name = _first_entry_value(entry, settings.ldap_name_attribute) or ldap_email.split("@")[0]
            role = Role.ADMIN if _matches_any_group(groups, settings.ldap_admin_groups_list) else Role.USER
            return self._upsert_user(email=ldap_email, full_name=full_name, role=role)
        except Exception as exc:  # noqa: BLE001
            logger.error("LDAP authentication error: %s", exc)
            return None

    def _upsert_user(self, *, email: str, full_name: str, role: Role) -> User | None:
        user = self.db.scalar(select(User).where(User.email == email))
        if user:
            if not user.is_active:
                return None
            user.full_name = full_name
            user.role = role
            user.auth_source = "ldap"
            self.db.commit()
            return user

        default_tenant = self.db.scalar(select(Tenant).order_by(Tenant.id.asc()))
        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password("ldap-managed"),
            role=role,
            auth_source="ldap",
            is_active=True,
        )
        self.db.add(user)
        self.db.flush()
        if default_tenant:
            self.db.add(Membership(user_id=user.id, tenant_id=default_tenant.id, is_default=True))
        self.db.commit()
        self.db.refresh(user)
        logger.info("LDAP user provisioned", extra={"email": email})
        return user


def _entry_values(entry: object, attribute: str) -> list[str]:
    value = getattr(entry, attribute, None)
    if value is None:
        return []
    if hasattr(value, "values"):
        return [str(item) for item in value.values]
    if isinstance(value, (list, tuple, set)):
        return [str(item) for item in value]
    return [str(value)]


def _first_entry_value(entry: object, attribute: str) -> str | None:
    values = _entry_values(entry, attribute)
    return values[0] if values else None


def _matches_any_group(user_groups: list[str], allowed_groups: list[str]) -> bool:
    if not allowed_groups:
        return False
    normalized_user_groups = [group.lower() for group in user_groups]
    for allowed in allowed_groups:
        allowed_lower = allowed.lower()
        if any(group == allowed_lower or allowed_lower in group for group in normalized_user_groups):
            return True
    return False
