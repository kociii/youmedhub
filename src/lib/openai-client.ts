/**
 * OpenAI SDK 兼容层
 * 统一 Aliyun DashScope 和 Volcengine ARK 的调用方式
 */

// 模型提供商类型
export type ModelProvider = 'aliyun' | 'volcengine'

// 模型配置
export interface ModelConfig {
  id: string
  name: string
  provider: ModelProvider
  description: string
  capabilities: ('video' | 'image' | 'text')[]
}

// 支持的模型列表
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'qwen3-vl-flash',
    name: 'Qwen3-VL-Flash',
    provider: 'aliyun',
    description: '阿里百炼 - 快速多模态',
    capabilities: ['video', 'image', 'text'],
  },
  {
    id: 'qwen3-vl-plus',
    name: 'Qwen3-VL-Plus',
    provider: 'aliyun',
    description: '阿里百炼 - 增强多模态',
    capabilities: ['video', 'image', 'text'],
  },
  {
    id: 'doubao-seed-1-6-flash-250415',
    name: 'Doubao-Seed-Flash',
    provider: 'volcengine',
    description: '火山引擎 - 快速视频理解',
    capabilities: ['video', 'image', 'text'],
  },
]

// API 端点配置
const API_ENDPOINTS = {
  aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  volcengine: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
} as const

// 获取模型的提供商
export function getModelProvider(modelId: string): ModelProvider {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId)
  if (!model) {
    throw new Error(`未知模型: ${modelId}`)
  }
  return model.provider
}

// 获取 API 端点
export function getApiEndpoint(provider: ModelProvider): string {
  return API_ENDPOINTS[provider]
}

// 流式响应处理
export interface StreamOptions {
  apiKey: string
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }>
  }>
  onChunk?: (chunk: string) => void
  onUsage?: (usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }) => void
}

// 执行流式请求
export async function streamChat(options: StreamOptions): Promise<string> {
  const { apiKey, model, messages, onChunk, onUsage } = options
  const provider = getModelProvider(model)
  const endpoint = getApiEndpoint(provider)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('无法读取响应流')
  }

  const decoder = new TextDecoder()
  let fullContent = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content

          if (content) {
            fullContent += content
            onChunk?.(content)
          }

          if (json.usage) {
            onUsage?.(json.usage)
          }
        } catch {
          // 忽略解析错误
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return fullContent
}

// 非流式请求
export interface ChatOptions {
  apiKey: string
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }>
  }>
}

export async function chat(options: ChatOptions): Promise<{
  content: string
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  const { apiKey, model, messages } = options
  const provider = getModelProvider(model)
  const endpoint = getApiEndpoint(provider)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `API 请求失败: ${response.status}`)
  }

  const data = await response.json()

  return {
    content: data.choices?.[0]?.message?.content || '',
    usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
  }
}
