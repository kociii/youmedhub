from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.schemas.admin import UserListResponse, UserDetailResponse, UserUpdateRequest
from app.deps.admin import get_current_admin

router = APIRouter(prefix="/users", tags=["管理后台 - 用户管理"], dependencies=[Depends(get_current_admin)])

@router.get("/")
async def get_users(
    page: int = Query(1, ge=1, alias="skip"),
    limit: int = Query(10, ge=1, le=100, alias="limit"),
    search: str = Query(None),
    db: Session = Depends(get_db)
):
    """获取用户列表"""
    # 计算偏移量
    offset = (page - 1) * limit

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
                "created_at": user.created_at
            }
            for user in users
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
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