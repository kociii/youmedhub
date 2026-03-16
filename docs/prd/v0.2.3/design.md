# v0.2.3 存储方案重构设计

> 将文件存储从自建阿里云 OSS 方案迁移至阿里云百炼临时存储

---

## 1. 架构变更概览

### 1.1 当前架构（自建 OSS）

```
┌─────────────────────────────────────────────────────────────────────┐
│                            前端 (Vue)                                │
│  ┌─────────────────────┐                                           │
│  │  ali-oss SDK        │                                           │
│  │  - multipartUpload  │                                           │
│  └─────────────────────┘                                           │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Vercel Serverless                              │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  api/oss-sts.ts                                             │     │
│  │  - AssumeRole (RAM)                                         │     │
│  │  - 生成 STS 临时凭证                                        │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        阿里云 OSS Bucket                            │
│  - 自建 Bucket                                                       │
│  - CORS 配置                                                         │
│  - 签名 URL 24h 有效期                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 目标架构（百炼临时存储）

```
┌─────────────────────────────────────────────────────────────────────┐
│                            前端 (Vue)                                │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │  dashscope-upload.ts (新)                                   │     │
│  │  ├─ GET /api/v1/uploads (获取凭证)                          │     │
│  │  └─ POST /upload_host (表单上传)                            │     │
│  └─────────────────────────────────────────────────────────────┘     │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          │ 无需 Vercel Serverless
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    阿里云百炼临时存储空间                            │
│  - 免费使用                                                          │
│  - 48h 有效期                                                        │
│  - oss:// 前缀 URL                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 架构对比

| 维度 | 自建 OSS | 百炼临时存储 | 备注 |
|------|----------|--------------|------|
| 后端服务 | 需要 STS Serverless | 纯前端 | 减少 1 个部署单元 |
| SDK 依赖 | `ali-oss` | 无 | 减少包体积 |
| 环境变量 | 5+ 个 | 1 个 (API Key) | 配置简化 |
| 上传方式 | SDK 直传 | 表单 POST | 标准 HTTP |
| URL 格式 | `https://...` 签名 URL | `oss://...` 临时 URL | 需加 Header |
| 有效期 | 24h (可配置) | 48h (固定) | 更长有效期 |
| 限流 | 无限制 | 100 QPS | 个人项目足够 |

---

## 2. 上传流程设计

### 2.1 交互流程变更

**关键变更：提交时才上传**

```
用户选择文件
      │
      ▼
┌─────────────────┐
│ 验证文件格式    │  ← 立即执行（格式、大小检查）
│ (视频/图片)     │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────┐
│ 存储本地文件对象             │  ← videoFile / imageFile
│ 生成本地 URL (预览用)        │  ← localVideoUrl / localImageUrl
│ 显示本地预览                 │  ← VideoPreview 组件播放本地文件
└──────────────────────────────┘
         │
         ▼ (用户点击提交)
┌──────────────────────────────┐
│ Step 1: 获取上传凭证         │
│ GET /api/v1/uploads          │
│ ?action=getPolicy            │
│ &model=qwen-vl-max           │
└────────┬─────────────────────┘
         │
         │ Response: {policy, signature, upload_dir, ...}
         │
         ▼
┌──────────────────────────────┐
│ Step 2: 上传文件             │
│ POST {upload_host}           │
│ Content-Type: multipart/form │
│                              │
│ Body: FormData               │
│ - OSSAccessKeyId             │
│ - Signature                  │
│ - policy                     │
│ - key (upload_dir/filename)  │
│ - file (binary)              │
└────────┬─────────────────────┘
         │
         │ 200 OK
         │
         ▼
┌──────────────────────────────┐
│ Step 3: 生成临时 URL         │
│                              │
│ oss://{upload_dir}/{filename}│  ← 存储到 videoUrl / imageUrl
│                              │   (用于 AI 调用)
└──────────────────────────────┘
         │
         ▼
调用 AI API (使用 oss:// URL + Header)
```

### 2.2 本地预览 vs AI 调用分离

| 用途 | 数据来源 | URL 类型 |
|------|----------|----------|
| 视频预览播放 | 本地文件 | `blob:` 或 `file:` URL |
| AI 模型分析 | 上传后返回 | `oss://` URL |

**状态管理变更**：

```typescript
// useVideoAnalysis.ts

// 本地文件（始终存在，用于预览）
const videoFile = ref<File | null>(null)
const localVideoUrl = ref<string>('')  // blob URL

// OSS URL（提交后才生成，用于 AI 调用）
const videoUrl = ref<string>('')  // oss://... 或空
```

### 2.3 错误处理

| 错误场景 | 提示信息 |
|----------|----------|
| 文件过大 | "文件超过 100MB，请选择更小的文件" |
| 网络失败 | "上传失败，请检查网络后重试" |
| 凭证过期 | "上传凭证已过期，请重新上传" |
| 限流触发 | "上传太频繁，请稍后再试" |

---

## 3. API 调用适配

### 3.1 关键 Header

使用 `oss://` URL 调用模型时，必须添加：

```
X-DashScope-OssResourceResolve: enable
```

### 3.2 请求示例

#### 视频分析

```typescript
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-DashScope-OssResourceResolve': 'enable',  // 必须
  },
  body: JSON.stringify({
    model: 'qwen-vl-max',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: '分析这个视频的分镜脚本' },
        { type: 'video_url', video_url: { url: 'oss://dashscope-instant/xxx/video.mp4' } }
      ]
    }],
    stream: true,
  })
})
```

#### 图片分析

```typescript
{
  model: 'qwen-vl-max',
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: '描述这张图片' },
      { type: 'image_url', image_url: { url: 'oss://dashscope-instant/xxx/image.png' } }
    ]
  }]
}
```

### 3.3 错误响应

缺少 Header 时的错误：

```json
{
  "error": {
    "code": "InvalidParameter.DataInspection",
    "message": "The media format is not supported or incorrect for the data inspection."
  }
}
```

**注意**：此错误需在前端识别并提示用户（理论上不应发生，因为我们已添加 Header）。

---

## 4. 文件结构变更

### 4.1 目录结构

```
src/
├── api/
│   ├── dashscope-upload.ts      # [新增] 百炼临时存储上传
│   ├── temporaryFile.ts         # [修改] 改为调用新上传
│   └── analysis.ts              # [已有] 无需修改
├── lib/
│   ├── openai-client.ts         # [修改] 添加 X-DashScope-OssResourceResolve Header
│   └── supabase.ts              # [已有] 无需修改
└── ...

api/                              # [删除]
├── oss-sts.ts                   # [删除] 删除 Vercel Serverless
```

### 4.2 新增模块详情

#### `src/api/dashscope-upload.ts`

```typescript
// 导出函数
export async function uploadToDashScope(
  file: File,
  model: string,
  options?: { onProgress?: (loaded: number, total: number) => void }
): Promise<string> // 返回 oss:// URL

export function validateFile(file: File): { isValid: boolean; error?: string }
export function formatFileSize(bytes: number): string

// 内部函数（不导出）
async function getUploadPolicy(apiKey: string, model: string): Promise<UploadPolicy>
async function uploadFileToOSS(policy: UploadPolicy, file: File, onProgress?): Promise<void>
```

---

## 5. 状态管理变更

### 5.1 `useVideoAnalysis.ts`

上传逻辑变更：

```typescript
// 之前：选择文件后立即上传
try {
  const response = await uploadToTemporaryFile(file, onProgress)
  videoUrl.value = response.downloadLink
  localVideoUrl.value = response.downloadLink  // 同用于预览
} catch (error) { ... }

// 之后：选择文件仅存储本地，提交时才上传
// 选择文件时：
const handleFileSelect = (file: File) => {
  videoFile.value = file
  localVideoUrl.value = URL.createObjectURL(file)  // 本地预览
  videoUrl.value = ''  // OSS URL 为空，待上传后填充
}

// 提交时：
const handleSubmit = async () => {
  // 1. 上传文件（如果没有上传过）
  if (!videoUrl.value && videoFile.value) {
    const ossUrl = await uploadToDashScope(videoFile.value, selectedModel.value)
    videoUrl.value = ossUrl  // 填充 OSS URL
  }

  // 2. 调用 AI API（使用 oss:// URL）
  await streamChat({
    ...,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'video_url', video_url: { url: videoUrl.value } }  // oss:// URL
      ]
    }]
  })
}
```

### 5.2 模型绑定问题

**注意**：百炼临时存储的文件与模型绑定。

| 场景 | 处理方式 |
|------|----------|
| 用户上传后切换模型 | 提示"切换模型后需重新上传文件" |
| 不同模型使用同一文件 | 需分别上传（因为 upload_dir 不同） |

---

## 6. 界面变更

### 6.1 无界面变更

本次重构为**纯技术架构变更**，用户界面保持不变：

- 上传组件 UI 不变
- 上传进度展示不变
- 视频预览不变
- 分析流程不变

### 6.2 潜在用户体验优化

可以添加的提示（可选）：

```
┌─────────────────────────────────────────────────────────────────┐
│  💡 提示                                                          │
│  上传的文件将在 48 小时后自动删除，请及时进行分析                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. 清理清单

### 7.1 删除文件

| 文件 | 说明 |
|------|------|
| `api/oss-sts.ts` | Vercel Serverless Function |

### 7.2 移除依赖

```bash
npm uninstall ali-oss
```

### 7.3 移除环境变量

| 变量 | 说明 |
|------|------|
| `VITE_ALIYUN_OSS_REGION` | OSS 区域 |
| `VITE_ALIYUN_OSS_BUCKET` | OSS Bucket |
| `VITE_ALIYUN_ACCESS_KEY_ID` | 主账号 AK (本地开发用) |
| `VITE_ALIYUN_ACCESS_KEY_SECRET` | 主账号 SK (本地开发用) |
| `ALIYUN_ROLE_ARN` | RAM 角色 ARN (Vercel 用) |

### 7.4 更新文档

| 文件 | 变更 |
|------|------|
| `CLAUDE.md` | 更新存储方案说明 |
| `.env.example` | 移除 OSS 相关变量 |
| `README.md` | 更新部署说明 |

---

## 8. 验证场景

### 8.1 核心验证

| 场景 | 预期结果 |
|------|----------|
| 上传视频 | 成功，返回 `oss://` URL |
| 上传图片 | 成功，返回 `oss://` URL |
| 视频分析 | 正常调用，返回分析结果 |
| 图片分析 | 正常调用，返回分析结果 |
| 大文件 (>50MB) | 正常上传，进度显示正常 |
| 网络中断 | 友好的错误提示 |

### 8.2 回归验证

| 场景 | 预期结果 |
|------|----------|
| 思考模式 | 正常工作 |
| 流式输出 | 正常工作 |
| 收藏功能 | 正常工作 |
| 导出功能 | 正常工作 |
| 路由切换 | 正常工作 |

---

## 9. 风险与回退方案

### 9.1 风险

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 100 QPS 限流触发 | 低 | 中 | 添加重试逻辑，提示用户稍后重试 |
| 文件与模型绑定导致困惑 | 中 | 低 | 添加提示说明 |
| 48h 过期用户投诉 | 低 | 低 | 添加过期提示，后续可迁移回 OSS |

### 9.2 回退方案

如需回退到自建 OSS：

1. 恢复 `api/oss-sts.ts`
2. 重新安装 `ali-oss`
3. 恢复环境变量配置
4. 恢复 `temporaryFile.ts` 原始实现
5. 移除 `X-DashScope-OssResourceResolve` Header

---

## 10. 参考文档

- [阿里云百炼临时文件 URL 文档](https://help.aliyun.com/zh/model-studio/get-temporary-file-url)
- [阿里云百炼错误码](https://help.aliyun.com/zh/model-studio/error-code)