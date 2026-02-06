import type { VideoAnalysisResponse, TokenUsage } from '../types/video';
import { uploadToTemporaryFile, validateVideoFile } from './temporaryFile';
import { VIDEO_ANALYSIS_PROMPT } from '../prompts/videoAnalysis';

// 导出提示词供组件使用
export { VIDEO_ANALYSIS_PROMPT };

// AI 模型类型
export type AIModel = 'qwen3-vl-flash' | 'qwen3-vl-plus';

// 流式输出回调类型
export type StreamCallback = (chunk: string) => void;

// Token 使用回调类型
export type TokenUsageCallback = (usage: TokenUsage) => void;

// 解析 Markdown 表格转换为 JSON
function parseMarkdownTable(markdown: string): VideoAnalysisResponse {
  const lines = markdown.trim().split('\n');
  const rep: VideoAnalysisResponse['rep'] = [];

  // 找到表格开始位置（包含表头的行）
  // 兼容两种表头格式：'运镜方式' 或 '运镜'
  let tableStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.includes('序号') && line.includes('景别') && (line.includes('运镜方式') || line.includes('运镜'))) {
      tableStartIndex = i;
      break;
    }
  }

  if (tableStartIndex === -1) {
    throw new Error('未找到有效的 Markdown 表格');
  }

  // 跳过表头和分隔线，从数据行开始解析
  for (let i = tableStartIndex + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim() || !line.startsWith('|')) continue;

    // 分割单元格，去除首尾的 |
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);

    if (cells.length >= 11) {
      rep.push({
        sequenceNumber: parseInt(cells[0] || '0') || 0,
        shotType: cells[1] || '',
        cameraMovement: cells[2] || '',
        visualContent: cells[3] || '',
        shootingGuide: cells[4] || '',
        onScreenText: cells[5] || '',
        voiceover: cells[6] || '',
        audio: cells[7] || '',
        startTime: cells[8] || '',
        endTime: cells[9] || '',
        duration: cells[10] || '',
      });
    } else {
      console.warn(`表格第 ${i} 行列数不足（${cells.length} < 11），跳过`);
    }
  }

  if (rep.length === 0) {
    throw new Error('未能解析出有效的数据行');
  }

  return { rep };
}

// 解析错误信息
function parseErrorMessage(error: any): string {
  const message = error?.error?.message || error?.message || '';

  if (message.includes('SafetyError') || message.includes('DataInspection')) {
    return '视频内容安全检查未通过，请尝试使用其他视频';
  }
  if (message.includes('InvalidParameter')) {
    return '参数无效，请检查视频格式是否支持（建议使用 MP4 格式）';
  }
  if (message.includes('TooLarge') || message.includes('size') || message.includes('Exceeded limit')) {
    return '视频文件过大，请使用小于 100MB 的视频或检查网络连接';
  }
  if (message.includes('AuthenticationNotPass')) {
    return 'API Key 验证失败，请检查 API Key 是否正确';
  }
  if (message.includes('Throttling')) {
    return 'API 请求频率过高，请稍后重试';
  }

  return message || 'API 请求失败，请重试';
}

// 使用视频 URL 分析（核心分析逻辑）
async function analyzeVideoByUrl(
  videoUrl: string,
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback
): Promise<VideoAnalysisResponse> {
  onProgress?.('正在调用 AI 分析视频...');

  const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
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
              text: prompt,
            },
          ],
        },
      ],
      stream: true, // 启用流式输出
      stream_options: { include_usage: true }, // 获取 Token 使用信息
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(parseErrorMessage(data));
  }

  onProgress?.('正在接收 AI 分析结果...');

  // 处理流式响应
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let chunkCount = 0;

  if (!reader) {
    throw new Error('无法读取响应流');
  }

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个可能不完整的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') continue;

        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.delta?.content;

          if (content) {
            chunkCount++;
            fullContent += content;
            onStream?.(content);
          }

          if (json.usage) {
            onTokenUsage?.(json.usage);
          }
        } catch {
          // 忽略解析错误，继续处理下一行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!fullContent) {
    throw new Error('AI 返回内容为空');
  }

  onProgress?.('正在解析分析结果...');

  // 将 Markdown 转换为 JSON
  return parseMarkdownTable(fullContent);
}

// 通过临时文件服务分析视频（主要方法）
async function analyzeVideoByTemporaryFile(
  file: File,
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback
): Promise<VideoAnalysisResponse> {
  // 验证文件
  const validation = validateVideoFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  onProgress?.('正在上传视频到临时文件服务...');

  try {
    // 上传到临时文件服务
    const uploadResult = await uploadToTemporaryFile(file);

    onProgress?.('视频上传成功，正在调用 AI 分析...');

    // 使用返回的链接进行分析
    return await analyzeVideoByUrl(uploadResult.downloadLink, apiKey, model, prompt, onProgress, onStream, onTokenUsage);

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`上传失败: ${error.message}`);
    }
    throw new Error('视频上传过程中发生未知错误');
  }
}

// 统一分析接口
export async function analyzeVideo(
  source: File | string,
  apiKey: string,
  model: AIModel = 'qwen3-vl-flash',
  prompt: string = VIDEO_ANALYSIS_PROMPT,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback
): Promise<VideoAnalysisResponse> {
  if (typeof source === 'string') {
    // 如果是 URL，直接分析
    return analyzeVideoByUrl(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage);
  } else {
    // 如果是文件，通过临时文件服务上传后分析
    return analyzeVideoByTemporaryFile(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage);
  }
}
