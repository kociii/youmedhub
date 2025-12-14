# DashScope SDK（阿里云）官方实现文档

## 概述

DashScope SDK 是阿里云官方提供的 Python SDK，用于调用通义千问系列模型，包括：

- **Qwen-VL-Plus/Max**: 多模态视频理解模型
- **Qwen-Turbo/Plus/Max**: 文本对话模型
- **Image Synthesis**: 图像生成模型（wanx）
- **Speech Synthesis**: 语音合成模型（sambert）

## 安装

```bash
pip install dashscope
```

## 1. 环境配置

### 设置 API Key

```python
# 方法1：环境变量
export DASHSCOPE_API_KEY='YOUR-DASHSCOPE-API-KEY'

# 方法2：代码中设置
import dashscope
dashscope.api_key = 'YOUR-DASHSCOPE-API-KEY'
```

## 2. Qwen-VL 视频理解

### 基本调用示例

```python
from http import HTTPStatus
from dashscope import MultiModalConversation

# 初始化消息
messages = [
    {
        "role": "system",
        "content": [
            {"text": "你是一个专业的视频分析助手。"}
        ]
    },
    {
        "role": "user",
        "content": [
            {"image": "https://example.com/video-poster.jpg"},
            {"text": "这是一个医疗教学视频的封面，请分析视频可能包含的内容。"}
        ]
    }
]

# 调用模型
response = MultiModalConversation.call(
    model='qwen-vl-plus',  # 或 'qwen-vl-max' 更强的能力
    messages=messages,
    api_key='YOUR-DASHSCOPE-API-KEY'
)

# 处理响应
if response.status_code == HTTPStatus.OK:
    print('回答:', response.output.choices[0].message.content)
else:
    print(f'错误: {response.message}')
```

### 多轮对话

```python
# 添加助手回复
messages.append({
    "role": "assistant",
    "content": [{"text": "从封面看，这可能是关于心脏解剖的教学视频。"}]
})

# 继续提问
messages.append({
    "role": "user",
    "content": [
        {"text": "请详细说明视频中可能的教学重点。"}
    ]
})

# 继续对话
response = MultiModalConversation.call(
    model='qwen-vl-plus',
    messages=messages
)

if response.status_code == HTTPStatus.OK:
    print('进一步分析:', response.output.choices[0].message.content)
```

## 3. Qwen 文本对话

### 同步调用

```python
from http import HTTPStatus
from dashscope import Generation

def basic_chat():
    response = Generation.call(
        model=Generation.Models.qwen_turbo,
        prompt='请解释什么是心肌梗死？',
        api_key='YOUR-DASHSCOPE-API-KEY'
    )

    if response.status_code == HTTPStatus.OK:
        print('回答:', response.output.text)
    else:
        print(f'错误: {response.message}')

basic_chat()
```

### 使用消息格式

```python
from dashscope.api_entities.dashscope_response import Role

messages = [
    {'role': Role.SYSTEM, 'content': '你是一个医学专家助手。'},
    {'role': Role.USER, 'content': '什么是心电图？'}
]

response = Generation.call(
    Generation.Models.qwen_plus,
    messages=messages,
    result_format='message',  # 设置为消息格式
    temperature=0.7,
    max_tokens=1000
)

if response.status_code == HTTPStatus.OK:
    print('回答:', response.output.choices[0].message.content)
```

### 流式输出

```python
from http import HTTPStatus
from dashscope import Generation

def stream_chat():
    prompt_text = '请详细说明新冠病毒的传播途径和预防措施'

    responses = Generation.call(
        model=Generation.Models.qwen_turbo,
        prompt=prompt_text,
        stream=True,  # 启用流式输出
        temperature=0.7,
        max_tokens=2000
    )

    print("流式响应：")
    for response in responses:
        if response.status_code == HTTPStatus.OK:
            print(response.output.text, end='', flush=True)
        else:
            print(f'\n错误: {response.message}')

stream_chat()
```

## 4. 图像生成

### 同步图像生成

```python
from http import HTTPStatus
from dashscope import ImageSynthesis
import requests

response = ImageSynthesis.sync_call(
    model='wanx-v1',  # 或 'wanx-sketch-to-image-lite' 等
    prompt='一个现代化的医院手术室，干净整洁，有先进的医疗设备',
    negative_prompt='模糊，低质量，扭曲',
    size='1024*1024',  # 支持: 512*512, 1024*1024, 2048*2048
    n=1,  # 生成图片数量
    api_key='YOUR-DASHSCOPE-API-KEY'
)

if response.status_code == HTTPStatus.OK:
    image_url = response.output.results[0].url
    print(f'生成的图片URL: {image_url}')

    # 下载图片
    img_data = requests.get(image_url).content
    with open('hospital_operation_room.jpg', 'wb') as f:
        f.write(img_data)
    print('图片已保存')
else:
    print(f'错误: {response.message}')
```

### 异步图像生成

```python
from http import HTTPStatus
from dashscope import ImageSynthesis

# 提交异步任务
response = ImageSynthesis.async_call(
    model=ImageSynthesis.Models.wanx_v1,
    prompt='一张心脏解剖图，专业医学风格',
    negative_prompt='卡通，简化，不专业',
    n=1,
    size='1024*1024',
    api_key='YOUR-DASHSCOPE-API-KEY'
)

if response.status_code == HTTPStatus.OK:
    task_id = response.output.task_id
    print(f'任务已创建: {task_id}')

    # 等待任务完成
    result = ImageSynthesis.wait(task=task_id)

    if result.status_code == HTTPStatus.OK:
        for idx, img in enumerate(result.output.results):
            print(f'图片 {idx} URL: {img.url}')
    else:
        print(f'任务失败: {result.message}')
```

## 5. 语音合成

### 基本语音合成

```python
from http import HTTPStatus
from dashscope.audio.tts import SpeechSynthesizer

result = SpeechSynthesizer.call(
    model='sambert-zhichu-v1',  # 语音模型
    text='欢迎使用阿里云语音合成服务，这里是一个医学教学示例。',
    api_key='YOUR-DASHSCOPE-API-KEY',
    format='mp3',  # 音频格式：mp3, wav, pcm
    sample_rate=16000,  # 采样率
    volume=50,  # 音量：0-100
    rate=1.0,  # 语速：0.5-2.0
    pitch=1.0  # 音调：0.5-2.0
)

if result.get_response().status_code == HTTPStatus.OK:
    audio_data = result.get_audio_data()
    with open('output.mp3', 'wb') as f:
        f.write(audio_data)
    print(f'音频已保存，大小: {len(audio_data)} bytes')
else:
    print(f'错误: {result.get_response().message}')
```

### 带时间戳的语音合成

```python
result = SpeechSynthesizer.call(
    model='sambert-zhichu-v1',
    text='这是带时间戳的语音合成示例。',
    word_timestamp_enabled=True,  # 启用词级别时间戳
    api_key='YOUR-DASHSCOPE-API-KEY'
)

if result.get_response().status_code == HTTPStatus.OK:
    # 保存音频
    audio_data = result.get_audio_data()
    with open('output_with_timestamps.mp3', 'wb') as f:
        f.write(audio_data)

    # 获取时间戳
    timestamps = result.get_timestamps()
    if timestamps:
        print("时间戳信息：")
        for ts in timestamps:
            print(f"词语: {ts.get('text')}, "
                  f"开始: {ts.get('begin_time')}ms, "
                  f"结束: {ts.get('end_time')}ms")
```

### 流式语音合成

```python
from dashscope.audio.tts import ResultCallback, SpeechSynthesisResult

class StreamingCallback(ResultCallback):
    def on_open(self):
        print('语音合成开始')

    def on_complete(self):
        print('\n语音合成完成')

    def on_error(self, response):
        print(f'错误: {response.message}')

    def on_close(self):
        print('连接关闭')

    def on_event(self, result: SpeechSynthesisResult):
        if result.get_audio_frame():
            audio_chunk = result.get_audio_frame()
            print(f'收到音频块: {len(audio_chunk)} bytes')
            # 这里可以实时处理音频块

callback = StreamingCallback()
result = SpeechSynthesizer.call(
    model='sambert-zhichu-v1',
    text='这是一个较长的文本，将以流式方式合成语音。',
    callback=callback,
    word_timestamp_enabled=True
)
```

## 6. 项目中的实际应用

### 视频分析服务示例

```python
# services/video_analysis_service.py
from http import HTTPStatus
from dashscope import MultiModalConversation
from typing import List, Dict, Any
import json

class VideoAnalysisService:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def analyze_medical_video(self, video_url: str, question: str) -> Dict[str, Any]:
        """分析医学视频"""
        messages = [
            {
                "role": "system",
                "content": [
                    {"text": "你是一个专业的医学教育视频分析专家。"}
                ]
            },
            {
                "role": "user",
                "content": [
                    {"image": video_url},
                    {"text": f"请分析这个医学视频，特别关注：{question}"}
                ]
            }
        ]

        response = MultiModalConversation.call(
            model='qwen-vl-plus',
            messages=messages,
            temperature=0.3,  # 降低温度以获得更准确的回答
            max_tokens=2000
        )

        if response.status_code == HTTPStatus.OK:
            result = {
                'success': True,
                'analysis': response.output.choices[0].message.content,
                'model': 'qwen-vl-plus',
                'usage': response.usage
            }
        else:
            result = {
                'success': False,
                'error': response.message
            }

        return result

    def generate_video_summary(self, video_url: str) -> Dict[str, Any]:
        """生成视频摘要"""
        prompt = """
        请为这个医学视频生成一个结构化的摘要，包括：
        1. 视频主题
        2. 主要教学内容
        3. 关键知识点
        4. 适合的学习对象
        5. 预计学习时长
        """

        return self.analyze_medical_video(video_url, prompt)
```

### 流式对话服务

```python
# services/streaming_chat_service.py
from http import HTTPStatus
from dashscope import Generation
from typing import Iterator, Optional

class StreamingChatService:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def stream_medical_consultation(
        self,
        question: str,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> Iterator[str]:
        """流式医疗咨询对话"""

        # 构建消息
        system_prompt = """你是一个专业的医疗AI助手。请提供准确、有用的医学信息。
        注意：
        1. 始终建议用户咨询专业医生
        2. 不要提供具体的诊断或治疗方案
        3. 提供一般性的医学知识和建议
        """

        messages = [
            {'role': 'system', 'content': system_prompt}
        ]

        if context:
            messages.extend([
                {'role': 'user', 'content': context},
                {'role': 'assistant', 'content': '我已理解上下文，请继续提问。'}
            ])

        messages.append({'role': 'user', 'content': question})

        # 流式调用
        responses = Generation.call(
            model=Generation.Models.qwen_turbo,
            messages=messages,
            stream=True,
            temperature=temperature,
            max_tokens=2000
        )

        for response in responses:
            if response.status_code == HTTPStatus.OK:
                yield response.output.text
            else:
                yield f"错误：{response.message}"
                break
```

## 7. 高级功能

### 内容安全过滤

```python
# 可以通过设置 system message 来确保内容合规
safe_system_prompt = """
请确保你的回答：
1. 不包含任何有害或非法内容
2. 不提供具体的医疗诊断
3. 不建议停止或更改处方药
4. 始终建议咨询专业医生
5. 仅提供一般性的医学信息和教育内容
"""
```

### 性能优化

```python
# 使用连接池提高性能
import dashscope
from dashscope.api_entities.dashscope_response import Role

class OptimizedService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        # 批量处理消息
        self.message_cache = []

    def add_to_cache(self, role: str, content: str):
        """添加消息到缓存"""
        self.message_cache.append({
            'role': role,
            'content': content
        })

    def clear_cache(self):
        """清空消息缓存"""
        self.message_cache = []

    def batch_process(self, prompts: List[str]) -> List[str]:
        """批量处理提示"""
        results = []
        for prompt in prompts:
            self.add_to_cache(Role.USER, prompt)
            response = self._call_model()
            results.append(response)
            self.add_to_cache(Role.ASSISTANT, response)
        return results
```

## 8. 错误处理

```python
from http import HTTPStatus
from dashscope import Generation

class DashScopeErrorHandler:
    @staticmethod
    def handle_error(response):
        """处理 DashScope 错误"""
        if response.status_code == HTTPStatus.UNAUTHORIZED:
            return "API Key 无效，请检查配置"
        elif response.status_code == HTTPStatus.TOO_MANY_REQUESTS:
            return "请求过于频繁，请稍后重试"
        elif response.status_code == HTTPStatus.BAD_REQUEST:
            return f"请求参数错误: {response.message}"
        elif response.status_code == HTTPStatus.INTERNAL_SERVER_ERROR:
            return "服务器内部错误，请稍后重试"
        else:
            return f"未知错误: {response.message}"
```

## 9. 监控和日志

```python
import logging
import time
from typing import Any, Dict

class DashScopeMonitor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def log_request(self, model: str, prompt_length: int, params: Dict[str, Any]):
        """记录请求信息"""
        self.logger.info(f"DashScope Request - Model: {model}, "
                        f"Prompt Length: {prompt_length}, "
                        f"Params: {params}")

    def log_response(self, response_time: float, token_usage: Dict[str, int]):
        """记录响应信息"""
        self.logger.info(f"DashScope Response - Time: {response_time:.2f}s, "
                        f"Tokens: {token_usage}")

    def wrap_with_monitoring(self, func):
        """装饰器：添加监控"""
        def wrapper(*args, **kwargs):
            start_time = time.time()
            prompt_length = len(str(kwargs.get('prompt', '')))

            # 记录请求
            self.log_request(
                model=kwargs.get('model', 'unknown'),
                prompt_length=prompt_length,
                params=kwargs
            )

            # 执行请求
            response = func(*args, **kwargs)

            # 记录响应
            response_time = time.time() - start_time
            self.log_response(
                response_time=response_time,
                token_usage=getattr(response, 'usage', {})
            )

            return response

        return wrapper
```

## 参考链接

- [DashScope SDK Python](https://github.com/dashscope/dashscope-sdk-python)
- [通义千问模型文档](https://help.aliyun.com/zh/dashscope/)
- [阿里云控制台](https://dashscope.console.aliyun.com/)
- [API 参考文档](https://help.aliyun.com/zh/dashscope/developer-reference/api-details)