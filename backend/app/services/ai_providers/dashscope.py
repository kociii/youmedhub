import json
import logging
import time
from typing import Dict, Any, AsyncGenerator
from http import HTTPStatus
from .base import AIProviderBase, AIProviderConfig

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
        # DashScope 使用 video 字段来传入视频
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
                    {"video": video_url},  # DashScope 支持 video 字段
                    {"text": prompt}
                ]
            }
        ]

        # DashScope 思考模式参数
        # 直接根据 enable_thinking 传递，由模型自己判断是否支持

        try:
            # DashScope 调用是同步的，需要在线程池中执行
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            loop = asyncio.get_event_loop()
            executor = ThreadPoolExecutor(max_workers=1)

            # 创建队列用于在线程和主线程间传递数据
            queue = asyncio.Queue()

            def process_sync_stream():
                """在单独线程中处理同步流"""
                logger.info(f"[DashScope] 开始处理流式响应 model={self.config.name}")
                chunk_count = 0

                try:
                    # 创建流式调用
                    responses = MultiModalConversation.call(
                        model=self.config.name,
                        messages=messages,
                        stream=True,
                        incremental_output=True,
                        enable_thinking=enable_thinking,
                        max_tokens=8192
                    )

                    # 处理流式响应
                    for response in responses:
                        chunk_count += 1
                        logger.debug(f"[DashScope] 收到 chunk {chunk_count}")

                        # 检查响应状态
                        if response.status_code != HTTPStatus.OK:
                            logger.error(f"DashScope 流式响应错误: {response.message}")
                            asyncio.run_coroutine_threadsafe(
                                queue.put(('error', Exception(f"流式响应错误: {response.message}"))),
                                loop
                            )
                            break

                        # 获取消息对象
                        message = response.output.choices[0].message

                        # 处理思考内容
                        try:
                            reasoning_content = getattr(message, 'reasoning_content', None)
                            if reasoning_content:
                                logger.debug(f"[DashScope] 思考内容: {reasoning_content[:20]}...")
                                asyncio.run_coroutine_threadsafe(queue.put(('thinking', reasoning_content)), loop)
                        except Exception as e:
                            logger.debug(f"无法访问 reasoning_content: {str(e)}")

                        # 获取回复内容
                        if message.content:
                            content_list = message.content
                            if isinstance(content_list, list) and len(content_list) > 0:
                                text_content = content_list[0].get('text', '')
                                if text_content:
                                    logger.debug(f"[DashScope] 输出内容片段: {text_content[:20]}... (长度: {len(text_content)})")
                                    asyncio.run_coroutine_threadsafe(queue.put(('content', text_content)), loop)

                    logger.info(f"[DashScope] 流处理完成，总chunk数: {chunk_count}")
                except Exception as e:
                    logger.error(f"[DashScope] 同步流处理错误: {str(e)}")
                    asyncio.run_coroutine_threadsafe(queue.put(('error', e)), loop)
                finally:
                    asyncio.run_coroutine_threadsafe(queue.put(('done', None)), loop)

            # 在线程池中启动处理
            future = executor.submit(process_sync_stream)

            # 从队列中读取并yield每个内容块
            full_content = ""
            try:
                while True:
                    try:
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
                        if future.done():
                            continue
            finally:
                executor.shutdown(wait=False)

        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(
                f"[DashScope] 视频分析失败 model={self.config.name} "
                f"耗时={elapsed_ms}ms error={str(e)}"
            )
            # 如果流式处理失败，尝试非流式调用
            try:
                logger.warning(f"DashScope 流式处理失败，尝试非流式: {str(e)}")
                # 如果流式处理失败，尝试非流式调用
                response = await loop.run_in_executor(
                    None,
                    lambda: MultiModalConversation.call(
                        model=self.config.name,
                        messages=messages,
                        stream=False,
                        enable_thinking=enable_thinking,
                        max_tokens=8192  # 设置最大输出 token 数
                    )
                )

                if response.status_code == HTTPStatus.OK:
                    # 获取消息对象
                    message = response.output.choices[0].message

                    # 处理思考内容（如果存在）
                    # 使用 try-except 安全地访问 reasoning_content 属性
                    try:
                        reasoning_content = getattr(message, 'reasoning_content', None)
                        if reasoning_content:
                            yield {"type": "thinking", "data": reasoning_content}
                    except Exception as e:
                        # 如果访问 reasoning_content 出错，忽略并继续
                        logger.debug(f"无法访问 reasoning_content: {str(e)}")

                    # 非流式响应的 content 格式与流式相同
                    if message.content:
                        content_list = message.content
                        if isinstance(content_list, list) and len(content_list) > 0:
                            text_content = content_list[0].get('text', '')
                            yield {"type": "content", "data": text_content}
                            yield {"type": "done", "data": text_content}
                        else:
                            yield {"type": "done", "data": ""}
                    else:
                        yield {"type": "done", "data": ""}
                else:
                    raise Exception(f"DashScope 调用失败: {response.message}")
            except Exception as fallback_error:
                logger.error(f"非流式调用也失败: {str(fallback_error)}")
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
            "supports_thinking": True,
            "supports_video": True,
            "streaming": True,
        }

