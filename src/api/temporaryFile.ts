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

// 上传视频文件到临时文件服务
export async function uploadToTemporaryFile(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<TemporaryFileResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 监听上传进度
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      });
    }

    // 监听响应完成
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText) as TemporaryFileResponse;
          resolve(response);
        } catch (error) {
          reject(new Error('解析服务器响应失败'));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.message || `上传失败，状态码: ${xhr.status}`));
        } catch {
          reject(new Error(`上传失败，状态码: ${xhr.status}`));
        }
      }
    });

    // 监听错误
    xhr.addEventListener('error', () => {
      reject(new Error('网络错误，上传失败'));
    });

    // 监听超时
    xhr.addEventListener('timeout', () => {
      reject(new Error('上传超时，请重试'));
    });

    // 配置请求
    xhr.open('POST', 'https://tmpfile.link/api/upload');
    xhr.timeout = 300000; // 5分钟超时

    // 创建FormData
    const formData = new FormData();
    formData.append('file', file);

    // 发送请求
    xhr.send(formData);
  });
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