from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.admin import UserListResponse, UserDetailResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/admin/users", tags=["管理后台 - 用户管理"])

@router.get("/", response_model=List[UserListResponse])
async def get_users(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """获取用户列表"""
    # 计算偏移量
    offset = (page - 1) * size

    # 查询用户列表
    users = db.query(User).offset(offset).limit(size).all()

    # 获取总数
    total = db.query(User).count()

    # 构建响应
    return [
        UserListResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            created_at=user.created_at
        )
        for user in users
    ]

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
    update_data: dict,
    db: Session = Depends(get_db)
):
    """更新用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # 更新允许的字段
    if "username" in update_data:
        # 检查用户名是否已存在
        existing_user = db.query(User).filter(
            User.username == update_data["username"],
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="用户名已存在")
        user.username = update_data["username"]

    if "email" in update_data:
        # 检查邮箱是否已存在
        existing_user = db.query(User).filter(
            User.email == update_data["email"],
            User.id != user_id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="邮箱已存在")
        user.email = update_data["email"]

    db.commit()
    db.refresh(user)

    return UserDetailResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        updated_at=user.updated_at
    )