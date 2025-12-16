from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
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
    db: Session = Depends(get_db),
    http_request: Request = Request
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
        credits_used=5,
        # 设置合理的默认时间
        created_at=datetime.utcnow(),
        started_at=None,
        completed_at=None
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

        # 详细的请求开始日志
        logger.info("="*80)
        logger.info(f"[分析请求开始] request_id={request_id}")
        logger.info(f"  - 用户ID: {user_id}")
        logger.info(f"  - 任务ID: {task_id}")
        logger.info(f"  - 模型ID: {model_id}")
        logger.info(f"  - 视频URL: {video_url}")
        logger.info(f"  - 启用思考: {enable_thinking}")
        # 获取客户端IP
        client_ip = http_request.client.host if http_request.client else "unknown"
        logger.info(f"  - 用户IP: {client_ip}")
        logger.info(f"  - 请求时间: {datetime.utcnow().isoformat()}")
        logger.info("="*80)

        # 同时输出到控制台
        print(f"\n{'='*80}")
        print(f"[分析请求] user_id: {user_id}")
        print(f"[分析请求] task_id: {task_id}")
        print(f"[分析请求] model_id: {model_id}")
        print(f"[分析请求] video_url: {video_url}")
        print(f"[分析请求] enable_thinking: {enable_thinking}")
        print(f"{'='*80}\n")

        # 更新任务状态为处理中
        try:
            task.status = "processing"
            task.started_at = datetime.utcnow()
            db.commit()

            processing_time = datetime.utcnow().isoformat()
            logger.info(f"[状态更新] Task {task_id} -> processing at {processing_time}")
            print(f"[状态更新] Task {task_id} -> processing")

        except Exception as commit_error:
            logger.error(f"[状态更新失败] Task {task_id} to processing: {commit_error}", exc_info=True)
            raise

        result_data = []
        error_occurred = None
        chunks = 0
        first_chunk_logged = False
        done_received = False

        try:
            async for chunk in ai_service.analyze_video_stream(
                request.video_url,
                request.model_id,
                request.enable_thinking
            ):
                chunks += 1
                chunk_type = chunk.get("type") if isinstance(chunk, dict) else "unknown"
                elapsed_ms = int((time.perf_counter() - start_time) * 1000)

                # 记录第一个chunk
                if not first_chunk_logged:
                    first_chunk_logged = True
                    logger.info(
                        f"[流式响应] 第一个chunk - request_id={request_id}, elapsed_ms={elapsed_ms}ms, "
                        f"chunk_type={chunk_type}, chunk_num={chunks}"
                    )
                    print(f"\n[流式响应] 开始接收chunk...")
                    print(f"[Chunk {chunks}] Type: {chunk_type}, Elapsed: {elapsed_ms}ms")

                # 记录每个chunk
                if chunk_type == "content":
                    content_preview = chunk.get("data", "")[:50]
                    logger.info(
                        f"[流式响应] Chunk {chunks} - type=content, length={len(chunk.get('data', ''))}, "
                        f"preview={content_preview}..."
                    )
                    print(f"[Chunk {chunks}] Type: content, Length: {len(chunk.get('data', ''))}")
                    print(f"  Content: {content_preview}...")
                elif chunk_type == "thinking":
                    thinking_preview = chunk.get("data", "")[:50]
                    logger.info(
                        f"[流式响应] Chunk {chunks} - type=thinking, "
                        f"preview={thinking_preview}..."
                    )
                    print(f"[Chunk {chunks}] Type: thinking")
                    print(f"  Thinking: {thinking_preview}...")
                elif chunk_type == "done":
                    logger.info(
                        f"[流式响应] Chunk {chunks} - type=done, "
                        f"data_length={len(chunk.get('data', ''))}, "
                        f"total_elapsed_ms={elapsed_ms}"
                    )
                    print(f"\n[Chunk {chunks}] Type: ✓ DONE - Total elapsed: {elapsed_ms}ms")
                elif chunk_type == "error":
                    logger.error(
                        f"[流式响应] Chunk {chunks} - type=error, "
                        f"error={chunk.get('error', 'Unknown error')}"
                    )
                    print(f"\n[Chunk {chunks}] Type: ✗ ERROR")
                    print(f"  Error: {chunk.get('error', 'Unknown error')}")
                else:
                    logger.debug(
                        f"[流式响应] Chunk {chunks} - type={chunk_type}"
                    )
                    print(f"[Chunk {chunks}] Type: {chunk_type}")

                # 更新进度日志（每10个chunk）
                if chunks % 10 == 0:
                    logger.info(
                        f"[流式响应] 进度更新 - 已接收 {chunks} chunks, "
                        f"elapsed_ms={elapsed_ms}, avg_ms_per_chunk={elapsed_ms//chunks}"
                    )

                # 收集结果数据
                if isinstance(chunk, dict):
                    if chunk.get("type") == "content":
                        result_data.append(chunk.get("data", ""))
                    elif chunk.get("type") == "done":
                        logger.info(f"[流式响应] 收到done事件 - chunk={chunks}")
                        logger.info(f"  - data存在: {'是' if chunk.get('data') else '否'}")
                        logger.info(f"  - data长度: {len(chunk.get('data', ''))}")
                        if chunk.get("data"):
                            # "done"事件包含完整结果，替换之前的content
                            result_data = [chunk.get("data")]
                        # 标记收到done事件
                        done_received = True
                        logger.info(f"[流式响应] AI provider已完成，继续发送剩余数据")

                # 添加任务ID到响应中
                chunk_with_task = {
                    **chunk,
                    "task_id": task.id
                }

                # 序列化为JSON字符串，使用更安全的选项
                try:
                    json_str = json.dumps(
                        chunk_with_task,
                        ensure_ascii=False,
                        allow_nan=True,
                        indent=None,
                        separators=(',', ':')
                    )
                except (TypeError, ValueError) as json_error:
                    logger.error(f"[JSON序列化失败] chunk={chunk}")
                    logger.error(f"  - 错误: {json_error}")
                    logger.error(f"  - chunk_type: {chunk.get('type', 'unknown')}")
                    logger.error(f"  - chunk_keys: {list(chunk.keys()) if isinstance(chunk, dict) else 'not_dict'}")

                    # 尝试创建一个简化的响应
                    safe_chunk = {
                        "type": "error",
                        "error": f"JSON序列化失败: {str(json_error)[:200]}",  # 限制错误消息长度
                        "task_id": task.id,
                        "original_type": chunk.get('type', 'unknown') if isinstance(chunk, dict) else 'unknown'
                    }

                    try:
                        json_str = json.dumps(safe_chunk, ensure_ascii=False, allow_nan=True)
                    except Exception as fallback_error:
                        logger.error(f"[后备序列化也失败] 使用最简单的错误响应")
                        json_str = json.dumps({
                            "type": "error",
                            "error": "Server error: Unable to serialize response",
                            "task_id": task.id
                        })

                # 记录即将发送的数据
                logger.debug(f"[发送响应] Chunk {chunks}, size={len(json_str)} bytes")
                if chunks <= 5 and len(json_str) > 100:
                    # 只记录前几个chunk的内容预览
                    preview = json_str[:100].replace('\n', '\\n')
                    logger.debug(f"  内容预览: {preview}...")

                yield f"data: {json_str}\n\n"

        except Exception as e:
            error_occurred = e
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)

            # 详细错误日志
            logger.error(f"[流式响应异常] request_id={request_id}, elapsed_ms={elapsed_ms}")
            logger.error(f"  - 错误类型: {type(e).__name__}")
            logger.error(f"  - 错误信息: {str(e)}")
            logger.error(f"  - 已处理chunks: {chunks}")

            print(f"\n[流式响应异常] Elapsed: {elapsed_ms}ms")
            print(f"  - Error type: {type(e).__name__}")
            print(f"  - Error: {str(e)}")
            print(f"  - Chunks processed: {chunks}")

            # 对于客户端断开连接等错误，仍然尝试yield错误信息
            try:
                error_response = {
                    "type": "error",
                    "error": str(e),
                    "task_id": task.id
                }
                logger.info(f"[错误响应] 已发送错误信息给客户端")
                yield f"data: {json.dumps(error_response, ensure_ascii=False)}\n\n"
            except Exception as yield_error:
                logger.error(f"[错误响应] 无法发送错误信息: {yield_error}")
                logger.error(f"[错误响应] 连接可能已断开")

        finally:
            # 无论如何都要更新任务状态
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            total_time_sec = elapsed_ms / 1000

            # 在流结束时发送最终状态
            try:
                final_chunk = {
                    "type": "stream_ended",
                    "task_id": task.id,
                    "status": "completed" if not error_occurred else "failed",
                    "error": str(error_occurred) if error_occurred else None,
                    "total_chunks": chunks,
                    "elapsed_ms": elapsed_ms,
                    "done_received": done_received
                }
                logger.info(f"[流式响应] 发送结束信号: {final_chunk}")
                yield f"data: {json.dumps(final_chunk, ensure_ascii=False)}\n\n"
            except Exception as yield_error:
                logger.error(f"[流式响应] 无法发送结束信号: {yield_error}")

            try:
                if error_occurred:
                    # 任务失败
                    task.status = "failed"
                    task.error_message = str(error_occurred)
                    task.completed_at = datetime.utcnow()

                    completion_time = datetime.utcnow().isoformat()
                    logger.error("="*80)
                    logger.error(f"[任务失败] request_id={request_id}")
                    logger.error(f"  - 任务ID: {task_id}")
                    logger.error(f"  - 失败原因: {str(error_occurred)}")
                    logger.error(f"  - 完成时间: {completion_time}")
                    logger.error(f"  - 总用时: {total_time_sec:.2f}秒")
                    logger.error(f"  - 收到chunks: {chunks}个")
                    logger.error("="*80)

                    print(f"\n{'='*80}")
                    print(f"[任务失败] Task {task_id}")
                    print(f"  - Error: {str(error_occurred)}")
                    print(f"  - Total time: {total_time_sec:.2f}s")
                    print(f"  - Chunks received: {chunks}")
                    print(f"{'='*80}\n")
                else:
                    # 任务完成
                    task.status = "completed"
                    task.completed_at = datetime.utcnow()

                    # 保存结构化的结果数据
                    result_saved = False
                    result_type = "none"
                    if result_data:
                        result_type = "text"
                        total_chars = sum(len(r) for r in result_data)
                        # 尝试解析JSON格式的结果
                        try:
                            # 如果结果是JSON格式（比如AI返回的脚本和片段）
                            first_result = result_data[0]
                            if first_result.startswith('{') or first_result.startswith('['):
                                # 尝试解析为JSON
                                parsed_result = json.loads("\n".join(result_data))
                                task.result = parsed_result
                                result_type = "json"
                                result_saved = True
                            else:
                                # 纯文本内容
                                task.result = {
                                    "content": "\n".join(result_data),
                                    "type": "text"
                                }
                                result_saved = True
                        except (json.JSONDecodeError, Exception) as e:
                            # 如果不是JSON，保存为文本
                            task.result = {
                                "content": "\n".join(result_data),
                                "type": "text"
                            }
                            result_saved = True
                    else:
                        task.result = None

                    # 扣除用户点数（仅成功完成的任务）
                    credits_before = 0
                    credits_after = 0
                    user = db.query(User).filter(User.id == user_id).first()
                    if user:
                        credits_before = user.credits
                        user.credits -= 5
                        credits_after = user.credits

                    completion_time = datetime.utcnow().isoformat()
                    logger.info("="*80)
                    logger.info(f"[任务完成] request_id={request_id}")
                    logger.info(f"  - 任务ID: {task_id}")
                    logger.info(f"  - 完成时间: {completion_time}")
                    logger.info(f"  - 总用时: {total_time_sec:.2f}秒")
                    logger.info(f"  - 收到chunks: {chunks}个")
                    logger.info(f"  - 结果类型: {result_type}")
                    if result_saved:
                        logger.info(f"  - 结果已保存: 是")
                        if total_chars > 0:
                            logger.info(f"  - 总字符数: {total_chars}")
                    else:
                        logger.info(f"  - 结果已保存: 否")
                    logger.info(f"  - 用户点数: {credits_before} -> {credits_after}")
                    logger.info("="*80)

                    print(f"\n{'='*80}")
                    print(f"[任务完成] Task {task_id}")
                    print(f"  - Status: completed ✓")
                    print(f"  - Total time: {total_time_sec:.2f}s")
                    print(f"  - Chunks: {chunks}")
                    print(f"  - Result type: {result_type}")
                    if result_saved:
                        print(f"  - Result saved: ✓")
                    print(f"  - User credits: {credits_before} -> {credits_after}")
                    print(f"{'='*80}\n")

                db.commit()

                # 最终总结日志
                final_status = task.status
                logger.info(f"[分析请求结束] request_id={request_id} - 最终状态: {final_status}")
                logger.info(f"{'='*80}")

            except Exception as commit_error:
                logger.error(
                    "Failed to update task status request_id=%s task_id=%s error=%s",
                    request_id,
                    task_id,
                    str(commit_error),
                    exc_info=True
                )
                try:
                    db.rollback()
                except:
                    pass

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
