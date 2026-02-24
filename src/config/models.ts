/**
 * 模型配置文件
 * 硬编码可选模型列表，不依赖环境变量
 */

export interface ModelConfig {
  id: string
  name: string
  provider: 'aliyun' | 'volcengine'
  providerName: string
  description: string
  capabilities: ('video' | 'image' | 'text')[]
}

/**
 * 可选模型列表
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  // 阿里百炼 - 通义千问
  {
    id: 'qwen-vl-max',
    name: 'qwen-vl-max',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问多模态大模型',
    capabilities: ['video', 'image', 'text'],
  },
  // 阿里百炼 - 通义千问 Flash
  {
    id: 'qwen-vl-max-latest',
    name: 'qwen-vl-max-latest',
    provider: 'aliyun',
    providerName: '阿里百炼',
    description: '通义千问多模态大模型最新版',
    capabilities: ['video', 'image', 'text'],
  },
  // 火山引擎 - Doubao
  {
    id: 'doubao-1-5-pro-32k-250115',
    name: 'Doubao-1.5-pro-32k',
    provider: 'volcengine',
    providerName: '火山引擎',
    description: '豆包大模型 Pro 版',
    capabilities: ['video', 'image', 'text'],
  },
  // 火山引擎 - Doubao Lite
  {
    id: 'doubao-1-5-lite-32k-250115',
    name: 'Doubao-1.5-lite-32k',
    provider: 'volcengine',
    providerName: '火山引擎',
    description: '豆包大模型 Lite 版',
    capabilities: ['video', 'image', 'text'],
  },
]

/**
 * 按提供商分组的模型
 */
export const MODELS_BY_PROVIDER = {
  aliyun: AVAILABLE_MODELS.filter(m => m.provider === 'aliyun'),
  volcengine: AVAILABLE_MODELS.filter(m => m.provider === 'volcengine'),
}

/**
 * 默认模型 ID
 */
export const DEFAULT_MODEL_ID = 'qwen-vl-max'

/**
 * 根据 ID 获取模型配置
 */
export function getModelById(id: string): ModelConfig | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id)
}

/**
 * 获取模型提供商的 API 端点
 */
export function getApiEndpoint(provider: 'aliyun' | 'volcengine'): string {
  const endpoints = {
    aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    volcengine: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  }
  return endpoints[provider]
}
