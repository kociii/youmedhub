from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.admin import UserListResponse, UserDetailResponse, UserUpdateRequest
from pydantic import BaseModel
from app.deps.admin_auth import get_current_admin

router = APIRouter(prefix="/users", tags=["管理后台 - 用户管理"], dependencies=[Depends(get_current_admin)])

class CreditsAdjustRequest(BaseModel):
    credits: int
    reason: str

@router.get("/")
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    db: Session = Depends(get_db)
):
    """获取用户列表"""
    # 使用skip作为偏移量
    offset = skip

    # 构建查询
    query = db.query(User)

    # 搜索功能
    if search:
        query = query.filter(
            User.username.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%")
        )

    # 获取总数
    total = query.count()

    # 查询用户列表
    users = query.offset(offset).limit(limit).all()

    # 构建响应
    return {
        "items": [
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "credits": user.credits,
                "is_admin": user.is_admin,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            }
            for user in users
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """获取用户详情"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    return UserDetailResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """删除用户"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    db.delete(user)
    db.commit()

    return {"message": "用户删除成功"}

@router.put("/{user_id}", response_model=UserDetailResponse)
async def update_user(
    user_id: int,
    update_data: UserUpdateRequest,
    db: Session = Depends(get_db)
):
    """更新用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 更新允许的字段
    if update_data.username:
        # 检查用户名是否已存在
        existing_user = db.query(User).filter(
            User.username == update_data.username,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="用户名已存在")
        user.username = update_data.username

    if update_data.email:
        # 检查邮箱是否已存在
        existing_user = db.query(User).filter(
            User.email == update_data.email,
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="邮箱已存在")
        user.email = update_data.email

    db.commit()
    db.refresh(user)

    return UserDetailResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.post("/{user_id}/adjust-credits")
async def adjust_user_credits(
    user_id: int,
    request: CreditsAdjustRequest,
    db: Session = Depends(get_db)
):
    """调整用户点数"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    old_credits = user.credits
    user.credits = request.credits
    db.commit()

    return {
        "message": "点数调整成功",
        "old_credits": old_credits,
        "new_credits": user.credits,
        "reason": request.reason
    }