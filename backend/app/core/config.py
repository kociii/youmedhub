from pydantic_settings import BaseSettings
from typing import Dict
import json
import os

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:Mfkz941027@localhost:5432/youmedhub"
    DEFAULT_MODEL: str = "qwen3-vl-flash"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# 动态模型配置存储
MODELS_CONFIG_FILE = "models_config.json"

def load_models() -> Dict:
    if os.path.exists(MODELS_CONFIG_FILE):
        with open(MODELS_CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_models(models: Dict):
    with open(MODELS_CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(models, f, ensure_ascii=False, indent=2)
