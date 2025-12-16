from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class AnalysisTask(Base):
    __tablename__ = "analysis_tasks"

    id = Column(Integer, primary_key=True, index=True)

    # 关联用户
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True, comment="用户ID")

    # 视频信息
    video_url = Column(String(500), nullable=False, comment="视频URL")
    video_name = Column(String(200), nullable=True, comment="视频名称")
    video_size = Column(Integer, nullable=True, comment="视频大小（字节）")
    video_duration = Column(Integer, nullable=True, comment="视频时长（秒）")

    # 分析配置
    model_id = Column(String(50), nullable=False, comment="使用的模型ID")
    enable_thinking = Column(String(10), default="false", comment="是否启用思考模式")
    prompt = Column(Text, nullable=True, comment="自定义提示词")

    # 分析结果
    status = Column(String(20), default="pending", comment="任务状态: pending, processing, completed, failed")
    result = Column(JSON, nullable=True, comment="分析结果JSON")
    error_message = Column(Text, nullable=True, comment="错误信息")

    # 消耗点数
    credits_used = Column(Integer, default=0, comment="消耗的点数")

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now(), comment="创建时间")
    started_at = Column(DateTime(timezone=True), nullable=True, comment="开始处理时间")
    completed_at = Column(DateTime(timezone=True), nullable=True, comment="完成时间")

    # 关系
    user = relationship("User", back_populates="analysis_tasks")