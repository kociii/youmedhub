# YouMedHub API 文档

## 📋 后端实现总结

### 🎯 核心功能

1. **视频上传服务**
   - 集成 tmpfile.link 云存储
   - 支持最大 100MB 视频文件
   - 自动验证文件类型

2. **AI 分析服务**
   - 使用 OpenAI SDK 兼容接口
   - 支持多种 AI 模型（Qwen、OpenAI）
   - 自动识别模型并使用对应配置
   - 支持 Qwen 的 `enable_thinking` 参数

3. **系统配置管理**
   - 动态配置 API Key 和 Base URL
   - 支持多模型配置切换
   - 前端管理界面集成

### 🏗️ 技术架构

```
backend/
├── app/
│   ├── api/              # API 路由
│   │   ├── analysis.py   # 视频分析接口
│   │   └── system.py     # 系统配置接口
│   ├── core/
│   │   └── config.py     # 配置管理
│   ├── schemas/
│   │   └── analysis.py   # 数据模型
│   ├── services/
│   │   ├── ai_service.py      # AI 服务（多模型支持）
│   │   └── upload_service.py  # 上传服务
│   └── main.py           # FastAPI 应用
├── pyproject.toml        # uv 项目配置
├── uv.toml              # uv 镜像配置
└── run.py               # 启动脚本
```

---

## 📡 API 接口

### 1. 视频上传

**POST** `/api/analysis/upload`

上传视频文件到云端存储。

**请求：**
- Content-Type: `multipart/form-data`
- Body: `file` (视频文件)

**响应：**
```json
{
  "url": "https://tmpfile.link/xxx",
  "meta": {
    "filename": "video.mp4",
    "size": 1024000,
    "duration": null
  }
}
```

**限制：**
- 文件类型：video/*
- 最大大小：100MB

---

### 2. 创建分析任务

**POST** `/api/analysis/create`

使用 AI 模型分析视频并生成分镜脚本。

**请求：**
```json
{
  "video_url": "https://tmpfile.link/xxx",
  "model": "qwen3-vl-plus"
}
```

**支持的模型：**
- `qwen3-vl-plus` (推荐)
- `qwen3-vl-flash`
- `qwen3-vl-235b-a22b-thinking`
- `gpt-4o`
- `gpt-4-turbo`

**响应：**
```json
{
  "task_id": "uuid",
  "status": "completed",
  "segments": [
    {
      "id": 1,
      "startTime": "00:00",
      "endTime": "00:05",
      "visual": "画面描述",
      "content": "口播内容",
      "audio": "音频/备注"
    }
  ]
}
```

---

### 3. 获取系统配置

**GET** `/api/system/config`

获取当前系统配置（不包含完整 API Key）。

**响应：**
```json
{
  "models": {
    "openai": {
      "name": "OpenAI",
      "base_url": "https://api.openai.com/v1",
      "has_key": true
    },
    "qwen": {
      "name": "Qwen (DashScope)",
      "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "has_key": false
    }
  }
}
```

---

### 4. 更新系统配置

**POST** `/api/system/config`

更新 AI 模型配置。

**请求：**
```json
{
  "openai": {
    "name": "OpenAI",
    "api_key": "sk-xxx",
    "base_url": "https://api.openai.com/v1"
  },
  "qwen": {
    "name": "Qwen",
    "api_key": "sk-xxx",
    "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1"
  }
}
```

**响应：**
```json
{
  "message": "配置已更新"
}
```

---

## 🔧 AI 服务实现

### 多模型支持

```python
class AIService:
    def get_client(self, model: str) -> OpenAI:
        # 根据模型名称自动选择配置
        if model.startswith("qwen"):
            return OpenAI(
                api_key=settings.DASHSCOPE_API_KEY,
                base_url=settings.DASHSCOPE_BASE_URL
            )
        else:
            return OpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
```

### Qwen 特殊参数支持

```python
extra_body = {}
if model.startswith("qwen3-vl"):
    extra_body = {
        "enable_thinking": True,
        "thinking_budget": 81920
    }

completion = client.chat.completions.create(
    model=model,
    messages=[...],
    extra_body=extra_body  # 通过 extra_body 传递非标准参数
)
```

---

## 🚀 快速开始

### 1. 安装依赖
```bash
cd backend
uv sync
```

### 2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 填入 API Key
```

### 3. 启动服务
```bash
uv run python run.py
```

### 4. 访问文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 📦 依赖包

- **FastAPI**: Web 框架
- **Uvicorn**: ASGI 服务器
- **OpenAI SDK**: AI 模型调用
- **httpx**: HTTP 客户端（上传服务）
- **Pydantic**: 数据验证
- **SQLAlchemy**: 数据库 ORM（预留）

---

## 🌐 国内镜像

项目已配置清华大学 PyPI 镜像源（`uv.toml`），加速依赖下载：

```toml
[[index]]
url = "https://pypi.tuna.tsinghua.edu.cn/simple"
default = true
```
