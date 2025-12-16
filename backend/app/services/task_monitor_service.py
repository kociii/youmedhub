"""
任务监控服务 - 定期检查并更新过期任务状态
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.analysis_task import AnalysisTask
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class TaskMonitorService:
    """任务监控服务"""

    def __init__(self):
        self.PENDING_TIMEOUT = 10 * 60  # 10分钟后超时
        self.PROCESSING_TIMEOUT = 30 * 60  # 30分钟后超时
        self.TEST_KEYWORDS = [
            'invalid_url', 'test', 'http://example.com',
            'testuser', 'demo', 'https://invalid.com',
            'fake.com', 'test.com', 'sample-videos.com'
        ]

    def is_test_url(self, url: Optional[str]) -> bool:
        """检查是否为测试URL"""
        if not url:
            return True
        url_lower = url.lower()
        return any(keyword in url_lower for keyword in self.TEST_KEYWORDS)

    def update_stale_tasks(self, db: Session) -> int:
        """更新过期任务状态"""
        now = datetime.utcnow()
        updated_count = 0

        # 1. 更新过期的pending任务
        pending_threshold = now - timedelta(seconds=self.PENDING_TIMEOUT)
        stale_pending_tasks = db.query(AnalysisTask).filter(
            AnalysisTask.status == "pending",
            AnalysisTask.created_at < pending_threshold
        ).all()

        logger.info(f"找到 {len(stale_pending_tasks)} 个过期的pending任务")

        for task in stale_pending_tasks:
            # 检查是否为测试URL
            if self.is_test_url(task.video_url):
                task.status = "failed"
                task.error_message = f"测试任务自动标记为失败（URL: {task.video_url}）"
                task.completed_at = now
                logger.info(f"任务 {task.id}: 测试URL -> failed")
            else:
                # 标记为超时失败
                task.status = "failed"
                task.error_message = f"任务处理超时（超过 {self.PENDING_TIMEOUT // 60} 分钟）"
                task.completed_at = now
                logger.info(f"任务 {task.id}: 处理超时 -> failed")

            updated_count += 1

        # 2. 更新过期的processing任务
        processing_threshold = now - timedelta(seconds=self.PROCESSING_TIMEOUT)
        stale_processing_tasks = db.query(AnalysisTask).filter(
            AnalysisTask.status == "processing",
            AnalysisTask.started_at < processing_threshold
        ).all()

        logger.info(f"找到 {len(stale_processing_tasks)} 个过期的processing任务")

        for task in stale_processing_tasks:
            task.status = "failed"
            task.error_message = f"任务处理时间过长（超过 {self.PROCESSING_TIMEOUT // 60} 分钟）"
            task.completed_at = now
            logger.info(f"任务 {task.id}: 处理时间过长 -> failed")
            updated_count += 1

        # 3. 检查无效状态的任务
        invalid_status_tasks = db.query(AnalysisTask).filter(
            AnalysisTask.status.in_(["pending", "processing"]),
            AnalysisTask.video_url.is_(None)
        ).all()

        logger.info(f"找到 {len(invalid_status_tasks)} 个无效URL的任务")

        for task in invalid_status_tasks:
            task.status = "failed"
            task.error_message = "无效的视频URL"
            task.completed_at = now
            logger.info(f"任务 {task.id}: 无效URL -> failed")
            updated_count += 1

        if updated_count > 0:
            db.commit()
            logger.info(f"成功更新 {updated_count} 个任务状态")

        return updated_count

    def run_check(self) -> dict:
        """执行一次任务状态检查"""
        db = SessionLocal()
        try:
            updated_count = self.update_stale_tasks(db)

            # 获取统计信息
            from sqlalchemy import func
            stats = db.query(
                AnalysisTask.status,
                func.count(AnalysisTask.id).label('count')
            ).group_by(AnalysisTask.status).all()

            result = {
                "updated_count": updated_count,
                "status_stats": {status: count for status, count in stats}
            }

            logger.info(f"任务检查完成，更新了 {updated_count} 个任务")
            return result

        except Exception as e:
            logger.error(f"检查任务状态时出错: {e}")
            db.rollback()
            return {"error": str(e)}
        finally:
            db.close()

# 创建全局实例
task_monitor_service = TaskMonitorService()