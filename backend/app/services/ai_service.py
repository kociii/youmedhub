from app.services.model_service import ModelService
from app.services.ai_providers import get_provider, AIProviderConfig
from typing import List, Dict, AsyncGenerator
import json
import logging
import time

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.providers = {}  # 缓存已初始化的提供者实例

    async def get_provider(self, model_id: str):
        """获取 AI 提供者实例"""
        if model_id not in self.providers:
            # 获取模型配置
            config = ModelService.get_model_config(model_id)
            if not config:
                raise ValueError(f"模型 {model_id} 不存在或未激活")

            if not config.get("api_key"):
                raise ValueError(f"模型 {model_id} 未配置 API Key")

            # 创建提供者配置
            provider_config = AIProviderConfig(
                model_id=model_id,
                name=config["name"],
                provider=config["provider"],
                api_key=config["api_key"],
                base_url=config["base_url"],
                use_official_sdk=config.get("use_official_sdk", True)
            )

            # 获取提供者实例
            provider = get_provider(config["provider"], provider_config)

            # 初始化提供者
            await provider.initialize()

            # 缓存提供者
            self.providers[model_id] = provider

        return self.providers[model_id]

    async def analyze_video_stream(
        self,
        video_url: str,
        model_id: str,
        enable_thinking: bool = False
    ) -> AsyncGenerator[Dict, None]:
        start_time = time.perf_counter()

        # 获取模型配置
        config = ModelService.get_model_config(model_id)
        if not config:
            raise ValueError(f"模型 {model_id} 不存在或未激活")

        # 获取提示词
        prompt = config.get("prompt") or """分析这个视频，生成详细的分镜脚本。
请按照以下JSON格式返回结果：
[
  {
    "id": 1,
    "startTime": "00:00",
    "endTime": "00:05",
    "visual": "画面描述",
    "content": "口播内容",
    "audio": "音频/备注"
  }
]
只返回JSON数组，不要其他内容。"""

        # 处理思考模式参数
        thinking_params = None
        if enable_thinking and config.get("thinking_params"):
            try:
                thinking_params = json.loads(config["thinking_params"])
            except:
                logger.warning(f"无效的思考参数: {config['thinking_params']}")
                thinking_params = None

        logger.debug(
            "ai_stream start model_id=%s model_name=%s provider=%s use_official_sdk=%s",
            model_id,
            config.get("name"),
            config.get("provider"),
            config.get("use_official_sdk", True),
        )

        # 获取提供者实例
        provider = await self.get_provider(model_id)

        # 调用提供者的视频分析方法
        try:
            async for chunk in provider.analyze_video_stream(
                video_url=video_url,
                prompt=prompt,
                enable_thinking=enable_thinking,
                thinking_params=thinking_params
            ):
                yield chunk
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.exception(
                f"视频分析失败 model_id={model_id} provider={provider.provider_name} "
                f"elapsed_ms={elapsed_ms} error={str(e)}"
            )
            raise

ai_service = AIService()
