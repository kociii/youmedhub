/**
 * 统一分析入口
 * 整合 Aliyun 和 Volcengine 的调用
 */

import type { ModelConfig } from '@/lib/openai-client'
import * as aliyun from './providers/aliyun'
import * as volcengine from './providers/volcengine'

// 导出所有模型配置
export const ALL_MODELS: ModelConfig[] = [
  ...aliyun.ALIYUN_MODELS,
  ...volcengine.VOLCENGINE_MODELS,
]

// 按提供商分组
export const MODELS_BY_PROVIDER = {
  aliyun: aliyun.ALIYUN_MODELS,
  volcengine: volcengine.VOLCENGINE_MODELS,
}

// 获取模型配置
export function getModelConfig(modelId: string): ModelConfig | undefined {
  return ALL_MODELS.find(m => m.id === modelId)
}

// 获取模型的默认 API Key（从 localStorage）
export function getApiKeyForModel(modelId: string): string {
  const config = getModelConfig(modelId)
  if (!config) return ''

  const key = config.provider === 'aliyun'
    ? localStorage.getItem('dashscope_api_key')
    : localStorage.getItem('ark_api_key')

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
}

// 视频分析
export async function analyzeVideo(options: AnalyzeVideoOptions): Promise<string> {
  const config = getModelConfig(options.model)
  if (!config) {
    throw new Error(`未知模型: ${options.model}`)
  }

  if (config.provider === 'aliyun') {
    return aliyun.analyzeVideo(options)
  } else {
    return volcengine.analyzeVideo(options)
  }
}

// 图片分析选项
export interface AnalyzeImageOptions {
  model: string
  apiKey: string
  imageUrl: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
}

// 图片分析
export async function analyzeImage(options: AnalyzeImageOptions): Promise<string> {
  const config = getModelConfig(options.model)
  if (!config) {
    throw new Error(`未知模型: ${options.model}`)
  }

  if (config.provider === 'aliyun') {
    return aliyun.analyzeImage(options)
  } else {
    return volcengine.analyzeImage(options)
  }
}

// 文本生成选项
export interface GenerateTextOptions {
  model: string
  apiKey: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
}

// 文本生成（流式）
export async function generateText(options: GenerateTextOptions): Promise<string> {
  const config = getModelConfig(options.model)
  if (!config) {
    throw new Error(`未知模型: ${options.model}`)
  }

  if (config.provider === 'aliyun') {
    return aliyun.generateText(options)
  } else {
    return volcengine.generateText(options)
  }
}

// 文本生成（非流式）
export async function generateTextSync(
  options: Omit<GenerateTextOptions, 'onChunk'>
): Promise<{ content: string; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> {
  const config = getModelConfig(options.model)
  if (!config) {
    throw new Error(`未知模型: ${options.model}`)
  }

  if (config.provider === 'aliyun') {
    return aliyun.generateTextSync(options)
  } else {
    return volcengine.generateTextSync(options)
  }
}
