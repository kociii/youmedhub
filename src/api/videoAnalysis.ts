import type { VideoAnalysisResponse, TokenUsage } from '../types/video'
import { uploadToTemporaryFile, validateVideoFile } from './temporaryFile'
import {
  VIDEO_ANALYSIS_PROMPT,
  buildPromptByMode,
  getPromptByMode,
  type AnalysisMode,
  type CreatePromptContext,
  type ReferencePromptContext,
} from '../prompts/videoAnalysis'
import * as analysis from './analysis'
import type { ModelConfig } from '@/config/models'
import { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById } from '@/config/models'

// 导出提示词供组件使用
export { VIDEO_ANALYSIS_PROMPT, buildPromptByMode, getPromptByMode }
export type { AnalysisMode, CreatePromptContext, ReferencePromptContext }

// 导出模型相关
export { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById }
export type { ModelConfig }

// AI 模型类型
export type AIModel = 'qwen3.5-flash' | 'qwen3.5-plus'

// 流式输出回调类型
export type StreamCallback = (chunk: string) => void

// Token 使用回调类型
export type TokenUsageCallback = (usage: TokenUsage) => void

// 思考内容回调类型
export type ReasoningCallback = (chunk: string) => void

// 分析参数接口
export interface AnalysisParams {
  enableThinking?: boolean
}

interface BaseRequestOptions {
  apiKey: string
  model?: AIModel
  customPrompt?: string
  onProgress?: (message: string) => void
  onStream?: StreamCallback
  onTokenUsage?: TokenUsageCallback
  params?: AnalysisParams
  onReasoning?: ReasoningCallback
}

export interface AnalyzeVideoOptions extends BaseRequestOptions {
  source: File | string
  mode?: AnalysisMode
}

export interface GenerateCreateScriptOptions extends BaseRequestOptions {
  mode: 'create'
  context: CreatePromptContext
}

export interface GenerateReferenceScriptOptions extends BaseRequestOptions {
  mode: 'reference'
  context: ReferencePromptContext
}

export type GenerateScriptOptions = GenerateCreateScriptOptions | GenerateReferenceScriptOptions

// 解析 Markdown 表格转换为 JSON
function parseMarkdownTable(markdown: string): VideoAnalysisResponse {
  const lines = markdown.trim().split('\n')
  const rep: VideoAnalysisResponse['rep'] = []

  // 找到表格开始位置（包含表头的行）
  // 兼容两种表头格式：'运镜方式' 或 '运镜'
  let tableStartIndex = -1
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line && line.includes('序号') && line.includes('景别') && (line.includes('运镜方式') || line.includes('运镜'))) {
      tableStartIndex = i
      break
    }
  }

  if (tableStartIndex === -1) {
    throw new Error('未找到有效的 Markdown 表格')
  }

  // 跳过表头和分隔线，从数据行开始解析
  for (let i = tableStartIndex + 2; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line || !line.trim() || !line.startsWith('|')) continue

    // 分割单元格，去除首尾的 |
    const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell)

    if (cells.length >= 11) {
      rep.push({
        sequenceNumber: Number.parseInt(cells[0] || '0', 10) || 0,
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
      })
    } else {
      console.warn(`表格第 ${i} 行列数不足（${cells.length} < 11），跳过`)
    }
  }

  if (rep.length === 0) {
    throw new Error('未能解析出有效的数据行')
  }

  return { rep }
}

// 解析错误信息
function parseErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'API 请求失败，请重试'
  }

  const message = error.message || ''

  if (message.includes('SafetyError') || message.includes('DataInspection')) {
    return '内容安全检查未通过，请尝试调整输入内容'
  }
  if (message.includes('InvalidParameter')) {
    return '参数无效，请检查输入内容和模型参数'
  }
  if (message.includes('TooLarge') || message.includes('size') || message.includes('Exceeded limit')) {
    return '输入内容过大，请精简后重试'
  }
  if (message.includes('AuthenticationNotPass') || message.includes('401')) {
    return 'API Key 验证失败，请检查 API Key 是否正确'
  }
  if (message.includes('Throttling')) {
    return 'API 请求频率过高，请稍后重试'
  }

  return message || 'API 请求失败，请重试'
}

function resolvePrompt(
  mode: AnalysisMode,
  customPrompt?: string,
  context?: CreatePromptContext | ReferencePromptContext
): string {
  const normalizedCustomPrompt = customPrompt?.trim()
  if (normalizedCustomPrompt) {
    return normalizedCustomPrompt
  }

  if (mode === 'create') {
    if (!context || !('topic' in context)) {
      throw new Error('从零创作模式缺少创作参数')
    }
    return buildPromptByMode('create', context)
  }

  if (mode === 'reference') {
    if (!context || !('referenceScript' in context)) {
      throw new Error('参考生成模式缺少参考脚本')
    }
    return buildPromptByMode('reference', context)
  }

  return getPromptByMode('analyze')
}

// 使用视频 URL 分析（核心分析逻辑）
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
  onProgress?.('正在调用 AI 分析视频...')

  const fullContent = await analysis.analyzeVideo({
    model,
    apiKey,
    videoUrl,
    prompt,
    onChunk: onStream,
    onUsage: onTokenUsage,
    enableThinking: params?.enableThinking,
    onReasoningChunk: onReasoning,
  })

  onProgress?.('正在解析分析结果...')
  return parseMarkdownTable(fullContent)
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
  const validation = validateVideoFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  onProgress?.('正在上传视频到临时文件服务...')

  const uploadResult = await uploadToTemporaryFile(file)

  onProgress?.('视频上传成功，正在调用 AI 分析...')

  return analyzeVideoByUrl(
    uploadResult.downloadLink,
    apiKey,
    model,
    prompt,
    onProgress,
    onStream,
    onTokenUsage,
    params,
    onReasoning
  )
}

// 统一视频分析接口
export async function analyzeVideo(options: AnalyzeVideoOptions): Promise<VideoAnalysisResponse> {
  const {
    source,
    apiKey,
    model = 'qwen3.5-plus',
    mode = 'analyze',
    customPrompt,
    onProgress,
    onStream,
    onTokenUsage,
    params,
    onReasoning,
  } = options

  const prompt = resolvePrompt(mode, customPrompt)

  try {
    if (typeof source === 'string') {
      return await analyzeVideoByUrl(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage, params, onReasoning)
    }

    return await analyzeVideoByTemporaryFile(source, apiKey, model, prompt, onProgress, onStream, onTokenUsage, params, onReasoning)
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}

// 文本生成脚本接口（从零创作 / 参考生成）
export async function generateScript(options: GenerateScriptOptions): Promise<VideoAnalysisResponse> {
  const {
    apiKey,
    model = 'qwen3.5-plus',
    mode,
    context,
    customPrompt,
    onProgress,
    onStream,
    onTokenUsage,
    params,
    onReasoning,
  } = options

  const prompt = resolvePrompt(mode, customPrompt, context)
  onProgress?.('正在调用 AI 生成脚本...')

  try {
    // 检查是否有图片输入（支持多图）
    const imageUrls = mode === 'create' && 'imageUrls' in context ? context.imageUrls || [] : []
    const hasImages = imageUrls.length > 0

    let fullContent: string

    if (hasImages) {
      // 多图模式：使用 generateWithImages
      fullContent = await analysis.generateWithImages({
        model,
        apiKey,
        prompt,
        imageUrls,
        onChunk: onStream,
        onUsage: onTokenUsage,
        enableThinking: params?.enableThinking,
        onReasoningChunk: onReasoning,
      })
    } else {
      // 纯文本模式
      fullContent = await analysis.generateText({
        model,
        apiKey,
        prompt,
        onChunk: onStream,
        onUsage: onTokenUsage,
        enableThinking: params?.enableThinking,
        onReasoningChunk: onReasoning,
      })
    }

    onProgress?.('正在解析生成结果...')
    return parseMarkdownTable(fullContent)
  } catch (error) {
    throw new Error(parseErrorMessage(error))
  }
}
