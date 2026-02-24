import type { VideoAnalysisResponse, TokenUsage } from '../types/video';
import { uploadToTemporaryFile, validateVideoFile } from './temporaryFile';
import { VIDEO_ANALYSIS_PROMPT } from '../prompts/videoAnalysis';
import * as analysis from './analysis';
import type { ModelConfig } from '@/config/models';
import { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById } from '@/config/models';

// 导出提示词供组件使用
export { VIDEO_ANALYSIS_PROMPT };

// 导出模型相关
export { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById };
export type { ModelConfig };

// AI 模型类型
export type AIModel = 'qwen3.5-plus';

// 流式输出回调类型
export type StreamCallback = (chunk: string) => void;

// Token 使用回调类型
export type TokenUsageCallback = (usage: TokenUsage) => void;

// 思考内容回调类型
export type ReasoningCallback = (chunk: string) => void;

// 分析参数接口
export interface AnalysisParams {
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  enableThinking?: boolean
}

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
  if (message.includes('AuthenticationNotPass') || message.includes('401')) {
    return 'API Key 验证失败，请检查 API Key 是否正确';
  }
  if (message.includes('Throttling')) {
    return 'API 请求频率过高，请稍后重试';
  }

  return message || 'API 请求失败，请重试';
}

// 使用视频 URL 分析（核心分析逻辑）- 使用新接口
async function analyzeVideoByUrl(
  videoUrl: string,
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback,
  params?: AnalysisParams,
  onReasoning?: ReasoningCallback
): Promise<VideoAnalysisResponse> {
  onProgress?.('正在调用 AI 分析视频...');

  try {
    const fullContent = await analysis.analyzeVideo({
      model,
      apiKey,
      videoUrl,
      prompt,
      onChunk: onStream,
      onUsage: onTokenUsage,
      temperature: params?.temperature,
      top_p: params?.top_p,
      frequency_penalty: params?.frequency_penalty,
      presence_penalty: params?.presence_penalty,
      enableThinking: params?.enableThinking,
      onReasoningChunk: onReasoning,
    });

    onProgress?.('正在解析分析结果...');

    // 将 Markdown 转换为 JSON
    return parseMarkdownTable(fullContent);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(parseErrorMessage(error));
    }
    throw new Error('AI 分析失败');
  }
}

// 通过临时文件服务分析视频（主要方法）
async function analyzeVideoByTemporaryFile(
  file: File,
  apiKey: string,
  model: AIModel,
  prompt: string,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback,
  params?: AnalysisParams,
  onReasoning?: ReasoningCallback
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
    return await analyzeVideoByUrl(uploadResult.downloadLink, apiKey, model, prompt, onProgress, onStream, onTokenUsage, params, onReasoning);

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
  model: AIModel = 'qwen3.5-plus',
  prompt: string = VIDEO_ANALYSIS_PROMPT,
  onProgress?: (message: string) => void,
  onStream?: StreamCallback,
  onTokenUsage?: TokenUsageCallback,
  params?: AnalysisParams,
  onReasoning?: ReasoningCallback
): Promise<VideoAnalysisResponse> {
  if (typeof source === 'string') {
    // 如果是 URL，直接分析
    return analyzeVideoByUrl(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage, params, onReasoning);
  } else {
    // 如果是文件，通过临时文件服务上传后分析
    return analyzeVideoByTemporaryFile(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage, params, onReasoning);
  }
}
