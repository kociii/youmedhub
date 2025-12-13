import OSS from 'ali-oss'

const API_BASE = 'http://localhost:8000'
const ALLOWED_FORMATS = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo']
const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export interface STSCredentials {
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  expiration: string
  region: string
  bucket: string
}

// 生成随机文件名
function generateFileName(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'mp4'
  const randomStr = Math.random().toString(36).substring(2, 14)
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const date = new Date().toISOString().slice(0, 10)
  return `videos/${date}/${randomStr}_${timestamp}.${ext}`
}

// 验证文件
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_FORMATS.includes(file.type)) {
    return { valid: false, error: '仅支持 mp4、avi、mov 格式的视频' }
  }
  if (file.size > MAX_SIZE) {
    return { valid: false, error: '文件大小不能超过 50MB' }
  }
  return { valid: true }
}

// 获取 STS 临时凭证
export async function getSTSToken(): Promise<STSCredentials> {
  const response = await fetch(`${API_BASE}/oss/sts-token`)
  if (!response.ok) {
    throw new Error('获取 OSS 凭证失败')
  }
  return response.json()
}

// 上传文件到 OSS
export async function uploadToOSS(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const validation = validateFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const credentials = await getSTSToken()

  const client = new OSS({
    region: credentials.region,
    accessKeyId: credentials.accessKeyId,
    accessKeySecret: credentials.accessKeySecret,
    stsToken: credentials.securityToken,
    bucket: credentials.bucket,
    authorizationV4: true, // 使用 V4 签名，更安全
    refreshSTSToken: async () => {
      const newCredentials = await getSTSToken()
      return {
        accessKeyId: newCredentials.accessKeyId,
        accessKeySecret: newCredentials.accessKeySecret,
        stsToken: newCredentials.securityToken,
      }
    },
  })

  const objectKey = generateFileName(file.name)

  // 使用 multipartUpload 支持进度回调
  await client.multipartUpload(objectKey, file, {
    progress: (p: number) => {
      onProgress?.(Math.round(p * 100))
    },
    partSize: 1024 * 1024, // 1MB 分片
  })

  // 返回文件 URL
  return `https://${credentials.bucket}.${credentials.region}.aliyuncs.com/${objectKey}`
}
