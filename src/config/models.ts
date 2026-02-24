/**
 * 模型配置文件
 * 硬编码可选模型列表，不依赖环境变量
 */

export interface ModelConfig {
  id: string
  name: string
  provider: 'aliyun'
  providerName: string
  description: string
  capabilities: ('video' | 'image' | 'text')[]
}

/**
 * 可选模型列表
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'qwen3.5-plus',
    name: 'Qwen3.5 Plus',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问 3.5 增强版',
    capabilities: ['video', 'image', 'text'],
  },
]

/**
 * 按提供商分组的模型
 */
export const MODELS_BY_PROVIDER = {
  aliyun: AVAILABLE_MODELS.filter(m => m.provider === 'aliyun'),
}

/**
 * 默认模型 ID
 */
export const DEFAULT_MODEL_ID = 'qwen3.5-plus'

/**
 * 根据 ID 获取模型配置
 */
export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id)
}

/**
 * 获取模型提供商的 API 端点
 */
export function getApiEndpoint(provider: 'aliyun'): string {
  const endpoints = {
    aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  }
  return endpoints[provider]
}
