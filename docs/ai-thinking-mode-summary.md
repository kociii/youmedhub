# AI 模型思考模式实现总结

## 智谱 AI (GLM-4.6V)

### 思考模式参数
```json
{
  "type": "enabled"   // 启用深度思考模式（默认）
  // 或
  "type": "disabled"  // 禁用深度思考模式，直接给出回答
}
```

### 实现方式

#### 官方 SDK 实现
```python
thinking = None
if enable_thinking:
    thinking = {"type": "enabled"}

stream = self._client.chat.completions.create(
    model=config["name"],
    messages=messages,
    thinking=thinking,
    stream=True
)
```

#### OpenAI 兼容格式实现
```python
thinking = None
if enable_thinking:
    thinking = {
        "type": "enabled"  # 启用深度思考模式
    }

stream = await self._client.chat.completions.create(
    model=self.config.name,
    messages=messages,
    stream=True,
    thinking=thinking  # 独立的参数
)
```

---

## 阿里云 DashScope (Qwen-VL)

### 思考模式参数
- 支持所有格式
- 使用布尔值：`enable_thinking: True` 或 `False`

### 实现方式

#### 官方 SDK 实现
```python
# DashScope 官方 SDK
response = MultiModalConversation.call(
    model=self.config.name,
    messages=messages,
    stream=True,
    enable_thinking=enable_thinking  # 独立的布尔值参数
)

# 消息格式
messages = [
    {
        "role": "user",
        "content": [
            {"video": video_url, "fps": 4},  # fps 控制抽帧频率，默认为4
            {"text": prompt}
        ]
    }
]
```

#### OpenAI 兼容实现

```python
# 阿里云 DashScope 的 enable_thinking 是独立参数
stream = await self._client.chat.completions.create(
    model=self.config.name,
    messages=messages,
    stream=True,
    enable_thinking=enable_thinking  # 独立的布尔值参数
)
```

---

## 对比总结

| 特性 | 智谱官方 SDK | 智谱 OpenAI 兼容 | 阿里云官方 SDK | 阿里云 OpenAI 兼容 |
|------|-------------|-----------------|--------------|------------------|
| 支持思考模式 | ✅ | ✅ | ✅ | ✅ |
| 参数格式 | `thinking: {type}` | `thinking: {type}` | `enable_thinking: boolean` | `enable_thinking: boolean` |
| 默认值 | `enabled` | `enabled` | `False` | `False` |
| 参数位置 | 独立参数 | 独立参数 | 独立参数 | 独立参数 |

## 前端配置简化

由于两个 AI 模型的思考模式都不需要复杂的参数配置：

1. **移除** "思考模式参数" 配置输入框
2. **保留** "启用思考模式" 的开关/复选框
3. API 调用时只需传递 `enable_thinking: true/false`

## 统一 API 调用

```javascript
// 启用思考模式
POST /api/analysis/stream
{
  "video_url": "https://example.com/video.mp4",
  "model_id": "glm-4.6v",
  "enable_thinking": true  // 自动转换为对应的参数格式
}

// 禁用思考模式
POST /api/analysis/stream
{
  "video_url": "https://example.com/video.mp4",
  "model_id": "qwen-vl-plus",
  "enable_thinking": false
}
```

系统会根据模型类型自动选择正确的参数格式。