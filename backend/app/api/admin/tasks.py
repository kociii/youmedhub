from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from sqlalchemy.sql import func
from app.database import get_db
from app.models.analysis_task import AnalysisTask
from app.models.user import User
from datetime import datetime
from pydantic import BaseModel
from app.deps.admin_auth import get_current_admin

router = APIRouter(prefix="/tasks", tags=["管理后台 - AI任务管理"], dependencies=[Depends(get_current_admin)])

@router.get("/")
async def get_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """获取AI任务列表"""
    # 构建查询
    query = db.query(AnalysisTask).join(User, AnalysisTask.user_id == User.id)

    # 搜索功能
    if search:
        search_filter = or_(
            AnalysisTask.id.ilike(f"%{search}%"),
            User.username.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)

    # 状态筛选
    if status and status != "all":
        query = query.filter(AnalysisTask.status == status)

    # 获取总数
    total = query.count()

    # 查询任务列表，按创建时间倒序
    tasks = query.order_by(desc(AnalysisTask.created_at)).offset(skip).limit(limit).all()

    # 构建响应
    items = []
    for task in tasks:
        # 计算任务时长
        duration_ms = None
        if task.started_at and task.completed_at:
            duration_ms = int((task.completed_at - task.started_at).total_seconds() * 1000)

        # 构建输入数据
        input_data = {
            "video_url": task.video_url,
            "video_name": task.video_name,
            "video_size": task.video_size,
            "video_duration": task.video_duration,
            "model_id": task.model_id,
            "enable_thinking": task.enable_thinking,
            "prompt": task.prompt
        }

        items.append({
            "id": task.id,
            "user_id": task.user_id,
            "user_username": task.user.username if task.user else None,
            "user_email": task.user.email if task.user else None,
            "status": task.status,
            "input_data": input_data,
            "result_data": task.result or {},
            "created_at": task.created_at.isoformat() if task.created_at else None,
          "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "duration_ms": duration_ms,
            "error_message": task.error_message,
            "credits_consumed": task.credits_used or 0
        })

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get("/{task_id}")
async def get_task_detail(
    task_id: str,
    db: Session = Depends(get_db)
):
    """获取任务详情"""
    task = db.query(AnalysisTask).filter(AnalysisTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    # 计算任务时长
    duration_ms = None
    if task.started_at and task.completed_at:
        duration_ms = int((task.completed_at - task.started_at).total_seconds() * 1000)

    # 构建输入数据
    input_data = {
        "video_url": task.video_url,
        "video_name": task.video_name,
        "video_size": task.video_size,
        "video_duration": task.video_duration,
        "model_id": task.model_id,
        "enable_thinking": task.enable_thinking,
        "prompt": task.prompt
    }

    return {
        "id": task.id,
        "user_id": task.user_id,
        "user_username": task.user.username if task.user else None,
        "user_email": task.user.email if task.user else None,
        "status": task.status,
        "input_data": input_data,
        "result_data": task.result or {},
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "duration_ms": duration_ms,
        "error_message": task.error_message,
        "credits_consumed": task.credits_used or 0
    }

@router.get("/statistics/overview")
async def get_tasks_statistics(
    db: Session = Depends(get_db)
):
    """获取任务统计信息"""
    # 总任务数
    total_tasks = db.query(AnalysisTask).count()

    # 各状态任务数
    pending_tasks = db.query(AnalysisTask).filter(AnalysisTask.status == "pending").count()
    processing_tasks = db.query(AnalysisTask).filter(AnalysisTask.status == "processing").count()
    completed_tasks = db.query(AnalysisTask).filter(AnalysisTask.status == "completed").count()
    failed_tasks = db.query(AnalysisTask).filter(AnalysisTask.status == "failed").count()

    # 今日任务数
    from sqlalchemy import extract
    today = datetime.utcnow()
    today_tasks = db.query(AnalysisTask).filter(
        and_(
            extract('year', AnalysisTask.created_at) == today.year,
            extract('month', AnalysisTask.created_at) == today.month,
            extract('day', AnalysisTask.created_at) == today.day
        )
    ).count()

    # 平均处理时长（已完成任务）
    avg_duration = db.query(AnalysisTask).filter(
        and_(
            AnalysisTask.status == "completed",
            AnalysisTask.started_at.isnot(None),
            AnalysisTask.completed_at.isnot(None)
        )
    ).all()

    avg_duration_ms = 0
    if avg_duration:
        total_duration = sum([
            int((task.completed_at - task.started_at).total_seconds() * 1000)
            for task in avg_duration
        ])
        avg_duration_ms = total_duration // len(avg_duration)

    # 总消耗点数
    from sqlalchemy import func
    total_credits = db.query(func.sum(AnalysisTask.credits_used)).scalar() or 0

    return {
        "total_tasks": total_tasks,
        "status_counts": {
            "pending": pending_tasks,
            "processing": processing_tasks,
            "completed": completed_tasks,
            "failed": failed_tasks
        },
        "today_tasks": today_tasks,
        "average_duration_ms": avg_duration_ms,
        "total_credits_consumed": int(total_credits)
    }