from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import HTTPException, status
from app.core.config import settings

def verify_token(token: str) -> dict:
    """验证 JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

class JWTAuthenticationMiddleware:
    """JWT 认证中间件"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # 只处理 HTTP 请求
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 获取请求路径
        path = scope.get("path", "")

        # 跳过不需要认证的路径
        skip_paths = [
            "/api/auth/login",
            "/api/auth/register",
            "/docs",
            "/openapi.json",
            "/favicon.ico",
            "/",
            "/api/system/config"
        ]

        if any(path.startswith(skip_path) or path == skip_path):
            await self.app(scope, receive, send)
            return

        # 获取 Authorization header
        headers = dict(scope.get("headers", []))
        auth_header = headers.get(b"authorization", b"")

        if not auth_header:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 检查 Bearer token 格式
        if not auth_header.startswith(b"Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials format",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = auth_header.decode().split(" ")[1]

        # 验证 token
        payload = verify_token(token)

        # 检查 token 是否过期
        exp = payload.get("exp")
        if exp and datetime.fromtimestamp(exp) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 将用户信息添加到 scope
        scope["user_id"] = payload.get("sub")

        await self.app(scope, receive, send)