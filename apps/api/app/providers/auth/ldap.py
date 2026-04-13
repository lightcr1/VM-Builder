from app.models.domain import User
from app.providers.auth.base import AuthProvider


class LdapAuthProvider(AuthProvider):
    def authenticate(self, email: str, password: str) -> User | None:
        # LDAP/AD integration is intentionally deferred; this preserves a stable extension point.
        return None

