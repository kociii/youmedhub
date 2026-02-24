/**
 * 统一分析入口
 * 整合 Aliyun 的调用
 */

import { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById } from '@/config/models'
import type { ModelConfig } from '@/config/models'
import * as aliyun from './providers/aliyun'

// 导出模型配置
export { AVAILABLE_MODELS, MODELS_BY_PROVIDER, getModelById }
export type { ModelConfig }

// 获取模型的默认 API Key（从 localStorage）
export function getApiKeyForModel(modelId: string): string {
  const model = getModelById(modelId)
  if (!model) return ''

  const key = localStorage.getItem('dashscope_api_key')
  return key || ''
}

// 视频分析选项
export interface AnalyzeVideoOptions {
  model: string
  apiKey: string
  videoUrl: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  // 模型参数
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  // 思考模式
  enableThinking?: boolean
  onReasoningChunk?: (chunk: string) => void
}

// 视频分析
export async function analyzeVideo(options: AnalyzeVideoOptions): Promise<string> {
  return aliyun.analyzeVideo(options)
}

// 图片分析选项
export interface AnalyzeImageOptions {
  model: string
  apiKey: string
  imageUrl: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  // 模型参数
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  // 思考模式
  enableThinking?: boolean
  onReasoningChunk?: (chunk: string) => void
}

// 图片分析
export async function analyzeImage(options: AnalyzeImageOptions): Promise<string> {
  return aliyun.analyzeImage(options)
}

// 文本生成选项
export interface GenerateTextOptions {
  model: string
  apiKey: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  // 模型参数
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
  // 思考模式
  enableThinking?: boolean
  onReasoningChunk?: (chunk: string) => void
}

// 文本生成（流式）
export async function generateText(options: GenerateTextOptions): Promise<string> {
  return aliyun.generateText(options)
}

// 文本生成（非流式）
export async function generateTextSync(
  options: Omit<GenerateTextOptions, 'onChunk'>
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  return aliyun.generateTextSync(options)
}
