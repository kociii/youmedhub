"""
日志配置
"""
import os
import logging
import logging.handlers
import sys
import json
import uuid
from pathlib import Path
from typing import Any, Dict
from datetime import datetime


class JSONFormatter(logging.Formatter):
    """JSON 格式的日志格式化器"""

    def format(self, record: logging.LogRecord) -> str:
        """格式化日志记录为 JSON"""
        # 基础日志信息
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # 添加请求ID（如果有）
        if hasattr(record, 'request_id'):
            log_data["request_id"] = record.request_id

        # 添加用户ID（如果有）
        if hasattr(record, 'user_id'):
            log_data["user_id"] = record.user_id

        # 添加额外字段（如果有）
        if hasattr(record, 'extra'):
            log_data.update(record.extra)

        # 添加异常信息（如果有）
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


class RequestFormatter(logging.Formatter):
    """请求格式化器，支持可选的 request_id 字段"""

    def __init__(self, fmt=None, datefmt=None):
        super().__init__(fmt, datefmt)

    def format(self, record):
        # 如果没有 request_id，添加一个默认值
        if not hasattr(record, 'request_id'):
            record.request_id = '-'
        return super().format(record)


def setup_logging():
    """设置应用日志配置"""
    # 创建日志目录
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # 根日志记录器配置
    root_logger = logging.getLogger()
    # 在开发环境使用DEBUG级别
    if os.getenv("DEBUG", "true").lower() == "true":
        root_logger.setLevel(logging.DEBUG)
    else:
        root_logger.setLevel(logging.INFO)

    # 清除默认处理器
    root_logger.handlers.clear()

    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    # 在开发环境使用DEBUG级别
    if os.getenv("DEBUG", "true").lower() == "true":
        console_handler.setLevel(logging.DEBUG)
    else:
        console_handler.setLevel(logging.INFO)

    # 控制台使用简单格式（开发环境）
    if __debug__:
        console_formatter = RequestFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s [%(request_id)s]: %(message)s",
            datefmt="%H:%M:%S"
        )
    else:
        console_formatter = JSONFormatter()

    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    # 通用日志文件处理器（INFO级别）
    file_handler = logging.handlers.RotatingFileHandler(
        filename=log_dir / "app.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    file_formatter = JSONFormatter()
    file_handler.setFormatter(file_formatter)
    root_logger.addHandler(file_handler)

    # 错误日志文件处理器（ERROR级别）
    error_handler = logging.handlers.RotatingFileHandler(
        filename=log_dir / "error.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10,
        encoding="utf-8"
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)
    root_logger.addHandler(error_handler)

    # 设置第三方库的日志级别
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return root_logger


def get_logger(name: str) -> logging.Logger:
    """获取日志记录器"""
    return logging.getLogger(name)


class RequestLoggerAdapter(logging.LoggerAdapter):
    """请求日志适配器，用于添加请求相关的上下文信息"""

    def __init__(self, logger: logging.Logger, extra: Dict[str, Any] = None):
        super().__init__(logger, extra or {})

    def process(self, msg: Any, kwargs: Dict[str, Any]) -> Any:
        """处理日志消息，添加请求上下文"""
        if 'extra' not in kwargs:
            kwargs['extra'] = {}

        # 合并全局extra和局部extra
        kwargs['extra'].update(self.extra)

        return msg, kwargs


def create_request_logger(
    logger: logging.Logger,
    request_id: str = None,
    user_id: str = None,
    **extra
) -> logging.Logger:
    """创建带有请求上下文的日志记录器"""
    # 如果没有提供request_id，生成一个
    if not request_id:
        request_id = str(uuid.uuid4())[:8]

    # 创建日志上下文
    context = {
        "request_id": request_id,
        "user_id": user_id,
        **extra
    }

    return RequestLoggerAdapter(logger, context)


# 预定义的日志记录器
app_logger = get_logger("app")
auth_logger = get_logger("app.auth")
api_logger = get_logger("app.api")
db_logger = get_logger("app.database")
ai_logger = get_logger("app.ai")