from typing import Protocol

from app.models.domain import User


class AuthProvider(Protocol):
    def authenticate(self, email: str, password: str) -> User | None:
        ...

