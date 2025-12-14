import json
import logging
import time
from typing import Dict, Any, AsyncGenerator
from .base import AIProviderBase, AIProviderConfig
from zai import ZhipuAiClient

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

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

        # 智谱的思考模式参数（默认禁用）
        thinking = {"type": "disabled"}  # 默认禁用思考模式
        if enable_thinking:
            thinking = {"type": "enabled"}  # 启用深度思考模式

        try:
            # 调用智谱 API
            stream = self._client.chat.completions.create(
                model=self.config.name,
                messages=messages,
                thinking=thinking,
                stream=True,
                max_tokens=8192  # 设置最大输出 token 数
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"智谱 API 调用失败 model={self.config.name} "
                f"elapsed_ms={elapsed_ms} error={str(e)}"
            )
            raise

        # 处理流式响应
        # 使用线程来处理同步流，实现真正的异步输出
        try:
            import asyncio
            import threading
            from concurrent.futures import ThreadPoolExecutor
            loop = asyncio.get_event_loop()
            executor = ThreadPoolExecutor(max_workers=1)

            # 创建一个asyncio队列用于在线程和主线程间传递数据
            queue = asyncio.Queue()

            def process_sync_stream():
                """在单独线程中处理同步流"""
                try:
                    for chunk in stream:
                        if not chunk.choices:
                            continue

                        delta = chunk.choices[0].delta
                        if not delta:
                            continue

                        # 处理思考内容
                        if hasattr(delta, 'reasoning_content') and delta.reasoning_content:
                            asyncio.run_coroutine_threadsafe(queue.put(('thinking', delta.reasoning_content)), loop)

                        # 处理增量内容
                        if hasattr(delta, 'content') and delta.content:
                            asyncio.run_coroutine_threadsafe(queue.put(('content', delta.content)), loop)

                        # 检查是否完成
                        if hasattr(chunk.choices[0], 'finish_reason') and chunk.choices[0].finish_reason:
                            break

                except Exception as e:
                    logger.error(f"[智谱] 同步流处理错误: {str(e)}")
                    asyncio.run_coroutine_threadsafe(queue.put(('error', e)), loop)
                finally:
                    asyncio.run_coroutine_threadsafe(queue.put(('done', None)), loop)

            # 在线程池中启动处理（不等待完成）
            future = executor.submit(process_sync_stream)

            # 从队列中读取并yield每个内容块
            full_content = ""
            try:
                while True:
                    try:
                        # 短超时，以便快速响应
                        msg_type, data = await asyncio.wait_for(queue.get(), timeout=0.1)

                        if msg_type == 'thinking':
                            yield {"type": "thinking", "data": data}
                        elif msg_type == 'content':
                            full_content += data
                            yield {"type": "content", "data": data}
                        elif msg_type == 'error':
                            raise data
                        elif msg_type == 'done':
                            yield {"type": "done", "data": full_content}
                            break

                    except asyncio.TimeoutError:
                        # 检查线程是否还在运行
                        if future.done():
                            # 线程已完成，但队列中可能还有数据
                            continue
                        # 线程还在运行，继续等待
            finally:
                # 清理线程池
                executor.shutdown(wait=False)


        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"[智谱] 流式处理错误 model={self.config.name} "
                f"耗时={elapsed_ms}ms error={str(e)}"
            )
            raise

    def get_provider_info(self) -> Dict[str, Any]:
        """获取提供者信息"""
        return {
            "provider": self.provider_name,
            "model": self.config.name,
            "supports_thinking": True,
            "supports_video": True,
            "streaming": True,
        }

