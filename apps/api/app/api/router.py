from fastapi import APIRouter

from app.api.routes import admin, auth, me, vms


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(me.router, prefix="/me", tags=["me"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(vms.router, prefix="/vms", tags=["vms"])

