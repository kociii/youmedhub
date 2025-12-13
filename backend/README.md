# YouMedHub 后端服务

## 快速开始

### 1. 安装依赖（使用 uv）

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

服务将在 http://localhost:8000 启动

## API 文档

访问：http://localhost:8000/docs

## 国内镜像

已配置清华大学 PyPI 镜像（`uv.toml`）
