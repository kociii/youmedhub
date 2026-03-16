/**
 * 临时文件上传接口（兼容层）
 *
 * 注意：v0.2.3 后存储方案已从自建 OSS 迁移至阿里云百炼临时存储
 * 本文件保留以维持向后兼容，实际实现已移至 dashscope-upload.ts
 */

import {
  uploadToDashScope,
  validateFile,
  validateVideoFile,
  validateImageFile,
  formatFileSize,
  parseUploadError,
  type TemporaryFileResponse,
  type UploadProgressCallback,
} from './dashscope-upload'

// 重新导出类型和函数，保持向后兼容
export type { TemporaryFileResponse, UploadProgressCallback }
export { formatFileSize, validateFile, validateVideoFile, validateImageFile }

/**
 * 上传文件到临时存储（兼容旧接口）
 *
 * @param file 要上传的文件
 * @param model 目标模型（内部 model ID，如 'qwen3.5-flash'）
 * @param apiKey 百炼 API Key（必填）
 * @param onProgress 上传进度回调
 * @returns 上传结果
 */
export async function uploadToTemporaryFile(
  file: File,
  model: string,
  apiKey: string,
  onProgress?: UploadProgressCallback
): Promise<TemporaryFileResponse> {
  const ossUrl = await uploadToDashScope(file, model, { apiKey, onProgress })

  return {
    fileName: file.name,
    downloadLink: ossUrl,
    downloadLinkEncoded: encodeURIComponent(ossUrl),
    size: file.size,
    type: file.type,
    uploadedTo: 'dashscope-temp',
  }
}

/**
 * 上传视频文件（专用函数）
 *
 * @param file 视频文件
 * @param model 目标模型
 * @param apiKey 百炼 API Key（必填）
 * @param onProgress 进度回调
 * @returns 上传结果
 */
export async function uploadVideoFile(
  file: File,
  model: string,
  apiKey: string,
  onProgress?: UploadProgressCallback
): Promise<TemporaryFileResponse> {
  // 验证视频文件
  const validation = validateVideoFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  return uploadToTemporaryFile(file, model, apiKey, onProgress)
}

/**
 * 上传图片文件（专用函数）
 *
 * @param file 图片文件
 * @param model 目标模型
 * @param apiKey 百炼 API Key（必填）
 * @param onProgress 进度回调
 * @returns 上传结果
 */
export async function uploadImageFile(
  file: File,
  model: string,
  apiKey: string,
  onProgress?: UploadProgressCallback
): Promise<TemporaryFileResponse> {
  // 验证图片文件
  const validation = validateImageFile(file)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  return uploadToTemporaryFile(file, model, apiKey, onProgress)
}

// 导出错误解析函数（新增）
export { parseUploadError }
