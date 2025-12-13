from fastapi import APIRouter, HTTPException
from app.services.oss_service import oss_service

router = APIRouter(prefix="/oss", tags=["OSS"])


@router.get("/sts-token")
async def get_sts_token():
    """获取 OSS STS 临时凭证"""
    try:
        return await oss_service.get_sts_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 STS 凭证失败: {str(e)}")
