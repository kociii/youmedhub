import { generateTextSync } from '@/api/analysis'
import type { AiCardOutputType } from '@/projects/types'

export interface RunProjectAiCardOptions {
  apiKey: string
  modelId: string
  outputType: AiCardOutputType
  promptTemplate: string
  inputContext?: string
}

export interface RunProjectAiCardResult {
  outputType: AiCardOutputType
  content: unknown
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

function buildOutputInstruction(outputType: AiCardOutputType): string {
  if (outputType === 'text') {
    return '请输出简洁文本，不要使用 Markdown。'
  }
  if (outputType === 'markdown') {
    return '请输出结构化 Markdown。'
  }
  if (outputType === 'json') {
    return '请严格输出合法 JSON，不要输出多余文本。'
  }
  if (outputType === 'script') {
    return '请输出短视频脚本结构，建议包含镜头、画面、口播、时长。'
  }
  if (outputType === 'image') {
    return '请输出可用于图片生成的结构化描述，返回 JSON，包含 prompt、style、negative_prompt。'
  }
  return '请输出可用于视频生成的结构化描述，返回 JSON，包含 prompt、duration、camera、style。'
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export async function runProjectAiCard(options: RunProjectAiCardOptions): Promise<RunProjectAiCardResult> {
  const promptParts = [
    '你是 AI 创作工作台中的节点执行器。',
    buildOutputInstruction(options.outputType),
    '',
    '【用户模板】',
    options.promptTemplate.trim() || '请根据输入生成内容。',
  ]

  if (options.inputContext?.trim()) {
    promptParts.push('', '【输入上下文】', options.inputContext.trim())
  }

  const prompt = promptParts.join('\n')

  const response = await generateTextSync({
    apiKey: options.apiKey,
    model: options.modelId,
    prompt,
  })

  const normalizedContent =
    options.outputType === 'json' ||
    options.outputType === 'image' ||
    options.outputType === 'video'
      ? tryParseJson(response.content)
      : response.content

  return {
    outputType: options.outputType,
    content: normalizedContent,
    usage: response.usage,
  }
}

