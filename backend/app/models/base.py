from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class TimestampMixin:
    """添加创建时间和更新时间字段的混入类"""
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class BaseModel(Base, TimestampMixin):
    """所有模型的基础类"""
    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True)