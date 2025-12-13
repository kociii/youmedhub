from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import analysis, system
from app.database import create_tables
import logging


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

app = FastAPI(
    title="YouMedHub API",
    description="""
## 析见 - AI 视频脚本分析平台

### 功能特性

- 🎬 **视频上传**: 支持上传视频到云端存储
- 🤖 **AI 分析**: 使用多模态大模型分析视频内容
- 📝 **脚本生成**: 自动生成详细的分镜脚本
- ⚙️ **多模型支持**: 支持 OpenAI、Qwen 等多种 AI 模型

### 技术栈

- FastAPI + Python 3.10+
- OpenAI SDK (兼容多种模型)
- PostgreSQL 数据库
- tmpfile.link 文件存储
    """,
    version="0.1.0",
    contact={
        "name": "YouMedHub Team",
    },
)

# 应用启动时创建数据库表
@app.on_event("startup")
async def startup_event():
    create_tables()
    logging.info("数据库表创建完成")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)
app.include_router(system.router)

@app.get("/", tags=["Root"])
async def root():
    """根路径，返回 API 基本信息"""
    return {
        "message": "YouMedHub API",
        "version": "0.1.0",
        "docs": "/docs"
    }
