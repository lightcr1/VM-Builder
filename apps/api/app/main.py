import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.migrations import run_migrations
from app.db.session import create_db_and_seed

configure_logging()
logger = logging.getLogger(__name__)

_UNSAFE = {"change-me", "change-me-now", ""}

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(title="VM Builder API", version="0.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    _validate_secrets()
    run_migrations()
    create_db_and_seed()
    logger.info("VM Builder API started", extra={"action": "startup", "env": settings.app_env})


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api_router, prefix="/api")


def _validate_secrets() -> None:
    if settings.app_env == "development":
        return
    failures = []
    if settings.app_secret_key in _UNSAFE:
        failures.append("APP_SECRET_KEY")
    if settings.app_admin_password in _UNSAFE:
        failures.append("APP_ADMIN_PASSWORD")
    if failures:
        raise RuntimeError(
            f"Refusing to start in '{settings.app_env}' with insecure default secrets: {', '.join(failures)}"
        )
