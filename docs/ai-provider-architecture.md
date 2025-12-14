# AI 提供者架构说明

## 概述

本项目实现了统一的 AI 提供者架构，支持智谱、阿里云等多种 AI 服务，并可选择使用官方 SDK 或 OpenAI 兼容格式。

## 架构设计

### 1. 核心组件

- **AIProviderBase**: 提供者基类，定义统一接口
- **AIProviderConfig**: 提供者配置类
- **具体提供者实现**:
  - `ZhipuProvider`: 智谱官方 SDK 实现
  - `ZhipuOpenAIProvider`: 智谱 OpenAI 兼容格式实现
  - `DashscopeProvider`: 阿里云官方 SDK 实现
  - `DashscopeOpenAIProvider`: 阿里云 OpenAI 兼容格式实现
  - `OpenAIProvider`: OpenAI 兼容格式提供者

### 2. 目录结构

```
backend/app/services/ai_providers/
├── __init__.py          # 提供者工厂函数
├── base.py              # 基类和配置
├── zhipu.py             # 智谱相关实现
├── dashscope.py         # 阿里云相关实现
└── openai.py            # OpenAI 兼容实现
```

## 使用方式

### 1. 数据库配置

在 `ai_models` 表中，新增了 `use_official_sdk` 字段：

```sql
ALTER TABLE ai_models
ADD COLUMN use_official_sdk BOOLEAN DEFAULT TRUE
COMMENT '是否使用官方SDK（False则使用OpenAI兼容格式）';
```

### 2. API 配置

```json
{
  "name": "GLM-4.6V",
  "provider": "智谱",
  "api_key": "your_api_key",
  "base_url": "https://open.bigmodel.cn/api/paas/v4",
  "use_official_sdk": true,  // 使用官方 SDK
  "prompt": "...",
  "thinking_params": "..."
}
```

### 3. 自动选择实现

系统会根据提供商和 `use_official_sdk` 配置自动选择实现：

| 提供商 | use_official_sdk=true | use_official_sdk=false |
|--------|----------------------|----------------------|
| 智谱   | ZhipuProvider        | ZhipuOpenAIProvider |
| 阿里云 | DashscopeProvider    | DashscopeOpenAIProvider |
| 其他   | OpenAIProvider       | OpenAIProvider |

## API 使用示例

### 1. 获取模型列表（包含提供者信息）

```bash
GET /api/system/models
```

响应包含 `provider_info` 字段，显示当前配置的提供者信息：

```json
{
  "models": [
    {
      "id": "glm-4.6v",
      "name": "GLM-4.6V",
      "provider": "智谱",
      "use_official_sdk": true,
      "provider_info": {
        "provider": "智谱",
        "model": "glm-4.6v",
        "use_official_sdk": true,
        "supports_thinking": true,
        "supports_video": true,
        "streaming": true
      }
    }
  ]
}
```

### 2. 视频分析（统一接口）

```bash
POST /api/analysis/stream
{
  "video_url": "https://example.com/video.mp4",
  "model_id": "glm-4.6v",
  "enable_thinking": true
}
```

无论使用哪种实现方式，接口调用方式都是统一的。

## 配置建议

### 1. 智谱 GLM

- **官方 SDK** (推荐): 支持 `thinking` 参数，更稳定
- **OpenAI 兼容**: 需要正确的 base_url

```python
# 官方 SDK 配置
base_url = ""  # 可选，官方 SDK 不需要
use_official_sdk = True
# 思考模式参数: {"type": "enabled"} 或 {"type": "disabled"}

# OpenAI 兼容配置
base_url = "https://open.bigmodel.cn/api/paas/v4"
use_official_sdk = False
# 思考模式参数: extra_body={"thinking": {"type": "enabled"}}
```

### 2. 阿里云 Qwen

- **官方 SDK**: 使用 `image` 字段传视频，不支持 `thinking`
- **OpenAI 兼容**: 使用 `video_url` 字段，支持 `thinking`

```python
# 官方 SDK 配置
base_url = ""  # 可选，官方 SDK 不需要
use_official_sdk = True
# 不支持思考模式

# OpenAI 兼容配置
base_url = "https://dashscope.aliyuncs.com/compatible-mode/v1"
use_official_sdk = False
# 思考模式参数: extra_body={"enable_thinking": True}
```

## 扩展新的提供商

1. 继承 `AIProviderBase` 基类
2. 实现必要的方法：
   - `initialize()`: 初始化客户端
   - `analyze_video_stream()`: 流式视频分析
   - `get_provider_info()`: 获取提供者信息
3. 在 `__init__.py` 中注册新的提供者

## 测试

开发模式下，可以使用测试 API：

```bash
# 设置环境变量
export DEBUG=true

# 测试提供者
POST /api/test/test-provider
{
  "provider": "智谱",
  "name": "glm-4.6v",
  "api_key": "test_key",
  "base_url": "https://open.bigmodel.cn/api/paas/v4",
  "use_official_sdk": true,
  "video_url": "https://example.com/video.mp4",
  "prompt": "分析这个视频"
}
```

## 注意事项

1. **视频格式**: 不同提供者对视频 URL 的格式要求不同
   - 官方 SDK: 可能使用 `image` 字段
   - OpenAI 兼容: 使用 `video_url` 字段

2. **思考模式**:
   - 智谱: 两种实现都支持
   - 阿里云: 只有 OpenAI 兼容格式支持

3. **错误处理**: 每个提供者都有独立的错误处理逻辑，统一返回给上层

4. **日志记录**: 使用不同的日志前缀区分不同提供者的日志