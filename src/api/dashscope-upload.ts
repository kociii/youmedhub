/**
 * 阿里云百炼临时存储上传模块
 * 替代自建 OSS 方案，使用百炼提供的免费临时存储空间
 *
 * 上传流程：
 * 1. 获取上传凭证 (GET /api/v1/uploads?action=getPolicy)
 * 2. 表单上传文件到 OSS (POST {upload_host})
 * 3. 返回 oss:// 格式的临时 URL
 *
 * 注意：上传的文件与模型绑定，切换模型后需重新上传
 */

// 上传凭证响应类型
export interface UploadPolicyResponse {
  request_id: string
  data: {
    policy: string
    signature: string
    upload_dir: string
    upload_host: string
    expire_in_seconds: number
    max_file_size_mb: number
    oss_access_key_id: string
    x_oss_object_acl: string
    x_oss_forbid_overwrite: string
  }
}

// 上传选项
export interface UploadOptions {
  file: File
  model: string // 目标模型，如 'qwen-vl-max' 或 'qwen3.5-plus'
  apiKey?: string // 可选，默认从环境变量 VITE_DASHSCOPE_API_KEY 读取
  onProgress?: (loaded: number, total: number) => void
}

// 上传结果
export interface UploadResult {
  ossUrl: string // oss://dashscope-instant/xxx/...
  expiresIn: number // 有效期（秒），48小时
}

// 代理接口地址（用于获取上传凭证，解决 CORS）
const PROXY_BASE_URL = '/api'

/**
 * 获取上传凭证（通过代理接口，解决 CORS）
 * @param apiKey 百炼 API Key
 * @param model 目标模型名称
 * @returns 上传凭证信息
 */
export async function getUploadPolicy(
  apiKey: string,
  model: string
): Promise<UploadPolicyResponse['data']> {
  const url = `${PROXY_BASE_URL}/dashscope-policy`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `获取上传凭证失败: ${response.status}`)
  }

  const data: UploadPolicyResponse = await response.json()

  if (!data.data) {
    throw new Error('上传凭证响应格式错误')
  }

  return data.data
}

/**
 * 上传文件到 OSS
 * @param policy 上传凭证
 * @param file 要上传的文件
 * @param onProgress 进度回调
 * @returns 上传后的文件名（含路径）
 */
export async function uploadFileToOSS(
  policy: UploadPolicyResponse['data'],
  file: File,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  // 构建文件名（保留原始扩展名）
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const ext = file.name.split('.').pop() || ''
  const fileName = `${timestamp}-${randomStr}.${ext}`
  const key = `${policy.upload_dir}/${fileName}`

  // 构建 FormData
  const formData = new FormData()
  formData.append('OSSAccessKeyId', policy.oss_access_key_id)
  formData.append('Signature', policy.signature)
  formData.append('policy', policy.policy)
  formData.append('key', key)
  formData.append('x-oss-object-acl', policy.x_oss_object_acl)
  formData.append('x-oss-forbid-overwrite', policy.x_oss_forbid_overwrite)
  formData.append('success_action_status', '200')
  formData.append('file', file)

  // 创建 XMLHttpRequest 以支持进度监控
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // 进度监控
    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total)
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 204) {
        resolve(key) // 返回上传后的文件路径
      } else {
        reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('网络请求失败，请检查网络连接'))
    }

    xhr.onabort = () => {
      reject(new Error('上传已取消'))
    }

    xhr.open('POST', policy.upload_host)
    xhr.send(formData)
  })
}

/**
 * 上传文件到百炼临时存储
 * 主函数：获取凭证 -> 上传文件 -> 返回 oss:// URL
 *
 * @param file 要上传的文件
 * @param model 目标模型名称
 * @param options 可选参数（apiKey 从 options 或环境变量获取，进度回调）
 * @returns oss:// 格式的临时 URL
 */
export async function uploadToDashScope(
  file: File,
  model: string,
  options?: Omit<UploadOptions, 'file' | 'model'>
): Promise<string> {
  // 获取 API Key
  const apiKey = options?.apiKey || import.meta.env.VITE_DASHSCOPE_API_KEY

  if (!apiKey) {
    throw new Error('未配置百炼 API Key，请检查环境变量 VITE_DASHSCOPE_API_KEY')
  }

  // 1. 获取上传凭证
  const policy = await getUploadPolicy(apiKey, model)

  // 检查文件大小限制
  const maxSizeBytes = policy.max_file_size_mb * 1024 * 1024
  if (file.size > maxSizeBytes) {
    throw new Error(
      `文件过大（${formatFileSize(file.size)}），请小于 ${policy.max_file_size_mb}MB`
    )
  }

  // 2. 上传文件
  const uploadedKey = await uploadFileToOSS(policy, file, options?.onProgress)

  // 3. 生成 oss:// URL
  // uploadedKey 格式: upload_dir/filename
  const ossUrl = `oss://${uploadedKey}`

  return ossUrl
}

/**
 * 验证文件类型和大小
 * @param file 要验证的文件
 * @param options 验证选项
 * @returns 验证结果
 */
export function validateFile(
  file: File,
  options?: {
    allowedTypes?: string[]
    maxSizeMB?: number
  }
): { isValid: boolean; error?: string } {
  const { allowedTypes, maxSizeMB } = options || {}

  // 默认支持的视频和图片类型
  const defaultAllowedTypes = [
    'video/mp4',
    'video/quicktime', // MOV
    'video/x-msvideo', // AVI
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]

  const types = allowedTypes || defaultAllowedTypes

  // 检查文件类型
  if (!types.includes(file.type)) {
    const typeNames = types.map((t) => {
      const map: Record<string, string> = {
        'video/mp4': 'MP4',
        'video/quicktime': 'MOV',
        'video/x-msvideo': 'AVI',
        'image/jpeg': 'JPEG',
        'image/png': 'PNG',
        'image/webp': 'WebP',
        'image/gif': 'GIF',
      }
      return map[t] || t
    })
    return {
      isValid: false,
      error: `不支持的文件格式。请使用 ${typeNames.join('/')} 格式的文件。`,
    }
  }

  // 检查文件大小
  const maxSize = (maxSizeMB || 100) * 1024 * 1024
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `文件过大（${formatFileSize(file.size)}），请选择小于 ${maxSizeMB || 100}MB 的文件。`,
    }
  }

  // 检查文件是否为空
  if (file.size === 0) {
    return {
      isValid: false,
      error: '文件为空，请选择有效的文件。',
    }
  }

  return { isValid: true }
}

/**
 * 验证视频文件
 * @param file 要验证的文件
 * @returns 验证结果
 */
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
  return validateFile(file, {
    allowedTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    maxSizeMB: 100,
  })
}

/**
 * 验证图片文件
 * @param file 要验证的文件
 * @returns 验证结果
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  return validateFile(file, {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSizeMB: 20,
  })
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 解析错误信息
 * 用于识别百炼 API 返回的特定错误
 * @param error 错误对象
 * @returns 用户友好的错误信息
 */
export function parseUploadError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message

    // 网络错误
    if (message.includes('Failed to fetch') || message.includes('Network')) {
      return '网络连接失败，请检查网络连接后重试'
    }

    // 凭证过期
    if (message.includes('expire') || message.includes('Expired')) {
      return '上传凭证已过期，请重新上传'
    }

    // 限流
    if (message.includes('rate limit') || message.includes('RateLimit')) {
      return '上传太频繁，请稍后再试'
    }

    // 文件过大
    if (message.includes('size') || message.includes('Size')) {
      return '文件过大，请选择更小的文件'
    }

    // API Key 错误
    if (message.includes('Unauthorized') || message.includes('401')) {
      return 'API Key 无效，请检查配置'
    }

    return message
  }

  return '上传失败，请重试'
}

// 保留旧的接口兼容（temporaryFile.ts 将调用此模块）
// 导出与旧接口兼容的类型和函数

export interface TemporaryFileResponse {
  fileName: string
  downloadLink: string
  downloadLinkEncoded: string
  size: number
  type: string
  uploadedTo: string
}

export type UploadProgressCallback = (loaded: number, total: number) => void

/**
 * 兼容旧的上传接口
 * 用于临时过渡，后续直接调用 uploadToDashScope
 */
export async function uploadToTemporaryFile(
  file: File,
  model: string,
  onProgress?: UploadProgressCallback
): Promise<TemporaryFileResponse> {
  const ossUrl = await uploadToDashScope(file, model, { onProgress })

  return {
    fileName: file.name,
    downloadLink: ossUrl,
    downloadLinkEncoded: encodeURIComponent(ossUrl),
    size: file.size,
    type: file.type,
    uploadedTo: 'dashscope-temp',
  }
}
