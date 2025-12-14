from fastapi import APIRouter, HTTPException
from app.services.ai_providers import get_provider, AIProviderConfig
from pydantic import BaseModel

router = APIRouter(prefix="/api/test", tags=["测试"])

class TestProviderRequest(BaseModel):
    """测试提供者请求"""
    provider: str
    name: str
    api_key: str
    base_url: str = ""
    use_official_sdk: bool = True
    video_url: str
    prompt: str

@router.post("/test-provider")
async def test_provider(request: TestProviderRequest):
    """测试 AI 提供者"""
    try:
        # 创建配置
        config = AIProviderConfig(
            model_id="test",
            name=request.name,
            provider=request.provider,
            api_key=request.api_key,
            base_url=request.base_url,
            use_official_sdk=request.use_official_sdk
        )

        # 获取提供者
        provider = get_provider(request.provider, config)
        await provider.initialize()

        # 获取提供者信息
        provider_info = provider.get_provider_info()

        # 返回结果
        return {
            "success": True,
            "provider_info": provider_info,
            "messages": provider.build_messages(request.video_url, request.prompt)
        }

    except Exception as e:
        raise HTTPException(500, f"测试失败: {str(e)}")