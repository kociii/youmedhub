"""
模型服务：从数据库加载和管理 AI 模型配置
"""
from typing import Dict, Optional
from app.database import SessionLocal
from app.models import AIModel

class ModelService:
    """模型服务类，提供模型的数据库操作"""

    @staticmethod
    def get_model_config(model_id: str) -> Optional[Dict]:
        """从数据库获取指定模型的配置"""
        db = SessionLocal()
        try:
            model = db.query(AIModel).filter(AIModel.model_id == model_id, AIModel.is_active == True).first()
            if model:
                return {
                    "name": model.name,
                    "provider": model.provider,
                    "api_key": model.api_key,
                    "base_url": model.base_url,
                    "prompt": model.prompt,
                    "thinking_params": model.thinking_params
                }
            return None
        finally:
            db.close()

    @staticmethod
    def get_all_models() -> Dict[str, Dict]:
        """获取所有激活的模型配置"""
        db = SessionLocal()
        try:
            models = db.query(AIModel).filter(AIModel.is_active == True).all()
            result = {}
            for model in models:
                result[model.model_id] = {
                    "name": model.name,
                    "provider": model.provider,
                    "api_key": model.api_key,
                    "base_url": model.base_url,
                    "prompt": model.prompt,
                    "thinking_params": model.thinking_params
                }
            return result
        finally:
            db.close()

    @staticmethod
    def get_available_models() -> Dict[str, Dict]:
        """获取已配置 API Key 的可用模型"""
        db = SessionLocal()
        try:
            models = db.query(AIModel).filter(
                AIModel.is_active == True,
                AIModel.api_key != ""
            ).all()
            result = {}
            for model in models:
                result[model.model_id] = {
                    "name": model.name,
                    "provider": model.provider,
                    "api_key": model.api_key,
                    "base_url": model.base_url,
                    "prompt": model.prompt,
                    "thinking_params": model.thinking_params
                }
            return result
        finally:
            db.close()