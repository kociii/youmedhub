from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt
from app.core.security import verify_password
from app.core.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.admin import AdminLoginResponse

router = APIRouter(prefix="/auth", tags=["管理后台 - 认证"])

class AdminLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    """管理后台登录"""
    # 验证默认账号密码
    if request.username == "kocijia" and request.password == "mfkz941027":
        # 创建管理员 token
        payload = {
            "sub": "admin",  # 特殊的管理员 ID（必须是字符串）
            "username": "kocijia",
            "is_admin": True,
            "exp": datetime.utcnow() + timedelta(hours=24),  # 24小时有效期
        }
        access_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return AdminLoginResponse(
            access_token=access_token,
            token_type="bearer",
            username="kocijia",
            is_admin=True
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="用户名或密码错误"
    )