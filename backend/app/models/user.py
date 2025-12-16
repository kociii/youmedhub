from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.models.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # 点数系统
    credits = Column(Integer, default=0, nullable=False, comment="用户点数余额")

    # 邀请码
    invite_code = Column(String(20), unique=True, nullable=True, index=True, comment="用户邀请码")
    invited_by = Column(Integer, nullable=True, comment="邀请人ID")

    # 用户状态
    is_active = Column(Boolean, default=True, nullable=False, comment="用户是否激活")
    is_admin = Column(Boolean, default=False, nullable=False, comment="是否为管理员")

    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    analysis_tasks = relationship("AnalysisTask", back_populates="user")
