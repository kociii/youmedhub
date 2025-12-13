from openai import AsyncOpenAI
from app.services.model_service import ModelService
from typing import List, Dict, AsyncGenerator
import json
import logging
import time

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.clients = {}

    def get_client_and_config(self, model_id: str):
        config = ModelService.get_model_config(model_id)
        if not config:
            raise ValueError(f"模型 {model_id} 不存在或未激活")

        if not config.get("api_key"):
            raise ValueError(f"模型 {model_id} 未配置 API Key")

        if model_id not in self.clients:
            self.clients[model_id] = AsyncOpenAI(
                api_key=config["api_key"],
                base_url=config["base_url"]
            )

        return self.clients[model_id], config

    async def analyze_video_stream(
        self,
        video_url: str,
        model_id: str,
        enable_thinking: bool = False
    ) -> AsyncGenerator[Dict, None]:
        start_time = time.perf_counter()
        client, config = self.get_client_and_config(model_id)

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

        extra_body = {}
        if enable_thinking and config.get("thinking_params"):
            try:
                extra_body = json.loads(config["thinking_params"])
            except:
                pass

        logger.info(
            "ai_stream start model_id=%s model_name=%s base_url=%s enable_thinking=%s extra_body_keys=%s video_url=%s",
            model_id,
            config.get("name"),
            config.get("base_url"),
            enable_thinking,
            list(extra_body.keys()) if isinstance(extra_body, dict) else [],
            video_url,
        )

        # 根据模型类型构建消息内容
        content = []
        model_name_lower = config.get("name", "").lower()

        # Qwen-VL 系列使用 type: video
        if "qwen" in model_name_lower:
            content.append({"type": "video", "video": video_url})
        # GLM 系列使用 type: video_url
        elif "glm" in model_name_lower:
            content.append({"type": "video_url", "video_url": video_url})
        else:
            # 其他模型尝试使用标准的 video_url 格式
            content.append({"type": "video_url", "video_url": {"url": video_url}})

        content.append({"type": "text", "text": prompt})

        try:
            logger.info(
                "ai_stream calling API model_id=%s model_name=%s stream=True extra_body=%s content=%s",
                model_id,
                config["name"],
                extra_body,
                content,
            )
            stream = await client.chat.completions.create(
                model=config["name"],
                messages=[
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                stream=True,
                extra_body=extra_body
            )
            logger.info("ai_stream API call created, starting to iterate stream model_id=%s", model_id)
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.exception(
                "ai_stream create failed model_id=%s elapsed_ms=%s: %s",
                model_id,
                elapsed_ms,
                str(e),
            )
            raise

        full_content = ""
        chunks = 0
        first_chunk_time = None
        try:
            async for chunk in stream:
                chunks += 1
                if chunks == 1:
                    first_chunk_time = time.perf_counter()
                    logger.info(
                        "ai_stream first_chunk model_id=%s elapsed_ms=%s",
                        model_id,
                        int((first_chunk_time - start_time) * 1000),
                    )

                if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_content += content
                    logger.debug(
                        "ai_stream chunk model_id=%s chunk_num=%s content_len=%s",
                        model_id,
                        chunks,
                        len(content),
                    )
                    yield {"type": "content", "data": content}

            yield {"type": "done", "data": full_content}
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            preview = full_content[:500]
            logger.info(
                "ai_stream done model_id=%s chunks=%s content_len=%s elapsed_ms=%s preview=%s",
                model_id,
                chunks,
                len(full_content),
                elapsed_ms,
                preview,
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.exception(
                "ai_stream error model_id=%s chunks=%s elapsed_ms=%s: %s",
                model_id,
                chunks,
                elapsed_ms,
                str(e),
            )
            raise

ai_service = AIService()
