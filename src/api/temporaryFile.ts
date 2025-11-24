import OSS from 'ali-oss';

// OSS 上传响应接口类型定义
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

// STS 临时凭证接口
interface STSCredentials {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
  region: string;
  bucket: string;
}

// 获取 STS 临时凭证
async function getSTSCredentials(): Promise<STSCredentials> {
  const response = await fetch('/api/oss-sts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`获取上传凭证失败: ${error.message || response.statusText}`);
  }

  return response.json();
}

// 上传视频文件到阿里云 OSS（浏览器直传）
export async function uploadToTemporaryFile(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<TemporaryFileResponse> {
  try {
    console.log('[OSS 直传] 开始上传文件:', file.name);

    // 1. 获取 STS 临时凭证
    const credentials = await getSTSCredentials();
    console.log('[OSS 直传] 获取临时凭证成功');

    // 2. 创建 OSS 客户端
    const client = new OSS({
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      accessKeySecret: credentials.accessKeySecret,
      stsToken: credentials.securityToken,
      bucket: credentials.bucket,
    });

    // 3. 生成唯一文件名（保留原始扩展名）
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop();
    const ossFileName = `videos/${timestamp}-${randomStr}.${ext}`;

    // 4. 上传文件到 OSS（使用分片上传支持进度回调）
    await client.multipartUpload(ossFileName, file, {
      progress: (percentage: number) => {
        if (onProgress) {
          onProgress(
            Math.floor(percentage * file.size),
            file.size
          );
        }
      },
    });

    // 构建文件访问 URL
    const fileUrl = `https://${credentials.bucket}.${credentials.region}.aliyuncs.com/${ossFileName}`;
    console.log('[OSS 直传] 上传成功:', fileUrl);

    // 5. 返回标准化的响应格式
    const response: TemporaryFileResponse = {
      fileName: file.name,
      downloadLink: fileUrl,
      downloadLinkEncoded: encodeURI(fileUrl),
      size: file.size,
      type: file.type,
      uploadedTo: 'aliyun-oss',
    };

    return response;

  } catch (error) {
    console.error('[OSS 直传] 上传失败:', error);

    // 提供友好的错误提示
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        throw new Error('网络连接失败，请检查网络连接或稍后重试');
      }
      if (error.message.includes('AccessDenied')) {
        throw new Error('上传权限不足，请联系管理员');
      }
      if (error.message.includes('InvalidAccessKeyId')) {
        throw new Error('上传凭证无效，请刷新页面重试');
      }
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