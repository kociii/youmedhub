import json
import logging
import time
from typing import Dict, Any, AsyncGenerator
from .base import AIProviderBase, AIProviderConfig
from zai import ZhipuAiClient
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class ZhipuProvider(AIProviderBase):
    """智谱 AI 提供者（使用官方 SDK）"""

    @property
    def provider_name(self) -> str:
        return "智谱"

    async def initialize(self):
        """初始化智谱客户端"""
        self._client = ZhipuAiClient(api_key=self.config.api_key)

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

        # 构建消息（GLM 格式）
        messages = self.build_messages(video_url, prompt, "glm")

        # 智谱的思考模式参数
        thinking = None
        if enable_thinking:
            thinking = {"type": "enabled"}  # 启用深度思考模式

        try:
            # 调用智谱 API
            stream = self._client.chat.completions.create(
                model=self.config.name,
                messages=messages,
                thinking=thinking,
                stream=True
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"智谱 API 调用失败 model={self.config.name} "
                f"elapsed_ms={elapsed_ms} error={str(e)}"
            )
            raise

        # 处理流式响应
        full_content = ""
        try:
            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta:
                    delta_content = chunk.choices[0].delta.content
                    if delta_content:
                        full_content += delta_content
                        yield {"type": "content", "data": delta_content}

            yield {"type": "done", "data": full_content}
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.info(
                f"[智谱] 视频分析完成 model={self.config.name} "
                f"耗时={elapsed_ms}ms 长度={len(full_content)}"
            )
        except Exception as e:
            logger.error(f"智谱流式处理错误: {str(e)}")
            raise

    def get_provider_info(self) -> Dict[str, Any]:
        """获取提供者信息"""
        return {
            "provider": self.provider_name,
            "model": self.config.name,
            "use_official_sdk": True,
            "supports_thinking": True,
            "thinking_param": "thinking: {type: 'enabled'|'disabled'} (独立参数)",  # 参数格式说明
            "supports_video": True,
            "streaming": True,
        }

class ZhipuOpenAIProvider(AIProviderBase):
    """智谱 AI 提供者（使用 OpenAI 兼容格式）"""

    @property
    def provider_name(self) -> str:
        return "智谱 (OpenAI Compatible)"

    async def initialize(self):
        """初始化 OpenAI 客户端"""
        # 智谱的 OpenAI 兼容端点
        base_url = self.config.base_url or "https://open.bigmodel.cn/api/paas/v4"
        self._client = AsyncOpenAI(
            api_key=self.config.api_key,
            base_url=base_url
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

        # 智谱的思考模式参数是独立的
        thinking = None
        if enable_thinking:
            thinking = {
                "type": "enabled"  # 启用深度思考模式
            }

        try:
            stream = await self._client.chat.completions.create(
                model=self.config.name,
                messages=messages,
                stream=True,
                thinking=thinking  # 独立的参数
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"[智谱 OpenAI] API 调用失败 model={self.config.name} "
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
                f"[智谱 OpenAI] 视频分析完成 model={self.config.name} "
                f"耗时={elapsed_ms}ms 长度={len(full_content)}"
            )
        except Exception as e:
            logger.error(f"[智谱 OpenAI] 流式处理错误: {str(e)}")
            raise

    def get_provider_info(self) -> Dict[str, Any]:
        """获取提供者信息"""
        return {
            "provider": self.provider_name,
            "model": self.config.name,
            "base_url": self.config.base_url,
            "use_official_sdk": False,  # 使用 OpenAI 兼容格式
            "supports_thinking": True,
            "thinking_param": "thinking: {type: 'enabled'|'disabled'} (独立参数)",  # 参数格式说明
            "supports_video": True,
            "streaming": True,
        }