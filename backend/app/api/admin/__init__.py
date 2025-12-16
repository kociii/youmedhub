from fastapi import APIRouter
from . import auth, users

router = APIRouter(prefix="/api/admin", tags=["管理后台"])

router.include_router(auth.router)
router.include_router(users.router)