"""
自定义异常类
"""
from typing import Optional


class BaseAppException(Exception):
    """应用基础异常"""
    def __init__(self, message: str, code: Optional[str] = None):
        self.message = message
        self.code = code
        super().__init__(message)


class AuthenticationError(BaseAppException):
    """认证错误"""
    def __init__(self, message: str = "认证失败"):
        super().__init__(message, "AUTH_ERROR")


class AuthorizationError(BaseAppException):
    """授权错误"""
    def __init__(self, message: str = "权限不足"):
        super().__init__(message, "PERMISSION_DENIED")


class InsufficientCreditsError(BaseAppException):
    """积分不足错误"""
    def __init__(self, message: str = "积分不足"):
        super().__init__(message, "INSUFFICIENT_CREDITS")


class ValidationError(BaseAppException):
    """数据验证错误"""
    def __init__(self, message: str = "数据验证失败"):
        super().__init__(message, "VALIDATION_ERROR")


class NotFoundError(BaseAppException):
    """资源不存在错误"""
    def __init__(self, message: str = "资源不存在"):
        super().__init__(message, "NOT_FOUND")


class InternalServerError(BaseAppException):
    """服务器内部错误"""
    def __init__(self, message: str = "服务器内部错误"):
        super().__init__(message, "INTERNAL_ERROR")


class ExternalServiceError(BaseAppException):
    """外部服务错误"""
    def __init__(self, message: str = "外部服务错误", service: Optional[str] = None):
        super().__init__(message, "EXTERNAL_SERVICE_ERROR")
        self.service = service


class DatabaseError(BaseAppException):
    """数据库错误"""
    def __init__(self, message: str = "数据库操作失败"):
        super().__init__(message, "DATABASE_ERROR")