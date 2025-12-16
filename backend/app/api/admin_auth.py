from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt
from datetime import timedelta, datetime
from app.database import get_db
from app.models.admin import AdminUser
from app.core.security import verify_password, get_password_hash
from app.core.config import settings
from pydantic import BaseModel
from app.deps.admin_auth import get_current_admin

router = APIRouter(prefix="/api/admin/auth", tags=["管理员认证"])

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str
    admin: dict

class AdminCreateRequest(BaseModel):
    username: str
    email: str
    password: str
    is_super: bool = False

def create_admin_token(admin_id: int, expires_delta: timedelta = None):
    to_encode = {"sub": str(admin_id), "type": "admin"}
    if expires_delta:
        exp = datetime.utcnow() + expires_delta
    else:
        exp = datetime.utcnow() + timedelta(days=7)  # 管理员token有效期7天
    to_encode.update({"exp": exp})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.post("/login", response_model=AdminLoginResponse, summary="管理员登录")
async def admin_login(
    request: AdminLoginRequest,
    db: Session = Depends(get_db)
):
    """管理员登录"""
    # 查找管理员
    admin = db.query(AdminUser).filter(
        (AdminUser.username == request.username) |
        (AdminUser.email == request.username)
    ).first()

    if not admin or not verify_password(request.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号已被禁用"
        )

    # 生成token
    access_token = create_admin_token(admin.id)

    # 更新最后登录时间
    from datetime import datetime, timezone
    admin.last_login = datetime.now(timezone.utc)
    db.commit()

    return AdminLoginResponse(
        access_token=access_token,
        token_type="bearer",
        admin={
            "id": admin.id,
            "username": admin.username,
            "email": admin.email,
            "is_super": admin.is_super
        }
    )

@router.post("/register", summary="创建管理员账号")
async def create_admin(
    request: AdminCreateRequest,
    db: Session = Depends(get_db)
):
    """创建新的管理员账号（仅限超级管理员）"""
    # 检查用户名是否已存在
    if db.query(AdminUser).filter(AdminUser.username == request.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )

    # 检查邮箱是否已存在
    if db.query(AdminUser).filter(AdminUser.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已存在"
        )

    # 创建管理员
    admin = AdminUser(
        username=request.username,
        email=request.email,
        hashed_password=get_password_hash(request.password),
        is_super=request.is_super
    )

    db.add(admin)
    db.commit()
    db.refresh(admin)

    return {"message": "管理员账号创建成功", "admin_id": admin.id}

@router.get("/me", summary="获取当前管理员信息")
async def get_current_admin_info(
    current_admin: AdminUser = Depends(get_current_admin)
):
    """获取当前登录的管理员信息"""
    return {
        "id": current_admin.id,
        "username": current_admin.username,
        "email": current_admin.email,
        "is_super": current_admin.is_super,
        "is_active": current_admin.is_active,
        "last_login": current_admin.last_login,
        "created_at": current_admin.created_at
    }

@router.post("/logout", summary="管理员登出")
async def admin_logout(
    current_admin: AdminUser = Depends(get_current_admin)
):
    """管理员登出（前端需要清除token）"""
    return {"message": "登出成功"}