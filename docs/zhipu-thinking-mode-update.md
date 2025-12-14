# 智谱思考模式更新说明

## 更新内容

智谱 AI (GLM-4.6V) 的思考模式实现已简化，不再需要复杂的参数配置。

## 思考模式参数

智谱的思考模式只需要简单的布尔值：

```json
{
  "type": "enabled"   // 启用深度思考模式（默认）
  // 或
  "type": "disabled"  // 禁用深度思考模式，直接给出回答
}
```

## 实现细节

### 1. 官方 SDK 实现 (ZhipuProvider)
```python
thinking = None
if enable_thinking:
    thinking = {"type": "enabled"}  # 启用深度思考模式

stream = self._client.chat.completions.create(
    model=config["name"],
    messages=messages,
    thinking=thinking,
    stream=True
)
```

### 2. OpenAI 兼容格式实现 (ZhipuOpenAIProvider)
```python
extra_body = {}
if enable_thinking:
    extra_body = {
        "thinking": {
            "type": "enabled"  # 启用深度思考模式
        }
    }

stream = await self._client.chat.completions.create(
    model=self.config.name,
    messages=messages,
    stream=True,
    extra_body=extra_body
)
```

## 参数说明

- `enabled`（默认）: 启用动态思考，模型自动判断是否需要深度思考
- `disabled`: 禁用深度思考，直接给出回答

## 前端配置简化

由于智谱思考模式不需要复杂的参数配置，前端管理后台可以：

1. **移除** "思考模式参数" 配置输入框
2. **保留** "启用思考模式" 的开关/复选框
3. API 调用时只需传递 `enable_thinking: true/false`

## API 调用示例

```javascript
// 启用思考模式
POST /api/analysis/stream
{
  "video_url": "https://example.com/video.mp4",
  "model_id": "glm-4.6v",
  "enable_thinking": true  // 只需要这个参数
}

// 禁用思考模式
POST /api/analysis/stream
{
  "video_url": "https://example.com/video.mp4",
  "model_id": "glm-4.6v",
  "enable_thinking": false
}
```

## 数据库兼容性

- `thinking_params` 字段仍然存在于数据库中，但智谱模型不再使用
- 其他 AI 提供者（如阿里云）可能仍需要 `thinking_params` 配置