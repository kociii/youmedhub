import type { VideoAnalysisResponse } from '../types/video';

const ANALYSIS_PROMPT = `你是一个资深且专业的视频创作者,从业多年,不仅能够独立完成视频的脚本创作、视频拍摄、视频剪辑等工作,还能够很好的鉴赏、分析识别,准确的拆解一个视频的内容及要点内容。
根据提供给你的视频,对视频进行分析,并结构化的输出你从视频中分析出的内容。
输出要求:以 json 结构输出
表格标题:序号、景别、运镜方式、画面内容、画面文案、口播、音效/音乐、时长、关键画面帧数
口播定义:口播是视频中人物的说话内容。
运镜方式定义:运镜方式是视频中运镜的方式，包括平移、旋转、缩放、上摇、跟焦等。
音效/音乐定义:音效/音乐是视频中背景音乐、环境音效、物品声音等音效。
时长定义:时长是视频中每个画面或场景的持续时间，包括画面停留时间、画面切换时间、画面过渡时间等。
关键画面帧数定义:当前序号对应的这个画面中，最具有代表性的帧数，用于后续截图。
补充【关键画面帧数】:脚本拆解后需要给他人分享并让其复刻,所以需要对应画面的某一帧的截图作为参考,需要在关键画面输出视频的帧数(精确到:分:秒:帧数),以便对视频进行截图,并把截图结果传到表格中
json格式字段对应:
{
  "rep": [
    {
      "sequenceNumber": 1,
      "shotType": "",
      "cameraMovement": "",
      "visualContent": "",
      "onScreenText": "",
      "voiceover": "",
      "audio": "",
      "duration": "00:00",
      "keyframeTimes": "00:00"
    }
  ]
}
字段说明:
- sequenceNumber: 序号
- shotType: 景别
- cameraMovement: 运镜方式
- visualContent: 画面内容
- onScreenText: 画面文案
- voiceover: 口播
- audio: 音效/音乐
- duration: 时长
- keyframeTimes: 关键画面帧数(分、秒、帧数)

请只返回JSON格式的结果，不要包含其他文字说明。`;

// 最大文件大小 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 将视频文件转换为 base64
export async function videoToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data:video/xxx;base64, 前缀
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 获取视频的 MIME 类型
function getVideoMimeType(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
  };
  return mimeTypes[extension || ''] || 'video/mp4';
}

// 解析 API 返回的 JSON 内容
function parseAnalysisResult(content: string): VideoAnalysisResponse {
  // 尝试从返回内容中提取 JSON
  let jsonContent = content;

  // 如果返回内容包含 markdown 代码块，提取其中的 JSON
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonContent = jsonMatch[1].trim();
  }

  try {
    const result = JSON.parse(jsonContent) as VideoAnalysisResponse;
    return result;
  } catch {
    // 尝试直接查找 JSON 对象
    const jsonObjectMatch = content.match(/\{[\s\S]*"rep"[\s\S]*\}/);
    if (jsonObjectMatch) {
      return JSON.parse(jsonObjectMatch[0]) as VideoAnalysisResponse;
    }
    throw new Error('无法解析 AI 返回的 JSON 格式');
  }
}

// 解析错误信息
function parseErrorMessage(error: any): string {
  const message = error?.error?.message || error?.message || '';

  if (message.includes('SafetyError') || message.includes('DataInspection')) {
    return '视频内容安全检查未通过，请尝试使用其他视频或使用在线视频 URL';
  }
  if (message.includes('InvalidParameter')) {
    return '参数无效，请检查视频格式是否支持（建议使用 MP4 格式）';
  }
  if (message.includes('TooLarge') || message.includes('size')) {
    return '视频文件过大，请使用小于 10MB 的视频或使用在线视频 URL';
  }
  if (message.includes('AuthenticationNotPass')) {
    return 'API Key 验证失败，请检查 API Key 是否正确';
  }
  if (message.includes('Throttling')) {
    return 'API 请求频率过高，请稍后重试';
  }

  return message || 'API 请求失败，请重试';
}

// 使用视频 URL 分析（推荐）
export async function analyzeVideoByUrl(
  videoUrl: string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<VideoAnalysisResponse> {
  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: videoUrl,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(parseErrorMessage(data));
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');
  return parseAnalysisResult(content);
}

// 使用本地文件分析（通过 base64）
export async function analyzeVideoByFile(
  file: File,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<VideoAnalysisResponse> {
  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`视频文件过大（${(file.size / 1024 / 1024).toFixed(1)}MB），请使用小于 10MB 的视频或使用在线视频 URL 模式`);
  }

  onProgress?.('正在读取视频文件...');

  const base64Video = await videoToBase64(file);
  const mimeType = getVideoMimeType(file);

  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-vl-max',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'video_url',
              video_url: {
                url: `data:${mimeType};base64,${base64Video}`,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(parseErrorMessage(data));
  }

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');
  return parseAnalysisResult(content);
}

// 统一分析接口 - 自动选择模式
export async function analyzeVideo(
  source: File | string,
  apiKey: string,
  onProgress?: (message: string) => void
): Promise<VideoAnalysisResponse> {
  if (typeof source === 'string') {
    return analyzeVideoByUrl(source, apiKey, onProgress);
  } else {
    return analyzeVideoByFile(source, apiKey, onProgress);
  }
}
