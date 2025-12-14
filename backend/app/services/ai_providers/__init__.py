"""AI 提供者模块"""

from .base import AIProviderBase, AIProviderConfig
from .zhipu import ZhipuProvider, ZhipuOpenAIProvider
from .dashscope import DashscopeProvider, DashscopeOpenAIProvider
from .openai import OpenAIProvider

def get_provider(provider_name: str, config: AIProviderConfig) -> AIProviderBase:
    """
    根据提供商和配置获取 AI 提供者实例

    Args:
        provider_name: 提供者名称
        config: 提供者配置

    Returns:
        AI 提供者实例
    """
    provider_name_lower = provider_name.lower()

    # 根据提供商和 use_official_sdk 配置选择实现
    if "智谱" in provider_name or "zhipu" in provider_name_lower or "glm" in provider_name_lower:
        # 智谱：根据配置选择官方 SDK 或 OpenAI 兼容
        if config.use_official_sdk:
            return ZhipuProvider(config)
        else:
            return ZhipuOpenAIProvider(config)

    elif "阿里云" in provider_name or "aliyun" in provider_name_lower or "qwen" in provider_name_lower or "dashscope" in provider_name_lower:
        # 阿里云：根据配置选择官方 SDK 或 OpenAI 兼容
        if config.use_official_sdk:
            return DashscopeProvider(config)
        else:
            return DashscopeOpenAIProvider(config)

    else:
        # 其他提供商默认使用 OpenAI 兼容格式
        return OpenAIProvider(config)

__all__ = [
    "AIProviderBase",
    "AIProviderConfig",
    "ZhipuProvider",
    "ZhipuOpenAIProvider",
    "DashscopeProvider",
    "DashscopeOpenAIProvider",
    "OpenAIProvider",
    "get_provider",
]