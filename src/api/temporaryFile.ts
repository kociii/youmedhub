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
  // 本地开发模式：直接使用环境变量中的主账号密钥
  // 注意：这仅用于本地测试，生产环境应该使用 STS 临时凭证
  if (import.meta.env.DEV && import.meta.env.VITE_ALIYUN_ACCESS_KEY_ID) {
    console.log('[OSS 直传] 本地开发模式：使用环境变量中的凭证');
    return {
      accessKeyId: import.meta.env.VITE_ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: import.meta.env.VITE_ALIYUN_ACCESS_KEY_SECRET,
      securityToken: '', // 主账号密钥不需要 securityToken
      expiration: new Date(Date.now() + 3600000).toISOString(),
      region: import.meta.env.VITE_ALIYUN_OSS_REGION || 'oss-cn-beijing',
      bucket: import.meta.env.VITE_ALIYUN_OSS_BUCKET,
    };
  }

  // 生产模式：通过 Vercel Serverless Function 获取 STS 临时凭证
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
    // 注意：本地开发时不使用 stsToken（主账号密钥），生产环境使用 stsToken（临时凭证）
    const clientConfig: any = {
      region: credentials.region,
      accessKeyId: credentials.accessKeyId,
      accessKeySecret: credentials.accessKeySecret,
      bucket: credentials.bucket,
    };

    // 只有在有 securityToken 时才添加 stsToken 字段（生产环境）
    if (credentials.securityToken) {
      clientConfig.stsToken = credentials.securityToken;
    }

    const client = new OSS(clientConfig);

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

    // 5. 生成带签名的临时访问 URL（有效期 24 小时）
    const fileUrl = client.signatureUrl(ossFileName, {
      expires: 86400, // 24 小时 = 86400 秒
    });
    console.log('[OSS 直传] 上传成功，生成签名 URL:', fileUrl);

    // 6. 返回标准化的响应格式
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
    console.error('[OSS 直传] 上传失败，详细错误:', error);

    // 提供友好的错误提示
    if (error instanceof Error) {
      console.error('[OSS 直传] 错误信息:', error.message);
      console.error('[OSS 直传] 错误堆栈:', error.stack);

      if (error.message.includes('Failed to fetch') || error.message.includes('Network') || error.message.includes('XHR error')) {
        throw new Error('网络连接失败或 CORS 配置问题，请检查：\n1. OSS Bucket 的 CORS 设置\n2. 网络连接\n3. AccessKey 权限配置');
      }
      if (error.message.includes('AccessDenied')) {
        throw new Error('上传权限不足，请检查 AccessKey 的 OSS 权限配置');
      }
      if (error.message.includes('InvalidAccessKeyId')) {
        throw new Error('AccessKey 无效，请检查 .env 文件中的配置');
      }
      if (error.message.includes('SignatureDoesNotMatch')) {
        throw new Error('签名验证失败，请检查 AccessKeySecret 是否正确');
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
  const validTypes = ['video/mp4', 'video/quicktime'];
  if (!validTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '不支持的文件格式。请使用 MP4 或 MOV 格式的视频文件。'
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