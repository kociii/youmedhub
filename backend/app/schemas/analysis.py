from pydantic import BaseModel
from typing import List, Optional

class VideoMeta(BaseModel):
    duration: Optional[float] = None
    size: Optional[int] = None
    filename: str

class UploadResponse(BaseModel):
    url: str
    meta: VideoMeta

class ScriptSegment(BaseModel):
    id: int
    startTime: str
    endTime: str
    visual: str
    content: str
    audio: str

class AnalysisRequest(BaseModel):
    video_url: str
    model: str = "qwen3-vl-plus"

class AnalysisResponse(BaseModel):
    task_id: str
    status: str
    segments: List[ScriptSegment] = []
