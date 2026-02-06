import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

interface STSResponse {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
  expiration: string;
  region: string;
  bucket: string;
}

// Serverless Function (Node.js Runtime)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 从环境变量获取配置
    const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
    const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const roleArn = process.env.ALIYUN_ROLE_ARN;
    const region = process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou';
    const bucket = process.env.ALIYUN_OSS_BUCKET;

    if (!accessKeyId || !accessKeySecret || !roleArn || !bucket) {
      return res.status(500).json({
        error: '服务器配置错误：缺少必要的环境变量'
      });
    }

    // 生成 STS 临时凭证
    const stsCredentials = await assumeRole({
      accessKeyId,
      accessKeySecret,
      roleArn,
      roleSessionName: `video-upload-${Date.now()}`,
      durationSeconds: 3600, // 1 小时有效期
    });

    const response: STSResponse = {
      accessKeyId: stsCredentials.AccessKeyId,
      accessKeySecret: stsCredentials.AccessKeySecret,
      securityToken: stsCredentials.SecurityToken,
      expiration: stsCredentials.Expiration,
      region,
      bucket,
    };

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(response);
  } catch (error) {
    console.error('[OSS STS] 生成临时凭证失败:', error);
    return res.status(500).json({
      error: '生成临时凭证失败',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// 调用阿里云 STS AssumeRole API
async function assumeRole(params: {
  accessKeyId: string;
  accessKeySecret: string;
  roleArn: string;
  roleSessionName: string;
  durationSeconds: number;
}) {
  const { accessKeyId, accessKeySecret, roleArn, roleSessionName, durationSeconds } = params;

  // STS API 端点
  const endpoint = 'https://sts.aliyuncs.com/';

  // 构建请求参数
  const queryParams: Record<string, string> = {
    Format: 'JSON',
    Version: '2015-04-01',
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomBytes(16).toString('hex'),
    Action: 'AssumeRole',
    RoleArn: roleArn,
    RoleSessionName: roleSessionName,
    DurationSeconds: String(durationSeconds),
  };

  // 生成签名
  const signature = generateSignature(queryParams, accessKeySecret, 'POST');
  queryParams.Signature = signature;

  // 发送请求
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(queryParams).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`STS API 调用失败: ${error}`);
  }

  const data = await response.json();

  if (data.Credentials) {
    return data.Credentials;
  }

  throw new Error('STS API 返回格式错误');
}

// 生成阿里云 API 签名
function generateSignature(
  params: Record<string, string>,
  accessKeySecret: string,
  method: string
): string {
  // 1. 参数排序
  const sortedKeys = Object.keys(params).sort();
  const canonicalizedQueryString = sortedKeys
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&');

  // 2. 构造待签名字符串
  const stringToSign = `${method}&${percentEncode('/')}&${percentEncode(canonicalizedQueryString)}`;

  // 3. 计算签名
  const hmac = crypto.createHmac('sha1', `${accessKeySecret}&`);
  hmac.update(stringToSign);
  return hmac.digest('base64');
}

// URL 编码（RFC 3986）
function percentEncode(str: string): string {
  return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}
