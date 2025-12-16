"""
全局错误处理中间件
"""
import time
import traceback
from typing import Callable
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from jose import JWTError
from app.core.logging import get_logger, create_request_logger
from app.core.exceptions import BaseAppException

logger = get_logger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """错误处理中间件"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 创建请求ID
        request_id = str(int(time.time() * 1000))[-6:]
        request.state.request_id = request_id

        # 创建带有请求上下文的日志记录器
        request_logger = create_request_logger(
            logger,
            request_id=request_id,
            method=request.method,
            url=str(request.url)
        )

        start_time = time.perf_counter()

        try:
            # 记录请求开始
            request_logger.info(
                "Request started",
                extra={
                    "method": request.method,
                    "url": str(request.url),
                    "client_ip": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent")
                }
            )

            # 执行请求
            response = await call_next(request)

            # 计算响应时间
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            # 记录请求完成
            request_logger.info(
                "Request completed",
                extra={
                    "status_code": response.status_code,
                    "elapsed_ms": elapsed_ms
                }
            )

            # 添加响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{elapsed_ms}ms"

            return response

        except BaseAppException as e:
            # 应用自定义异常
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            request_logger.error(
                f"Application error: {e.message}",
                extra={
                    "error_code": e.code,
                    "elapsed_ms": elapsed_ms
                }
            )

            return JSONResponse(
                status_code=self._get_status_code_for_exception(e),
                content={
                    "success": False,
                    "error": {
                        "code": e.code or "UNKNOWN_ERROR",
                        "message": e.message,
                        "request_id": request_id
                    }
                }
            )

        except StarletteHTTPException as e:
            # HTTP异常
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            request_logger.warning(
                f"HTTP error: {e.detail}",
                extra={
                    "status_code": e.status_code,
                    "elapsed_ms": elapsed_ms
                }
            )

            return JSONResponse(
                status_code=e.status_code,
                content={
                    "success": False,
                    "error": {
                        "code": "HTTP_ERROR",
                        "message": e.detail,
                        "request_id": request_id
                    }
                }
            )

        except JWTError as e:
            # JWT错误
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            request_logger.warning(
                f"JWT error: {str(e)}",
                extra={
                    "elapsed_ms": elapsed_ms
                }
            )

            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "success": False,
                    "error": {
                        "code": "INVALID_TOKEN",
                        "message": "无效的访问令牌",
                        "request_id": request_id
                    }
                }
            )

        except IntegrityError as e:
            # 数据库完整性错误
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            request_logger.error(
                f"Database integrity error: {str(e)}",
                extra={
                    "elapsed_ms": elapsed_ms,
                    "detail": str(e.orig)
                }
            )

            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": {
                        "code": "DATABASE_INTEGRITY_ERROR",
                        "message": "数据完整性约束错误",
                        "request_id": request_id
                    }
                }
            )

        except OperationalError as e:
            # 数据库操作错误
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            request_logger.error(
                f"Database operational error: {str(e)}",
                extra={
                    "elapsed_ms": elapsed_ms,
                    "detail": str(e.orig)
                }
            )

            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "success": False,
                    "error": {
                        "code": "DATABASE_ERROR",
                        "message": "数据库服务不可用",
                        "request_id": request_id
                    }
                }
            )

        except SQLAlchemyError as e:
            # 其他SQLAlchemy错误
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            request_logger.error(
                f"Database error: {str(e)}",
                extra={
                    "elapsed_ms": elapsed_ms
                }
            )

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": {
                        "code": "DATABASE_ERROR",
                        "message": "数据库操作失败",
                        "request_id": request_id
                    }
                }
            )

        except Exception as e:
            # 未捕获的异常
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            request_logger.error(
                f"Unhandled exception: {str(e)}",
                extra={
                    "elapsed_ms": elapsed_ms,
                    "traceback": traceback.format_exc()
                }
            )

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "服务器内部错误" if not __debug__ else str(e),
                        "request_id": request_id
                    }
                }
            )

    def _get_status_code_for_exception(self, exc: BaseAppException) -> int:
        """根据异常类型返回对应的HTTP状态码"""
        if isinstance(exc, AuthenticationError):
            return status.HTTP_401_UNAUTHORIZED
        elif isinstance(exc, AuthorizationError):
            return status.HTTP_403_FORBIDDEN
        elif isinstance(exc, InsufficientCreditsError):
            return status.HTTP_402_PAYMENT_REQUIRED
        elif isinstance(exc, ValidationError):
            return status.HTTP_400_BAD_REQUEST
        elif isinstance(exc, NotFoundError):
            return status.HTTP_404_NOT_FOUND
        elif isinstance(exc, ExternalServiceError):
            return status.HTTP_503_SERVICE_UNAVAILABLE
        elif isinstance(exc, DatabaseError):
            return status.HTTP_500_INTERNAL_SERVER_ERROR
        else:
            return status.HTTP_500_INTERNAL_SERVER_ERROR