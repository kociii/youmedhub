"""
系统管理相关API
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.task_monitor_service import task_monitor_service
from app.deps.admin_auth import get_current_admin

router = APIRouter()

@router.post("/monitor-tasks")
async def monitor_tasks(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """
    手动触发任务状态检查
    """
    try:
        result = task_monitor_service.run_check()
        return {
            "success": True,
            "message": "任务状态检查完成",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"任务检查失败: {str(e)}")

@router.get("/task-stats")
async def get_task_statistics(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_admin)
):
    """
    获取任务统计信息
    """
    from sqlalchemy import func
    from app.models.analysis_task import AnalysisTask

    try:
        # 基础统计
        stats = db.query(
            AnalysisTask.status,
            func.count(AnalysisTask.id).label('count'),
            func.avg(AnalysisTask.credits_used).label('avg_credits')
        ).group_by(AnalysisTask.status).all()

        # 按模型统计
        model_stats = db.query(
            AnalysisTask.model_id,
            AnalysisTask.status,
            func.count(AnalysisTask.id).label('count')
        ).group_by(AnalysisTask.model_id, AnalysisTask.status).all()

        # 按日期统计（最近7天）
        from datetime import datetime, timedelta
        date_threshold = datetime.utcnow() - timedelta(days=7)

        date_stats = db.query(
            func.date(AnalysisTask.created_at).label('date'),
            AnalysisTask.status,
            func.count(AnalysisTask.id).label('count')
        ).filter(
            AnalysisTask.created_at >= date_threshold
        ).group_by(
            func.date(AnalysisTask.created_at),
            AnalysisTask.status
        ).order_by('date').all()

        # 总任务数
        total_tasks = db.query(func.count(AnalysisTask.id)).scalar()

        return {
            "success": True,
            "data": {
                "total_tasks": total_tasks,
                "status_stats": [
                    {
                        "status": status,
                        "count": count,
                        "percentage": round(count / total_tasks * 100, 1) if total_tasks > 0 else 0,
                        "avg_credits": round(float(avg_credits), 1) if avg_credits else 0
                    }
                    for status, count, avg_credits in stats
                ],
                "model_stats": [
                    {
                        "model_id": model_id,
                        "status": status,
                        "count": count
                    }
                    for model_id, status, count in model_stats
                ],
                "date_stats": [
                    {
                        "date": str(date),
                        "status": status,
                        "count": count
                    }
                    for date, status, count in date_stats
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")