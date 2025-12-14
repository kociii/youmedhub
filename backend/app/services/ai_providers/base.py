from abc import ABC, abstractmethod
from typing import Dict, List, Any, AsyncGenerator, Optional
from pydantic import BaseModel

class AIProviderConfig(BaseModel):
    """AI 提供者配置"""
    model_config = {"protected_namespaces": ()}

    model_id: str
    name: str
    provider: str
    api_key: str
    base_url: str

class AIProviderBase(ABC):
    """AI 提供者基类"""

    def __init__(self, config: AIProviderConfig):
        self.config = config
        self._client = None

    @abstractmethod
    async def initialize(self):
        """初始化客户端"""
        pass

    @abstractmethod
    async def analyze_video_stream(
        self,
        video_url: str,
        prompt: str,
        enable_thinking: bool = False,
        thinking_params: Dict[str, Any] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        流式分析视频

        Returns:
            AsyncGenerator: 生成以下格式的数据：
                - {"type": "content", "data": "部分内容"}
                - {"type": "done", "data": "完整内容"}
        """
        pass

    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """获取提供者信息"""
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """提供者名称"""
        pass

    def build_messages(
        self,
        video_url: str,
        prompt: str,
        message_format: str = "auto"
    ) -> List[Dict[str, Any]]:
        """
        构建消息格式

        Args:
            video_url: 视频URL
            prompt: 提示词
            message_format: 消息格式 ("auto" 自动选择, "openai" OpenAI格式, "glm" GLM格式, "dashscope" DashScope格式)

        Returns:
            格式化的消息列表
        """
        if message_format == "openai" or (message_format == "auto" and self.provider_name in ["OpenAI", "OpenAI Compatible"]):
            return [
                {
                    "role": "user",
                    "content": [
                        {"type": "video_url", "video_url": {"url": video_url}},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
        elif message_format == "glm" or (message_format == "auto" and "智谱" in self.provider_name):
            return [
                {
                    "role": "user",
                    "content": [
                        {"type": "video_url", "video_url": {"url": video_url}},
                        {"type": "text", "text": prompt}
                    ]
                }
            ]
        elif message_format == "dashscope" or (message_format == "auto" and "阿里云" in self.provider_name):
            return [
                {
                    "role": "user",
                    "content": [
                        {"video": video_url, "fps": 4},  # DashScope 使用 video 字段，fps 控制抽帧频率，默认为4
                        {"text": prompt}
                    ]
                }
            ]
        else:
            # 默认使用 OpenAI 格式
            return self.build_messages(video_url, prompt, "openai")