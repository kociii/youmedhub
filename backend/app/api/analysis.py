from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from app.schemas.analysis import UploadResponse, AnalysisRequest, AnalysisResponse, VideoMeta
from app.services.upload_service import upload_service
from app.services.ai_service import ai_service
from pydantic import BaseModel, ConfigDict
import uuid
import json
import logging
import time

router = APIRouter(prefix="/api/analysis", tags=["视频分析"])

logger = logging.getLogger(__name__)

class StreamAnalysisRequest(BaseModel):
    # Pydantic v2 默认会保护 `model_` 命名空间，`model_id` 会触发告警；这里显式放开。
    model_config = ConfigDict(protected_namespaces=())

    video_url: str
    model_id: str
    enable_thinking: bool = False

@router.post("/upload", response_model=UploadResponse, summary="上传视频")
async def upload_video(file: UploadFile = File(...)):
    """
    上传视频文件到云端存储（tmpfile.link）

    - **file**: 视频文件（支持 MP4, MOV, AVI 等格式）
    - **限制**: 最大 100MB
    - **返回**: 视频 URL 和元数据
    """
    if not file.content_type.startswith("video/"):
        raise HTTPException(400, "只支持视频文件")

    content = await file.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(400, "文件大小不能超过100MB")

    result = await upload_service.upload_to_tmpfile(content, file.filename)
    return UploadResponse(
        url=result["url"],
        meta=VideoMeta(**result["meta"])
    )

@router.post("/stream", summary="流式分析视频")
async def stream_analysis(request: StreamAnalysisRequest):
    """
    使用 AI 模型流式分析视频并生成分镜脚本

    - **video_url**: 视频 URL
    - **model_id**: 模型 ID
    - **enable_thinking**: 是否启用思考模式（仅 Qwen 支持）
    - **返回**: SSE 流式响应
    """
    async def generate():
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        logger.info(
            "stream_analysis start request_id=%s model_id=%s enable_thinking=%s video_url=%s",
            request_id,
            request.model_id,
            request.enable_thinking,
            request.video_url,
        )
        try:
            chunks = 0
            first_chunk_logged = False
            async for chunk in ai_service.analyze_video_stream(
                request.video_url,
                request.model_id,
                request.enable_thinking
            ):
                chunks += 1
                if not first_chunk_logged:
                    first_chunk_logged = True
                    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                    logger.info(
                        "stream_analysis first_chunk request_id=%s elapsed_ms=%s chunk_type=%s",
                        request_id,
                        elapsed_ms,
                        chunk.get("type") if isinstance(chunk, dict) else type(chunk).__name__,
                    )
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.info(
                "stream_analysis done request_id=%s chunks=%s elapsed_ms=%s",
                request_id,
                chunks,
                elapsed_ms,
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.exception(
                "stream_analysis error request_id=%s elapsed_ms=%s: %s",
                request_id,
                elapsed_ms,
                str(e),
            )
            yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
