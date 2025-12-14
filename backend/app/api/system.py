from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from app.database import get_db
from app.models import AIModel
from sqlalchemy.orm import Session
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/system", tags=["系统配置"])

class ModelConfig(BaseModel):
    name: str = Field(..., description="模型名称")
    provider: str = Field(..., description="提供商")
    api_key: str = Field(..., description="API Key")
    base_url: str = Field(..., description="API Base URL")
    prompt: str = Field(default="", description="提示词")
    thinking_params: str = Field(default="", description="思考模式参数（JSON格式）")
    use_official_sdk: bool = Field(default=True, description="是否使用官方SDK（False则使用OpenAI兼容格式）")

@router.get("/models", summary="获取所有模型配置")
async def get_models(db: Session = Depends(get_db)):
    """获取所有模型配置列表"""
    from app.services.ai_providers import get_provider, AIProviderConfig

    models = db.query(AIModel).all()
    result = []
    for model in models:
        # 获取提供者信息
        provider_info = None
        if model.api_key and model.is_active:
            try:
                provider_config = AIProviderConfig(
                    model_id=model.model_id,
                    name=model.name,
                    provider=model.provider,
                    api_key=model.api_key,
                    base_url=model.base_url,
                    use_official_sdk=model.use_official_sdk
                )
                provider = get_provider(model.provider, provider_config)
                provider_info = provider.get_provider_info()
            except Exception as e:
                logger.warning(f"获取提供者信息失败 {model.model_id}: {str(e)}")

        result.append({
            "id": model.model_id,
            "name": model.name,
            "provider": model.provider,
            "api_key": model.api_key,
            "base_url": model.base_url,
            "prompt": model.prompt,
            "thinking_params": model.thinking_params,
            "use_official_sdk": model.use_official_sdk,
            "has_key": bool(model.api_key),
            "is_active": model.is_active,
            "provider_info": provider_info
        })
    return {"models": result}

@router.get("/models/available", summary="获取可用模型列表")
async def get_available_models(db: Session = Depends(get_db)):
    """获取已配置 API Key 的可用模型"""
    models = db.query(AIModel).filter(AIModel.is_active == True, AIModel.api_key != "").all()
    result = []
    for model in models:
        result.append({
            "id": model.model_id,
            "name": model.name,
            "provider": model.provider
        })
    return {"models": result}

@router.post("/models", summary="新增模型")
async def create_model(model: ModelConfig, db: Session = Depends(get_db)):
    """新增一个新的模型配置"""
    model_id = model.name.lower().replace(" ", "_")

    # 检查是否已存在
    existing = db.query(AIModel).filter(AIModel.model_id == model_id).first()
    if existing:
        raise HTTPException(400, "模型已存在")

    # 创建新模型
    db_model = AIModel(
        model_id=model_id,
        name=model.name,
        provider=model.provider,
        api_key=model.api_key,
        base_url=model.base_url,
        prompt=model.prompt,
        thinking_params=model.thinking_params,
        use_official_sdk=model.use_official_sdk
    )
    db.add(db_model)
    db.commit()
    db.refresh(db_model)

    return {"message": "模型已创建", "id": model_id}

@router.put("/models/{model_id}", summary="更新模型")
async def update_model(model_id: str, model: ModelConfig, db: Session = Depends(get_db)):
    """更新指定模型的配置"""
    db_model = db.query(AIModel).filter(AIModel.model_id == model_id).first()

    if not db_model:
        raise HTTPException(404, "模型不存在")

    # 更新字段
    db_model.name = model.name
    db_model.provider = model.provider
    db_model.api_key = model.api_key
    db_model.base_url = model.base_url
    db_model.prompt = model.prompt
    db_model.thinking_params = model.thinking_params
    db_model.use_official_sdk = model.use_official_sdk

    db.commit()
    return {"message": "模型已更新"}

@router.delete("/models/{model_id}", summary="删除模型")
async def delete_model(model_id: str, db: Session = Depends(get_db)):
    """删除指定的模型配置"""
    db_model = db.query(AIModel).filter(AIModel.model_id == model_id).first()

    if not db_model:
        raise HTTPException(404, "模型不存在")

    db.delete(db_model)
    db.commit()
    return {"message": "模型已删除"}
