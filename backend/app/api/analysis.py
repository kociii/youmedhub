from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
from app.schemas.analysis import UploadResponse, AnalysisRequest, AnalysisResponse, VideoMeta
from app.services.upload_service import upload_service
from app.services.ai_service import ai_service
from app.api.deps import get_current_user
from app.models.user import User
from app.models.analysis_task import AnalysisTask
from app.database import get_db
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
async def stream_analysis(
    request: StreamAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    使用 AI 模型流式分析视频并生成分镜脚本

    - **video_url**: 视频 URL
    - **model_id**: 模型 ID
    - **enable_thinking**: 是否启用思考模式（仅 Qwen 支持）
    - **返回**: SSE 流式响应
    - **需要认证**: 用户必须登录才能使用此功能
    """
    # 检查用户点数（基础分析消耗5点）
    if current_user.credits < 5:
        raise HTTPException(
            status_code=402,
            detail="点数不足，请充值后再使用分析功能"
        )

    # 创建分析任务记录
    task = AnalysisTask(
        user_id=current_user.id,
        video_url=request.video_url,
        model_id=request.model_id,
        enable_thinking=str(request.enable_thinking).lower(),
        status="pending",
        credits_used=5
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # 保存需要的信息，避免在异步生成器中访问已关闭的会话
    user_id = current_user.id
    task_id = task.id
    video_url = request.video_url
    model_id = request.model_id
    enable_thinking = request.enable_thinking

    async def generate():
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        print(f"\n{'='*60}")
        print(f"[分析请求] user_id: {user_id}")
        print(f"[分析请求] task_id: {task_id}")
        print(f"[分析请求] model_id: {model_id}")
        print(f"[分析请求] video_url: {video_url}")
        print(f"[分析请求] enable_thinking: {enable_thinking}")
        print(f"{'='*60}\n")
        logger.info(
            "stream_analysis start request_id=%s user_id=%s task_id=%s model_id=%s enable_thinking=%s video_url=%s",
            request_id,
            user_id,
            task_id,
            model_id,
            enable_thinking,
            video_url,
        )

        # 更新任务状态为处理中
        task.status = "processing"
        task.started_at = datetime.utcnow()
        db.commit()

        result_data = []
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
                logger.debug(
                    "stream_analysis yielding chunk request_id=%s chunk_num=%s",
                    request_id,
                    chunks,
                )

                # 收集结果数据
                if isinstance(chunk, dict):
                    if chunk.get("type") == "content":
                        result_data.append(chunk.get("data", ""))
                    elif chunk.get("type") == "done" and chunk.get("data"):
                        result_data = [chunk.get("data")]

                # 添加任务ID到响应中
                chunk_with_task = {
                    **chunk,
                    "task_id": task.id
                }
                yield f"data: {json.dumps(chunk_with_task, ensure_ascii=False)}\n\n"

            # 任务完成，更新数据库
            task.status = "completed"
            task.completed_at = datetime.utcnow()
            task.result = {"content": "\n".join(result_data)} if result_data else None

            # 扣除用户点数
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.credits -= 5

            db.commit()

            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.info(
                "stream_analysis done request_id=%s user_id=%s task_id=%s chunks=%s elapsed_ms=%s",
                request_id,
                user_id,
                task_id,
                chunks,
                elapsed_ms,
            )
        except Exception as e:
            # 任务失败，更新数据库
            task.status = "failed"
            task.error_message = str(e)
            task.completed_at = datetime.utcnow()
            db.commit()

            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.exception(
                "stream_analysis error request_id=%s user_id=%s task_id=%s elapsed_ms=%s: %s",
                request_id,
                user_id,
                task_id,
                elapsed_ms,
                str(e),
            )

            error_response = {
                "error": str(e),
                "task_id": task.id
            }
            yield f"data: {json.dumps(error_response, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.get("/tasks", summary="获取分析任务列表")
async def get_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 20,
    offset: int = 0
):
    """获取当前用户的分析任务列表"""
    tasks = db.query(AnalysisTask)\
        .filter(AnalysisTask.user_id == current_user.id)\
        .order_by(AnalysisTask.created_at.desc())\
        .limit(limit)\
        .offset(offset)\
        .all()

    return {
        "tasks": [
            {
                "id": task.id,
                "video_url": task.video_url,
                "video_name": task.video_name,
                "model_id": task.model_id,
                "status": task.status,
                "credits_used": task.credits_used,
                "created_at": task.created_at.isoformat() if task.created_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "result": task.result
            }
            for task in tasks
        ],
        "total": len(tasks)
    }

@router.get("/tasks/{task_id}", summary="获取任务详情")
async def get_task_detail(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取指定任务的详细信息"""
    task = db.query(AnalysisTask)\
        .filter(AnalysisTask.id == task_id, AnalysisTask.user_id == current_user.id)\
        .first()

    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    return {
        "id": task.id,
        "video_url": task.video_url,
        "video_name": task.video_name,
        "video_size": task.video_size,
        "video_duration": task.video_duration,
        "model_id": task.model_id,
        "enable_thinking": task.enable_thinking,
        "prompt": task.prompt,
        "status": task.status,
        "credits_used": task.credits_used,
        "error_message": task.error_message,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "result": task.result
    }
