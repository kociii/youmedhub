"""AI 提供者模块"""

from .base import AIProviderBase, AIProviderConfig
from .zhipu import ZhipuProvider
from .dashscope import DashscopeProvider
from .openai import OpenAIProvider

def get_provider(provider_name: str, config: AIProviderConfig) -> AIProviderBase:
    """
    根据提供商获取 AI 提供者实例

    Args:
        provider_name: 提供者名称 (zhipu/智谱, aliyun/阿里云, openai)
        config: 提供者配置

    Returns:
        AI 提供者实例
    """
    provider_name_lower = provider_name.lower()

    if "智谱" in provider_name or "zhipu" in provider_name_lower or "glm" in provider_name_lower:
        return ZhipuProvider(config)
    elif "阿里云" in provider_name or "aliyun" in provider_name_lower or "qwen" in provider_name_lower or "dashscope" in provider_name_lower:
        return DashscopeProvider(config)
    else:
        return OpenAIProvider(config)

__all__ = [
    "AIProviderBase",
    "AIProviderConfig",
    "ZhipuProvider",
    "DashscopeProvider",
    "OpenAIProvider",
    "get_provider",
]