// 临时文件服务接口类型定义
export interface TemporaryFileResponse {
  fileName: string;
  downloadLink: string;
  downloadLinkEncoded: string;
  size: number;
  type: string;
  uploadedTo: string;
}

// 上传进度回调函数
export type UploadProgressCallback = (loaded: number, total: number) => void;

// 获取上传 API 地址（开发环境使用代理，生产环境直接访问）
function getUploadApiUrl(): string {
  // 开发环境：使用 Vite 代理路径避免 CORS
  if (import.meta.env.DEV) {
    return '/api/tmpfile/upload';
  }
  // 生产环境：直接使用 tmpfile.link API（需要后端代理或 CORS 支持）
  return 'https://tmpfile.link/api/upload';
}

// 上传视频文件到临时文件服务
export async function uploadToTemporaryFile(
  file: File,
  _onProgress?: UploadProgressCallback
): Promise<TemporaryFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    // 使用 fetch API 上传文件
    const uploadUrl = getUploadApiUrl();
    console.log(`[临时文件服务] 上传到: ${uploadUrl}`);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // 不设置 Content-Type，让浏览器自动设置 multipart/form-data 边界
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败，状态码: ${response.status}, 错误: ${errorText}`);
    }

    const result = await response.json() as TemporaryFileResponse;
    console.log(`[临时文件服务] 上传成功:`, result);
    return result;

  } catch (error) {
    console.error(`[临时文件服务] 上传失败:`, error);

    // 如果是 CORS 错误，提供替代方案
    if (error instanceof Error && error.message.includes('CORS')) {
      throw new Error('由于浏览器安全限制，无法直接上传到临时文件服务。请尝试以下方案：\n1. 使用较小的视频文件（< 8MB）\n2. 或者将视频上传到其他平台后使用视频链接分析');
    }

    // 如果是网络错误，提供更友好的提示
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('Network'))) {
      throw new Error('网络连接失败，请检查网络连接或稍后重试');
    }

    throw error;
  }
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 验证文件类型和大小
export function validateVideoFile(file: File): { isValid: boolean; error?: string } {
  // 检查文件类型
  const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '不支持的文件格式。请使用 MP4、WebM、MOV、AVI 或 MKV 格式的视频文件。'
    };
  }

  // 检查文件大小 (100MB限制)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `文件过大（${formatFileSize(file.size)}），请选择小于 100MB 的视频文件。`
    };
  }

  // 检查文件是否为空
  if (file.size === 0) {
    return {
      isValid: false,
      error: '文件为空，请选择有效的视频文件。'
    };
  }

  return { isValid: true };
}