import json
import logging
import time
from typing import Dict, Any, AsyncGenerator
from .base import AIProviderBase, AIProviderConfig
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class OpenAIProvider(AIProviderBase):
    """OpenAI 兼容格式提供者"""

    @property
    def provider_name(self) -> str:
        return "OpenAI Compatible"

    async def initialize(self):
        """初始化 OpenAI 客户端"""
        self._client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=self.config.base_url
        )

    async def analyze_video_stream(
        self,
        video_url: str,
        prompt: str,
        enable_thinking: bool = False,
        thinking_params: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """流式分析视频"""
        if not self._client:
            await self.initialize()

        start_time = time.perf_counter()

        # 构建消息（OpenAI 格式）
        messages = self.build_messages(video_url, prompt, "openai")

        # 处理额外参数
        extra_body = {}
        if enable_thinking and thinking_params:
            extra_body = thinking_params

        try:
            stream = await self._client.chat.completions.create(
                model=self.config.name,
                messages=messages,
                stream=True,
                extra_body=extra_body
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"[OpenAI] API 调用失败 model={self.config.name} "
                f"base_url={self.config.base_url} "
                f"elapsed_ms={elapsed_ms} error={str(e)}"
            )
            raise

        # 处理流式响应
        full_content = ""
        try:
            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    delta = chunk.choices[0].delta.content
                    full_content += delta
                    yield {"type": "content", "data": delta}

            yield {"type": "done", "data": full_content}
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.info(
                f"[OpenAI] 视频分析完成 model={self.config.name} "
                f"耗时={elapsed_ms}ms 长度={len(full_content)}"
            )
        except Exception as e:
            logger.error(f"[OpenAI] 流式处理错误: {str(e)}")
            raise

    def get_provider_info(self) -> Dict[str, Any]:
        """获取提供者信息"""
        return {
            "provider": self.provider_name,
            "model": self.config.name,
            "base_url": self.config.base_url,
            "use_official_sdk": False,  # 使用 OpenAI 兼容格式
            "supports_thinking": True,
            "supports_video": True,
            "streaming": True,
        }