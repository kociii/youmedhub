# v0.2.4 技术开发文档

> 存储方案验证与收尾 - DashScope 临时存储架构实现与测试

---

## 1. 架构变更概览

### 1.1 当前架构（v0.2.3 之前）

```
┌─────────────────────────────────────────────────────────┐
│                      系统架构图                          │
├─────────────────────────────────────────────────────────┤
│  ┌───────────┐    ┌───────────┐    ┌───────────────┐   │
│  │   前端    │◄──►│  Vercel   │◄──►│  阿里云 OSS   │   │
│  │  Vue 3    │    │  STS API  │    │  持久存储     │   │
│  └───────────┘    └───────────┘    └───────────────┘   │
│        │                                   ▲            │
│        │         ┌───────────┐             │            │
│        └────────►│  Supabase │             │            │
│                  │  认证/数据 │             │            │
│                  └───────────┘             │            │
│                                            │            │
│        ┌───────────────────────────────────┘            │
│        │                                                │
│        ▼                                                │
│  ┌───────────┐    ┌───────────────┐                    │
│  │ ali-oss   │───►│  签名 URL     │                    │
│  │ SDK 直传  │    │  (24小时有效) │                    │
│  └───────────┘    └───────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

**存在问题**：
- 需要维护 Vercel Serverless Function 获取 STS 临时凭证
- 依赖 ali-oss SDK，包体积较大
- 需要配置多个 OSS 相关环境变量
- 签名 URL 有效期管理复杂

### 1.2 目标架构（v0.2.3+）

```
┌─────────────────────────────────────────────────────────┐
│                      系统架构图                          │
├─────────────────────────────────────────────────────────┤
│  ┌───────────┐         ┌───────────────┐               │
│  │   前端    │◄───────►│  DashScope    │               │
│  │  Vue 3    │         │  临时存储服务  │               │
│  └───────────┘         │  (48小时有效) │               │
│        │               └───────────────┘               │
│        │                      ▲                        │
│        │                      │                        │
│        ▼                      │                        │
│  ┌───────────┐    ┌───────────┘                        │
│  │  Supabase │    │                                     │
│  │  认证/数据│    │  表单 POST 上传                      │
│  └───────────┘    │  (无需 STS)                          │
│                   │                                     │
│  ┌───────────┐    │  ┌─────────────────────────┐        │
│  │ 本地文件  │────┘  │  oss:// 临时 URL        │        │
│  │ blob URL  │       │  + OssResourceResolve   │        │
│  └───────────┘       │  Header                 │        │
│                      └─────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

**优势**：
- 移除 ali-oss 依赖，减少包体积
- 移除 Vercel STS API，简化部署
- 仅需 DashScope API Key，配置简化
- 临时存储自动清理，无需管理生命周期

---

## 2. 技术方案

### 2.1 方案对比

| 方案 | 优点 | 缺点 | 适用性 |
|------|------|------|--------|
| 原 ali-oss 方案 | 长期存储、灵活配置 | 需 STS、配置复杂、包体积大 | 不适用（已废弃） |
| DashScope 临时存储 | 无需 STS、配置简单、自动清理 | 48小时有效期、仅用于 AI 分析 | **选中** |

**结论**：选择 DashScope 临时存储方案，原因：
1. 与 AI 分析流程天然集成
2. 大幅减少环境变量配置
3. 移除服务端 STS 依赖，降低维护成本
4. 48小时有效期足够覆盖分析流程

### 2.2 详细设计

#### 组件 A: dashscope-upload.ts

**职责**：封装 DashScope 临时存储上传功能

**接口**：
```typescript
interface UploadResult {
  url: string        // oss:// 格式的临时 URL
  expires: number    // 过期时间戳
}

// 获取上传凭证
async function getUploadCredentials(): Promise<{
  policy: string
  signature: string
  upload_dir: string
  upload_host: string
}>

// 上传文件
async function uploadToDashScope(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResult>
```

**数据流**：
```
选择文件 ──► 本地预览(blob:) ──► 点击分析 ──► 获取凭证 ──► 表单上传
                                               │
                                               ▼
                                         返回 oss:// URL
                                               │
                                               ▼
                                    AI API + OssResourceResolve Header
```

#### 组件 B: temporaryFile.ts（兼容层）

**职责**：提供向后兼容的上传接口

**接口**：
```typescript
// 兼容旧接口，内部调用 dashscope-upload.ts
export async function uploadVideo(file: File): Promise<string>
export async function uploadImage(file: File): Promise<string>
```

#### 组件 C: useVideoAnalysis.ts

**职责**：管理视频分析全局状态

**关键状态**：
```typescript
// 视频文件状态
const videoFile = ref<File | null>(null)           // 本地文件对象
const videoUrl = ref<string>('')                   // oss:// URL（上传后）
const localVideoUrl = ref<string>('')              // blob:// URL（本地预览）
const uploadProgress = ref<number>(0)              // 上传进度
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')

// 图片文件状态（参考生成模式）
const imageFiles = ref<File[]>([])                 // 本地图片文件数组
const imageUrls = ref<string[]>([])                // oss:// URL 数组
const localImageUrls = ref<string[]>([])           // blob:// URL 数组

// 分析状态
const analysisStatus = ref<'idle' | 'analyzing' | 'completed' | 'error'>('idle')
const markdownContent = ref<string>('')            // Markdown 结果
const scriptItems = ref<VideoScriptItem[]>([])     // 结构化分镜数据
const tokenUsage = ref<TokenUsage | null>(null)    // Token 消耗

// 模型配置
const selectedModel = ref<string>('qwen3.5-flash') // 当前选择模型
const enableThinking = ref<boolean>(false)         // 思考模式
const thinkingContent = ref<string>('')            // 思考过程内容
```

**核心逻辑**：
1. 选择文件时仅生成 `localVideoUrl`（`URL.createObjectURL()`）
2. 切换模型时清空 `videoUrl` 和 `imageUrls`，保留本地文件
3. 点击分析时检查 `videoUrl`，为空则先上传
4. 上传完成后保存 `videoUrl`，后续分析直接使用

#### 组件 D: openai-client.ts

**职责**：配置 OpenAI 兼容客户端，添加 DashScope 专用 Header

**关键配置**：
```typescript
const client = new OpenAI({
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: apiKey,
  defaultHeaders: {
    // 关键 Header：启用 oss:// URL 解析
    'X-DashScope-OssResourceResolve': 'enable'
  }
})
```

---

## 3. 数据模型

### 3.1 文件上传相关类型

```typescript
// 上传进度回调
interface UploadProgressCallback {
  (progress: number): void
}

// 上传结果
interface UploadResult {
  url: string
  expires: number
}

// 上传凭证响应
interface UploadCredentials {
  policy: string
  signature: string
  upload_dir: string
  upload_host: string
}

// 文件上传状态
interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}
```

### 3.2 视频分析结果类型

```typescript
// 分镜条目（表格展示用）
interface VideoScriptItem {
  time: string          // 时间戳（如 00:15）
  duration: string      // 时长（如 3s）
  shotType: string      // 景别（特写/近景/中景/全景/远景）
  cameraMove: string    // 运镜方式
  visualDesc: string    // 画面描述
  audioDesc: string     // 声音/台词
}

// Token 使用情况
interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

// 分析结果
interface AnalysisResult {
  markdown: string
  scriptItems: VideoScriptItem[]
  tokenUsage: TokenUsage
  thinkingContent?: string
}
```

### 3.3 状态管理类型

```typescript
// 分析模式
type AnalysisMode = 'analyze' | 'create' | 'reference'

// 视图模式
type ViewMode = 'markdown' | 'table'

// 模型配置
interface ModelConfig {
  id: string
  name: string
  description: string
  supportsThinking: boolean
}
```

---

## 4. API 变更

### 4.1 新增 API

#### 上传凭证获取

```http
POST https://dashscope.aliyuncs.com/api/v1/files/upload
Authorization: Bearer {DASHSCOPE_API_KEY}
Content-Type: application/json

{
  "model": "qwen-vl-max"
}
```

响应：
```json
{
  "data": {
    "policy": "...",
    "signature": "...",
    "upload_dir": "...",
    "upload_host": "https://dashscope-exp.oss-cn-beijing.aliyuncs.com"
  }
}
```

#### 文件上传

```http
POST {upload_host}
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="policy"

{policy}
--boundary
Content-Disposition: form-data; name="signature"

{signature}
--boundary
Content-Disposition: form-data; name="key"

{upload_dir}/{filename}
--boundary
Content-Disposition: form-data; name="file"; filename="{filename}"
Content-Type: {mimeType}

{file_content}
--boundary--
```

响应：
```xml
<?xml version="1.0" encoding="UTF-8"?>
<PostResponse>
  <Location>{upload_host}/{upload_dir}/{filename}</Location>
  <Bucket>dashscope-exp</Bucket>
  <Key>{upload_dir}/{filename}</Key>
  <ETag>"..."</ETag>
</PostResponse>
```

### 4.2 修改的 API

#### AI 分析请求

```http
POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
Authorization: Bearer {DASHSCOPE_API_KEY}
Content-Type: application/json
X-DashScope-OssResourceResolve: enable  # 新增 Header

{
  "model": "qwen3.5-plus",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "{prompt}"},
        {"type": "video", "video": "oss://{bucket}/{key}"}  # oss:// URL
      ]
    }
  ],
  "stream": true,
  "stream_options": {"include_usage": true},
  "enable_thinking": true,        # 思考模式
  "thinking_budget": 1024         # 思考预算
}
```

### 4.3 废弃的 API

| API | 状态 | 替代方案 |
|-----|------|----------|
| `/api/oss-sts` (Vercel Function) | 已删除 | DashScope 内置上传凭证 |
| ali-oss `put()` | 已删除 | 标准表单 POST 上传 |
| ali-oss `multipartUpload()` | 已删除 | 标准表单 POST 上传 |

---

## 5. 测试策略

### 5.1 单元测试覆盖

| 模块 | 测试项 | 状态 |
|------|--------|------|
| dashscope-upload.ts | 凭证获取成功 | ✅ |
| dashscope-upload.ts | 凭证获取失败处理 | ✅ |
| dashscope-upload.ts | 上传进度回调 | ✅ |
| dashscope-upload.ts | XML 解析为 JSON | ✅ |
| temporaryFile.ts | 兼容接口调用 | ✅ |
| useVideoAnalysis.ts | 状态初始化 | ⏳ |
| useVideoAnalysis.ts | 模型切换清空 URL | ⏳ |
| openai-client.ts | Header 正确添加 | ✅ |

### 5.2 集成测试场景

| 场景 | 步骤 | 预期结果 | 状态 |
|------|------|----------|------|
| 视频分析流程 | 选文件 → 本地预览 → 上传 → AI 分析 | 返回 Markdown 和表格 | ✅ |
| 从零创作流程 | 选文件 → 填需求 → 上传 → AI 生成 | 返回脚本内容 | ⏳ |
| 参考生成流程 | 选视频+图片 → 填参考 → 上传 → AI 生成 | 返回参考脚本 | ⏳ |
| 模型切换重传 | 上传后切换模型 → 重新提交 | 重新上传文件 | ⏳ |
| 大文件上传 | 选择 80MB 视频 | 上传成功，进度正常 | ✅ |
| 格式校验 | 选择非视频文件 | 拒绝并提示 | ✅ |

### 5.3 手动验证清单

- [x] MP4 格式视频上传成功
- [x] MOV 格式视频上传成功
- [x] AVI 格式视频上传成功
- [x] JPEG 图片上传成功
- [x] PNG 图片上传成功
- [x] WebP 图片上传成功
- [x] GIF 图片上传成功
- [x] 多图片同时上传成功
- [x] 上传进度显示准确
- [x] 上传失败错误提示清晰
- [x] 凭证过期自动重新获取
- [x] AI 调用包含 OssResourceResolve Header
- [x] oss:// URL 被正确解析
- [x] 思考模式参数正常传递
- [ ] 模型切换后正确清空已上传 URL

### 5.4 性能测试

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 凭证获取时间 | < 500ms | ~200ms | ✅ |
| 上传速度 | > 2MB/s | ~3MB/s | ✅ |
| 首 token 响应 | < 3s | ~2s | ✅ |
| 完整分析时间(1分钟视频) | < 30s | ~20s | ✅ |

---

## 6. 代码清理清单

### 6.1 依赖清理

| 依赖 | 状态 | 操作 |
|------|------|------|
| `ali-oss` | ✅ 已移除 | npm uninstall |
| `@types/ali-oss` | ⏳ 待移除 | npm uninstall --save-dev |

### 6.2 文件清理

| 文件 | 状态 | 操作 |
|------|------|------|
| `api/oss-sts.ts` | ✅ 已删除 | 移除 Vercel Function |
| `src/api/oss-client.ts` | ✅ 已删除 | 移除 OSS 客户端封装 |

### 6.3 配置清理

| 配置项 | 状态 | 操作 |
|--------|------|------|
| `VITE_ALIYUN_OSS_REGION` | ✅ 已移除 | 从 .env 删除 |
| `VITE_ALIYUN_OSS_BUCKET` | ✅ 已移除 | 从 .env 删除 |
| `VITE_ALIYUN_OSS_ACCESS_KEY_ID` | ✅ 已移除 | 从 .env 删除 |
| `VITE_ALIYUN_OSS_ACCESS_KEY_SECRET` | ✅ 已移除 | 从 .env 删除 |
| `ALIYUN_OSS_ROLE_ARN` | ✅ 已移除 | 从 .env 删除 |

### 6.4 文档更新

| 文档 | 状态 | 操作 |
|------|------|------|
| CLAUDE.md | ⏳ 待更新 | 更新 v0.2.3 为已完成 |
| README.md | ⏳ 待检查 | 更新环境变量说明 |
| package.json version | ⏳ 待更新 | 更新为 0.2.4 |

---

## 7. 风险与回滚

### 7.1 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| DashScope 临时存储服务不稳定 | 高 | 添加重试机制（最多3次） |
| 48小时有效期不足 | 低 | 分析流程通常在几分钟内完成 |
| 大文件上传超时 | 中 | 添加进度提示，不支持断点续传 |
| 模型切换后缓存问题 | 低 | 确保状态完全重置 |

### 7.2 回滚方案

如需回滚到 ali-oss 方案：

1. 恢复 `api/oss-sts.ts` 文件
2. 恢复 `src/api/oss-client.ts` 文件
3. 重新安装 `ali-oss` 依赖
4. 恢复环境变量配置
5. 修改 `temporaryFile.ts` 调用 OSS 客户端

---

## 8. 性能考量

### 8.1 包体积优化

| 优化项 | 变更前 | 变更后 | 减少 |
|--------|--------|--------|------|
| ali-oss SDK | ~180KB | 0KB | -180KB |
| 总打包体积 | ~850KB | ~670KB | -21% |

### 8.2 网络优化

- 本地预览使用 `blob:` URL，无需网络请求
- 上传采用标准表单 POST，无需额外 SDK 加载
- AI 调用复用同一连接（HTTP/2 复用）

### 8.3 内存管理

- 本地 blob URL 及时释放（`URL.revokeObjectURL()`）
- 上传完成后保留原始 File 对象，支持重新上传
- 大文件分片上传（如需）在后续版本实现
