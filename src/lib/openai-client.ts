/**
 * OpenAI SDK 兼容层
 * 统一 Aliyun DashScope 的调用方式
 */

import { getApiEndpoint, type ModelConfig } from '@/config/models'
export type { ModelConfig }

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
  // 思考模式参数
  enableThinking?: boolean
  // 思考内容回调
  onReasoningChunk?: (chunk: string) => void
}

// 执行流式请求
export async function streamChat(options: StreamOptions): Promise<string> {
  const { apiKey, model, messages, onChunk, onUsage, enableThinking, onReasoningChunk } = options
  const endpoint = getApiEndpoint('aliyun')

  // 构建请求体
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    stream_options: { include_usage: true },
    // 思考模式参数（放在顶层）
    enable_thinking: enableThinking ?? false,
    // 开启思考时限制思考长度
    ...(enableThinking && { thinking_budget: 2048 }),
  }

  // 调试日志
  console.log('[streamChat] enableThinking:', enableThinking)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
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

          // 调试日志 - 查看响应格式
          if (json.choices?.[0]?.delta?.reasoning_content) {
            console.log('[Reasoning]', json.choices[0].delta.reasoning_content.substring(0, 100))
          }

          const content = json.choices?.[0]?.delta?.content
          const reasoningContent = json.choices?.[0]?.delta?.reasoning_content

          // 处理思考内容
          if (reasoningContent) {
            onReasoningChunk?.(reasoningContent)
          }

          // 处理正式内容
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
  const endpoint = getApiEndpoint('aliyun')

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
