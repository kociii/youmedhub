/**
 * 阿里百炼 (DashScope) Provider
 * OpenAI SDK 兼容格式
 */

import { streamChat, chat } from '@/lib/openai-client'

// 视频分析
export interface VideoAnalysisOptions {
  apiKey: string
  model: string
  videoUrl: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
}

export async function analyzeVideo(options: VideoAnalysisOptions): Promise<string> {
  const { apiKey, model, videoUrl, prompt, onChunk, onUsage } = options

  return streamChat({
    apiKey,
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'video_url', video_url: { url: videoUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    onChunk,
    onUsage,
  })
}

// 图片分析
export interface ImageAnalysisOptions {
  apiKey: string
  model: string
  imageUrl: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
}

export async function analyzeImage(options: ImageAnalysisOptions): Promise<string> {
  const { apiKey, model, imageUrl, prompt, onChunk, onUsage } = options

  return streamChat({
    apiKey,
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    onChunk,
    onUsage,
  })
}

// 文本生成（脚本生成）
export interface TextGenerationOptions {
  apiKey: string
  model: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
}

export async function generateText(options: TextGenerationOptions): Promise<string> {
  const { apiKey, model, prompt, onChunk, onUsage } = options

  return streamChat({
    apiKey,
    model,
    messages: [
      { role: 'user', content: prompt },
    ],
    onChunk,
    onUsage,
  })
}

// 非流式文本生成
export async function generateTextSync(options: Omit<TextGenerationOptions, 'onChunk'>): Promise<{
  content: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  const { apiKey, model, prompt } = options

  return chat({
    apiKey,
    model,
    messages: [
      { role: 'user', content: prompt },
    ],
  })
}
