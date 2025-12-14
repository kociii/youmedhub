from sqlalchemy import Column, String, Boolean, Text, Index
from app.models.base import BaseModel


class AIModel(BaseModel):
    """AI 模型配置表"""
    __tablename__ = "ai_models"

    # 模型唯一标识符
    model_id = Column(String(50), unique=True, nullable=False, index=True, comment="模型ID")

    # 基本信息
    name = Column(String(100), nullable=False, comment="模型名称")
    provider = Column(String(50), nullable=False, comment="提供商")

    # API 配置
    api_key = Column(String(500), nullable=False, comment="API Key")
    base_url = Column(String(500), nullable=False, comment="API Base URL")

    # 提示词和参数
    prompt = Column(Text, default="", comment="提示词")
    thinking_params = Column(Text, default="", comment="思考模式参数（JSON格式）")

    # SDK 配置
    use_official_sdk = Column(Boolean, default=True, comment="是否使用官方SDK（False则使用OpenAI兼容格式）")

    # 状态
    is_active = Column(Boolean, default=True, comment="是否启用")

    # 创建索引
    __table_args__ = (
        Index('idx_model_provider', 'provider'),
        Index('idx_model_active', 'is_active'),
    )