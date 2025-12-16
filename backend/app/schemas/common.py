"""
通用响应模型
"""
from typing import Generic, TypeVar, Optional, Any, List
from pydantic import BaseModel

T = TypeVar('T')


class APIResponse(BaseModel, Generic[T]):
    """统一的API响应格式"""
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    code: Optional[str] = None

    class Config:
        json_encoders = {
            # 添加需要的编码器
        }


class PaginationInfo(BaseModel):
    """分页信息"""
    total: int
    page: int
    size: int
    pages: int


class PaginatedResponse(BaseModel, Generic[T]):
    """带分页的响应"""
    success: bool = True
    data: List[T]
    pagination: PaginationInfo
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """错误响应"""
    success: bool = False
    error: dict


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    timestamp: str
    version: str