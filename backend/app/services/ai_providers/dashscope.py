import json
import logging
import time
from typing import Dict, Any, AsyncGenerator
from http import HTTPStatus
from .base import AIProviderBase, AIProviderConfig
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

# 尝试导入 dashscope
try:
    import dashscope
    from dashscope import MultiModalConversation
    DASHSCOPE_AVAILABLE = True
except ImportError:
    logger.warning("DashScope SDK 未安装，阿里云官方 SDK 实现将不可用")
    DASHSCOPE_AVAILABLE = False
    dashscope = None
    MultiModalConversation = None

class DashscopeProvider(AIProviderBase):
    """阿里云 DashScope 提供者（使用官方 SDK）"""

    @property
    def provider_name(self) -> str:
        return "阿里云"

    async def initialize(self):
        """初始化 DashScope 配置"""
        if not DASHSCOPE_AVAILABLE:
            raise ImportError("DashScope SDK 未安装，请运行: uv pip install dashscope")
        dashscope.api_key = self.config.api_key

    async def analyze_video_stream(
        self,
        video_url: str,
        prompt: str,
        enable_thinking: bool = False,
        thinking_params: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """流式分析视频"""
        if not dashscope.api_key:
            await self.initialize()

        start_time = time.perf_counter()

        # 构建消息（DashScope 格式）
        # DashScope 使用 image 字段来传入视频
        messages = [
            {
                "role": "system",
                "content": [
                    {"text": "你是一个专业的视频分析助手。"}
                ]
            },
            {
                "role": "user",
                "content": [
                    {"image": video_url},  # DashScope 使用 image 字段
                    {"text": prompt}
                ]
            }
        ]

        # DashScope 不支持思考模式，忽略相关参数
        if enable_thinking:
            logger.info("[DashScope] 暂不支持思考模式，将以普通模式运行")

        try:
            # DashScope 调用是同步的，需要在线程池中执行
            import asyncio
            loop = asyncio.get_event_loop()

            # 使用 run_in_executor 将同步调用转为异步
            response = await loop.run_in_executor(
                None,
                lambda: MultiModalConversation.call(
                    model=self.config.name,  # 如 qwen-vl-plus, qwen-vl-max
                    messages=messages,
                    stream=True
                )
            )

            if response.status_code != HTTPStatus.OK:
                logger.error(f"DashScope API 错误: {response.message}")
                raise Exception(f"DashScope API 调用失败: {response.message}")

            # 处理流式响应
            full_content = ""

            # DashScope 的流式响应需要特殊处理
            # 由于 SDK 的流式响应实现可能不同，这里提供一个兼容的处理方式
            if hasattr(response, 'output') and response.output:
                # 非流式响应的处理
                content = response.output.choices[0].message.content
                yield {"type": "content", "data": content}
                yield {"type": "done", "data": content}
            else:
                # 尝试处理流式响应
                # 注意：DashScope SDK 的流式实现可能需要特殊处理
                # 这里提供一个基本的框架
                try:
                    # 如果 response 是可迭代的
                    if hasattr(response, '__iter__'):
                        for chunk in response:
                            if chunk.status_code == HTTPStatus.OK:
                                if hasattr(chunk, 'output') and chunk.output:
                                    if hasattr(chunk.output, 'choices'):
                                        for choice in chunk.output.choices:
                                            if hasattr(choice, 'message') and choice.message:
                                                content = choice.message.content
                                                if content:
                                                    full_content += content
                                                    yield {"type": "content", "data": content}
                            else:
                                logger.error(f"DashScope 流式响应错误: {chunk.message}")
                                raise Exception(f"流式响应错误: {chunk.message}")

                        if full_content:
                            yield {"type": "done", "data": full_content}
                    else:
                        # 单次响应
                        if hasattr(response, 'output') and response.output:
                            content = response.output.choices[0].message.content
                            yield {"type": "content", "data": content}
                            yield {"type": "done", "data": content}
                        else:
                            yield {"type": "done", "data": ""}
                except Exception as e:
                    logger.warning(f"DashScope 流式处理失败，尝试非流式: {str(e)}")
                    # 降级到非流式调用
                    response = await loop.run_in_executor(
                        None,
                        lambda: MultiModalConversation.call(
                            model=self.config.name,
                            messages=messages
                        )
                    )

                    if response.status_code == HTTPStatus.OK:
                        content = response.output.choices[0].message.content
                        yield {"type": "content", "data": content}
                        yield {"type": "done", "data": content}
                    else:
                        raise Exception(f"DashScope 调用失败: {response.message}")

        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"[DashScope] 视频分析失败 model={self.config.name} "
                f"耗时={elapsed_ms}ms error={str(e)}"
            )
            raise

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        logger.info(
            f"[DashScope] 视频分析完成 model={self.config.name} "
            f"耗时={elapsed_ms}ms"
        )

    def get_provider_info(self) -> Dict[str, Any]:
        """获取提供者信息"""
        return {
            "provider": self.provider_name,
            "model": self.config.name,
            "use_official_sdk": True,
            "supports_thinking": False,  # DashScope 不支持思考模式
            "supports_video": True,
            "streaming": True,  # SDK 支持但可能有限制
        }

class DashscopeOpenAIProvider(AIProviderBase):
    """阿里云 DashScope 提供者（使用 OpenAI 兼容格式）"""

    @property
    def provider_name(self) -> str:
        return "阿里云 (OpenAI Compatible)"

    async def initialize(self):
        """初始化 OpenAI 客户端"""
        # 阿里云的 OpenAI 兼容端点
        base_url = self.config.base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1"
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

        # 阿里云 DashScope 的思考模式参数是独立的
        try:
            stream = await self._client.chat.completions.create(
                model=self.config.name,
                messages=messages,
                stream=True,
                enable_thinking=enable_thinking  # 独立的参数
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"[阿里云 OpenAI] API 调用失败 model={self.config.name} "
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
                f"[阿里云 OpenAI] 视频分析完成 model={self.config.name} "
                f"耗时={elapsed_ms}ms 长度={len(full_content)}"
            )
        except Exception as e:
            logger.error(f"[阿里云 OpenAI] 流式处理错误: {str(e)}")
            raise

    def get_provider_info(self) -> Dict[str, Any]:
        """获取提供者信息"""
        return {
            "provider": self.provider_name,
            "model": self.config.name,
            "base_url": self.config.base_url,
            "use_official_sdk": False,  # 使用 OpenAI 兼容格式
            "supports_thinking": True,  # OpenAI 兼容格式支持思考模式
            "thinking_param": "enable_thinking: boolean (独立参数)",  # 参数格式说明
            "supports_video": True,
            "streaming": True,
        }