# ZAI SDK（智谱 AI）官方实现文档

## 概述

ZAI SDK 是智谱 AI 官方提供的 Python SDK，用于调用智谱 AI 的各种大模型 API，包括：

- **GLM-4.6V**: 多模态视频理解模型
- **GLM-4V**: 图像理解模型
- **CogVideoX**: 视频生成模型
- **Agent 系统**: 智能体调用

## 安装

```bash
pip install zai
```

## 1. GLM-4.6V 视频理解

### 视频格式支持
- 支持格式：mp4, avi, rmvb, mov, flv, mkv, webm, wmv
- 视频限制：最长 10 分钟，最大 200MB

### 基本调用示例

```python
from zai import ZaiClient

# 初始化客户端
client = ZaiClient(api_key="your-api-key")

# GLM-4.6V 视频理解
response = client.chat.completions.create(
    model="glm-4.6v",  # 注意：模型名称为小写
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "video_url",
                    "video_url": {
                        "url": "https://example.com/video.mp4"
                    }
                },
                {
                    "type": "text",
                    "text": "请描述这个视频的内容"
                }
            ]
        }
    ],
    temperature=0.5,
    max_tokens=2000,
    stream=True  # 支持流式输出
)

# 处理响应
if response.choices:
    print(response.choices[0].message.content)
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| model | string | 是 | 模型名称，使用 "glm-4.6v" |
| messages | array | 是 | 消息列表 |
| temperature | float | 否 | 控制输出的随机性，0-1之间 |
| max_tokens | int | 否 | 最大输出 token 数 |
| stream | bool | 否 | 是否使用流式输出 |

### 视频内容格式

```json
{
    "type": "video_url",
    "video_url": {
        "url": "视频URL地址"
    }
}
```

## 2. GLM-4V 图像理解

### Base64 编码图像

```python
from zai import ZaiClient
import base64

def encode_image(image_path):
    """将图片编码为base64格式"""
    with open(image_path, 'rb') as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

client = ZaiClient(api_key="your-api-key")
base64_image = encode_image('path/to/image.jpg')

response = client.chat.completions.create(
    model='glm-4v',
    messages=[
        {
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': "请描述这张图片的内容"
                },
                {
                    'type': 'image_url',
                    'image_url': {
                        'url': f'data:image/jpeg;base64,{base64_image}'
                    }
                },
            ],
        }
    ],
    temperature=0.5,
    max_tokens=2000,
)

print(response.choices[0].message.content)
```

### 图像 URL 方式

```python
response = client.chat.completions.create(
    model='glm-4v',
    messages=[
        {
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': "这是什么？"
                },
                {
                    'type': 'image_url',
                    'image_url': {
                        'url': 'https://example.com/image.jpg'
                    }
                },
            ],
        }
    ],
)
```

## 3. CogVideoX 视频生成

### 文本生成视频

```python
from zai import ZaiClient
import asyncio
import time

client = ZaiClient(api_key="your-api-key")

# 提交视频生成任务
response = client.videos.generations(
    model="cogvideox-2",
    prompt="一只猫在阳光明媚的花园里玩球",
    quality="quality",  # "quality" 或 "speed"
    with_audio=True,
    size="1920x1080",  # 支持最高 4K: "3840x2160"
    fps=30,  # 帧率：30 或 60
)

print(f"任务已提交，任务ID: {response.id}")

# 轮询获取结果
async def wait_for_video(task_id, max_wait_time=300):
    start_time = time.time()
    while True:
        if time.time() - start_time > max_wait_time:
            raise TimeoutError(f"视频生成超时：{max_wait_time}秒")

        result = client.videos.retrieve_videos_result(id=task_id)

        if hasattr(result, 'task_status'):
            if result.task_status == "SUCCESS":
                print("视频生成完成！")
                print(f"视频URL: {result.video_result[0].url}")
                print(f"封面图URL: {result.video_result[0].cover_image_url}")
                return result
            elif result.task_status == "FAIL":
                raise Exception(f"视频生成失败: {result}")
            elif result.task_status in ["PROCESSING", "SUBMITTED"]:
                print(f"状态: {result.task_status}, 等待中...")

        await asyncio.sleep(5)

# 执行异步轮询
result = asyncio.run(wait_for_video(response.id))
```

### 图片生成视频

```python
from zai import ZaiClient

client = ZaiClient(api_key="your-api-key")

# 图片转视频
response = client.videos.generations(
    model="cogvideox-2",
    image_url="https://example.com/image.jpg",  # 图片URL或base64
    prompt="让画面动起来",
    quality="speed",
    with_audio=True,
    size="1920x1080",
    fps=30,
)
```

## 4. Agent 智能体调用

### 特效视频 Agent

```python
from zai import ZaiClient
import asyncio
import time

client = ZaiClient(api_key="your-api-key")

# 提交特效视频任务
response = client.agents.invoke(
    agent_id="vidu_template_agent",
    custom_variables={
        "template": "french_kiss"  # 模板ID
    },
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "两个人物接近并深情接吻"
                },
                {
                    "type": "image_url",
                    "image_url": "https://example.com/image.jpg"
                }
            ]
        }
    ]
)

async_id = response.async_id
print(f"异步任务ID: {async_id}")

# 轮询获取结果
async def wait_for_agent_result(agent_id, async_id, max_wait=300):
    start_time = time.time()
    while time.time() - start_time < max_wait:
        result = client.agents.async_result(
            agent_id=agent_id,
            async_id=async_id
        )

        if result.status == "success":
            print("Agent任务完成！")
            return result
        elif result.status == "failed":
            raise Exception("Agent任务失败")

        print(f"状态: {result.status}, 等待中...")
        await asyncio.sleep(5)

    raise TimeoutError("Agent任务超时")

result = asyncio.run(wait_for_agent_result("vidu_template_agent", async_id))
```

## 5. 错误处理

### 常见错误码

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 401 | API Key 无效 | 检查 API Key 是否正确 |
| 400 | 请求参数错误 | 检查请求格式是否符合要求 |
| 429 | 请求频率过高 | 降低请求频率 |
| 500 | 服务器内部错误 | 稍后重试 |

### 错误处理示例

```python
from zai import ZaiClient
from zai.errors import ZAIError

client = ZaiClient(api_key="your-api-key")

try:
    response = client.chat.completions.create(
        model="glm-4.6v",
        messages=[...]
    )
except ZAIError as e:
    print(f"ZAI错误: {e}")
    # 根据错误类型处理
    if e.status_code == 401:
        print("API Key无效，请检查配置")
    elif e.status_code == 429:
        print("请求过于频繁，请稍后重试")
except Exception as e:
    print(f"未知错误: {e}")
```

## 6. 最佳实践

### 1. 视频预处理

- 确保视频 URL 可公开访问
- 视频格式符合要求（mp4, mov 等）
- 视频大小不超过 200MB
- 视频时长不超过 10 分钟

### 2. 提示词优化

```python
# 好的提示词示例
prompt = """
请详细分析这个视频，包括：
1. 视频中的主要人物和动作
2. 场景和环境描述
3. 视频的整体主题和情感
4. 任何值得注意的细节
"""

# 避免过于简单的提示
bad_prompt = "这个视频讲了什么？"
```

### 3. 流式输出处理

```python
def stream_response(response):
    """处理流式响应"""
    full_content = ""
    for chunk in response:
        if chunk.choices:
            content = chunk.choices[0].delta.content
            if content:
                print(content, end='', flush=True)
                full_content += content
    return full_content
```

### 4. 异步任务管理

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def batch_video_analysis(video_urls):
    """批量处理视频分析"""
    tasks = []
    for url in video_urls:
        task = analyze_single_video(url)
        tasks.append(task)

    results = await asyncio.gather(*tasks)
    return results
```

## 7. 项目中的实际应用

在 YouMedHub 项目中，ZAI SDK 的集成示例：

```python
# services/ai_service.py
from zai import ZaiClient

class ZAIService:
    def __init__(self, api_key: str):
        self.client = ZaiClient(api_key=api_key)

    async def analyze_video(self, video_url: str, prompt: str) -> str:
        """分析视频内容"""
        response = self.client.chat.completions.create(
            model="glm-4.6v",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "video_url",
                            "video_url": {
                                "url": video_url
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }
            ],
            temperature=0.5,
            max_tokens=2000,
            stream=False
        )

        return response.choices[0].message.content
```

## 参考链接

- [ZAI SDK GitHub](https://github.com/thudm/z-ai-sdk-python)
- [GLM-4.6V 官方文档](https://docs.bigmodel.cn/cn/guide/models/vlm/glm-4.6v.md)
- [智谱 AI 开放平台](https://open.bigmodel.cn/)