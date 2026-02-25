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
  // 思考模式
  enableThinking?: boolean
  onReasoningChunk?: (chunk: string) => void
}

export async function analyzeVideo(options: VideoAnalysisOptions): Promise<string> {
  const { apiKey, model, videoUrl, prompt, onChunk, onUsage, enableThinking, onReasoningChunk } = options

  return streamChat({
    apiKey,
    model,
    messages: [
      {
        role: 'system',
        content: `你是一位拥有丰富经验的短视频拆解专家及分镜导演。你需要具备敏锐的观察力，能够从成片中反向推导出拍摄时的镜头语言、光影布局和具体的实操技法。

核心约束：
1. 空值填充：若某个字段在当前镜头中没有内容，请务必输出符号「-」，严禁留空或使用"无/None"等文字
2. 时间连续：上一行镜头的"结束时间"必须严格等于下一行镜头的"开始时间"，严禁出现时间断层
3. 格式纯净：仅输出表格，不要包含任何多余的解释、总结、开场白或结束语

请严格按照用户要求的 Markdown 表格格式输出。`,
      },
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
    enableThinking,
    onReasoningChunk,
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
  // 思考模式
  enableThinking?: boolean
  onReasoningChunk?: (chunk: string) => void
}

export async function analyzeImage(options: ImageAnalysisOptions): Promise<string> {
  const { apiKey, model, imageUrl, prompt, onChunk, onUsage, enableThinking, onReasoningChunk } = options

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
    enableThinking,
    onReasoningChunk,
  })
}

// 文本生成（脚本生成）
export interface TextGenerationOptions {
  apiKey: string
  model: string
  prompt: string
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  // 思考模式
  enableThinking?: boolean
  onReasoningChunk?: (chunk: string) => void
}

export async function generateText(options: TextGenerationOptions): Promise<string> {
  const { apiKey, model, prompt, onChunk, onUsage, enableThinking, onReasoningChunk } = options

  return streamChat({
    apiKey,
    model,
    messages: [
      { role: 'user', content: prompt },
    ],
    onChunk,
    onUsage,
    enableThinking,
    onReasoningChunk,
  })
}

// 多图片 + 文本生成（流式）
export interface MultiImageTextOptions {
  apiKey: string
  model: string
  prompt: string
  imageUrls: string[]
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
  // 思考模式
  enableThinking?: boolean
  onReasoningChunk?: (chunk: string) => void
}

export async function generateWithImages(options: MultiImageTextOptions): Promise<string> {
  const { apiKey, model, prompt, imageUrls, onChunk, onUsage, enableThinking, onReasoningChunk } = options

  // 构建消息内容
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = []

  // 添加图片
  for (const url of imageUrls) {
    content.push({ type: 'image_url', image_url: { url } })
  }

  // 添加文本
  content.push({ type: 'text', text: prompt })

  return streamChat({
    apiKey,
    model,
    messages: [
      { role: 'user', content },
    ],
    onChunk,
    onUsage,
    enableThinking,
    onReasoningChunk,
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
