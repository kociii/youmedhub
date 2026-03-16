# v0.2.3 存储方案重构

## 版本概述

将文件存储从自建阿里云 OSS 方案迁移至阿里云百炼临时存储，简化架构并降低运维成本。

| 需求 | 描述 | 优先级 | 相关文档 |
|------|------|--------|----------|
| 存储方案迁移 | 从自建 OSS 迁移到百炼临时存储 | P0 | 本文档 |
| 上传模块重构 | 新增百炼上传 API 封装 | P0 | 本文档 |
| API 调用适配 | 添加 OSS 资源解析 Header | P0 | 本文档 |
| 旧代码清理 | 移除 OSS 相关依赖和代码 | P1 | 本文档 |

---

## 需求 1：存储方案迁移

### 1.1 背景与目标

**当前方案架构**：

| 组件 | 说明 |
|------|------|
| `api/oss-sts.ts` | Vercel Serverless Function，生成 STS 临时凭证 |
| `ali-oss` | npm 包，浏览器直传 OSS |
| 阿里云 RAM 角色 | 需要配置 `ALIYUN_ROLE_ARN` |
| 阿里云 OSS Bucket | 自建存储空间 |
| 签名 URL | 24小时有效期 |

**目标方案架构**：

| 组件 | 说明 |
|------|------|
| 阿里云百炼临时存储 | 官方免费存储空间 |
| 标准表单 POST | 无需 SDK，纯前端实现 |
| 临时 URL | 48小时有效期（`oss://` 前缀） |

### 1.2 方案对比

| 维度 | 当前方案（自建 OSS） | 新方案（百炼临时存储） |
|------|---------------------|----------------------|
| **成本** | 需要付费 OSS Bucket | 免费 |
| **架构复杂度** | 需要后端 STS 服务、RAM 角色 | 纯前端实现 |
| **依赖** | `ali-oss` npm 包 | 无额外依赖 |
| **URL 有效期** | 24小时（可配置） | 48小时（固定） |
| **限流** | 无限制 | 100 QPS |
| **生产环境** | 推荐 | 不推荐（官方说明） |

### 1.3 适用性评估

| 限制项 | 对项目影响 | 评估结论 |
|--------|-----------|----------|
| 48小时有效期 | 视频分析是即时场景，上传后立即调用 AI | ✅ 无影响 |
| 100 QPS 限流 | 个人/小团队应用，并发量低 | ✅ 可接受 |
| 文件与模型绑定 | 需要在上传时指定目标模型 | ⚠️ 需适配 |
| 不推荐生产环境 | 当前项目处于 MVP 阶段 | ✅ 可接受 |

### 1.4 验收标准

- [ ] 视频文件上传成功并返回 `oss://` URL
- [ ] 图片文件上传成功并返回 `oss://` URL
- [ ] 上传进度回调正常工作
- [ ] 错误处理覆盖常见异常

---

## 需求 2：上传模块重构

### 2.1 关键交互变更

**变更前（立即上传）**：
- 用户选择文件 → 立即上传 → 显示远程预览 → 提交分析

**变更后（提交时上传）**：
- 用户选择文件 → 本地预览 → 提交时上传 → 获取 oss:// URL → 调用 AI 分析

| 阶段 | 本地文件 | OSS URL |
|------|----------|---------|
| 文件选择后 | ✅ 用于预览 | ❌ 未生成 |
| 点击提交后 | ✅ 用于上传 | ✅ 生成后用于 AI 调用 |

### 2.2 新增模块

新建 `src/api/dashscope-upload.ts`，封装阿里云百炼文件上传流程。

### 2.3 上传流程

```
用户选择文件
    │
    ▼
┌─────────────────┐
│ 存储 File 对象  │───▶ videoFile / imageFile (本地预览用)
│ 生成本地 URL    │───▶ localVideoUrl / localImageUrl (预览播放)
└─────────────────┘
    │
    ▼ (用户点击提交)
┌─────────────────────────┐
│ uploadToDashScope()     │
│ ├── Step 1: 获取上传凭证│
│ │   GET /api/v1/uploads │
│ │   ?action=getPolicy   │
│ │   &model=xxx          │
│ │                       │
│ ├── Step 2: 上传文件    │
│ │   POST {upload_host}  │
│ │   FormData: {key,     │
│ │   file, ...}          │
│ │                       │
│ └── Step 3: 生成临时 URL│
│     oss://...           │
└─────────────────────────┘
    │
    ▼
调用 AI API (使用 oss:// URL)
```

### 2.3 接口详情

#### Step 1: 获取上传凭证

**请求**：

```
GET https://dashscope.aliyuncs.com/api/v1/uploads?action=getPolicy&model={model_name}
Authorization: Bearer {api_key}
Content-Type: application/json
```

**响应**：

```json
{
  "request_id": "xxx",
  "data": {
    "policy": "eyJleHBpcmF0aW9...",
    "signature": "eWy...",
    "upload_dir": "dashscope-instant/xxx/2024-07-18/xxx",
    "upload_host": "https://dashscope-file-xxx.oss-cn-beijing.aliyuncs.com",
    "expire_in_seconds": 300,
    "max_file_size_mb": 100,
    "oss_access_key_id": "LTA...",
    "x_oss_object_acl": "private",
    "x_oss_forbid_overwrite": "true"
  }
}
```

#### Step 2: 上传文件

**请求**：

```
POST {upload_host}
Content-Type: multipart/form-data

FormData:
├── OSSAccessKeyId: {oss_access_key_id}
├── Signature: {signature}
├── policy: {policy}
├── key: {upload_dir}/{file_name}
├── x-oss-object-acl: private
├── x-oss-forbid-overwrite: true
├── success_action_status: 200
└── file: {binary_file}
```

#### Step 3: 拼接 URL

```typescript
const ossUrl = `oss://${upload_dir}/${file.name}`
// 示例: oss://dashscope-instant/xxx/2024-07-18/xxx/video.mp4
```

### 2.4 类型定义

```typescript
// 上传凭证响应
interface UploadPolicyResponse {
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
interface UploadOptions {
  file: File
  model: string  // 目标模型，如 'qwen-vl-max'
  apiKey: string
  onProgress?: (loaded: number, total: number) => void
}

// 上传结果
interface UploadResult {
  ossUrl: string      // oss://dashscope-instant/xxx/...
  expiresIn: number   // 有效期（毫秒），48小时
}
```

### 2.5 验收标准

- [ ] `getUploadPolicy()` 函数正常获取凭证
- [ ] `uploadFileToOSS()` 函数正常上传文件
- [ ] `uploadToDashScope()` 函数返回正确的 `oss://` URL
- [ ] 上传进度回调正常触发
- [ ] 错误场景（网络失败、凭证过期等）正确处理

---

## 需求 3：API 调用适配

### 3.1 添加 OSS 资源解析 Header

使用 `oss://` 前缀的临时 URL 调用模型时，**必须**在 HTTP Header 中添加：

```
X-DashScope-OssResourceResolve: enable
```

### 3.2 修改文件

修改 `src/lib/openai-client.ts`：

```typescript
// streamChat 函数
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-DashScope-OssResourceResolve': 'enable',  // 新增
  },
  body: JSON.stringify(body),
})

// chat 函数同理
```

### 3.3 调用示例

```typescript
// 视频分析调用
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-DashScope-OssResourceResolve': 'enable',
  },
  body: JSON.stringify({
    model: 'qwen-vl-max',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: '分析这个视频' },
        { type: 'video_url', video_url: { url: 'oss://dashscope-instant/xxx/video.mp4' } }
      ]
    }]
  })
})
```

### 3.4 错误处理

如果缺少 `X-DashScope-OssResourceResolve` Header，会返回错误：

```json
{
  "code": "InvalidParameter.DataInspection",
  "message": "The media format is not supported or incorrect for the data inspection."
}
```

需要在错误处理中识别并提示用户。

### 3.5 验收标准

- [ ] 所有 AI API 调用添加 `X-DashScope-OssResourceResolve` Header
- [ ] 使用 `oss://` URL 的请求正常返回结果
- [ ] 缺少 Header 的错误能被正确识别和处理

---

## 需求 4：旧代码清理

### 4.1 删除文件

| 文件 | 说明 |
|------|------|
| `api/oss-sts.ts` | Vercel Serverless Function（STS 凭证） |

### 4.2 移除依赖

```bash
npm uninstall ali-oss
```

### 4.3 更新文件

| 文件 | 变更 |
|------|------|
| `src/api/temporaryFile.ts` | 重构为调用 `dashscope-upload.ts`，或直接替换实现 |
| `package.json` | 移除 `ali-oss` 依赖 |
| `.env.example` | 移除 OSS 相关环境变量示例 |
| `CLAUDE.md` | 更新存储方案说明 |

### 4.4 环境变量变更

**移除的环境变量**：

| 变量 | 说明 |
|------|------|
| `VITE_ALIYUN_OSS_REGION` | OSS 区域 |
| `VITE_ALIYUN_OSS_BUCKET` | OSS Bucket 名称 |
| `VITE_ALIYUN_ACCESS_KEY_ID` | 主账号 AccessKey（本地开发用） |
| `VITE_ALIYUN_ACCESS_KEY_SECRET` | 主账号 Secret（本地开发用） |
| `ALIYUN_ROLE_ARN` | RAM 角色 ARN（Vercel 用） |

**保留的环境变量**：

| 变量 | 说明 |
|------|------|
| `VITE_DASHSCOPE_API_KEY` | 阿里百炼 API Key（已有） |

### 4.5 验收标准

- [ ] `ali-oss` 依赖已从 `package.json` 移除
- [ ] `api/oss-sts.ts` 文件已删除
- [ ] OSS 相关环境变量配置已移除
- [ ] `npm run build` 正常通过
- [ ] Vercel 部署正常

---

## 文件变更清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `src/api/dashscope-upload.ts` | 百炼临时存储上传封装 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/lib/openai-client.ts` | 添加 `X-DashScope-OssResourceResolve` Header |
| `src/api/temporaryFile.ts` | 重构为调用百炼上传 |
| `package.json` | 移除 `ali-oss` 依赖 |
| `CLAUDE.md` | 更新存储方案说明 |

### 删除文件

| 文件 | 说明 |
|------|------|
| `api/oss-sts.ts` | STS 凭证 Serverless Function |

---

## 风险与注意事项

### 风险点

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 模型切换后需重新上传 | 文件与模型绑定 | 上传时记录目标模型，切换时提示用户 |
| 100 QPS 限流 | 高并发场景受限 | 当前用户量小，可接受；后续可迁移回 OSS |
| 不适合生产环境 | 官方明确说明 | MVP 阶段可用，生产环境再迁移 |

### 注意事项

1. **调试时**：使用 `oss://` URL 时必须添加 Header，否则报错 `InvalidParameter.DataInspection`
2. **URL 格式**：返回的是 `oss://` 前缀，不是 `https://`
3. **文件大小限制**：不同模型有不同限制，需在文档中查看（通常 100MB）
4. **有效期**：48小时后文件自动清理，无法恢复

---

## 验证清单

### 上传功能

- [ ] 视频文件上传成功
- [ ] 图片文件上传成功
- [ ] 上传进度显示正常
- [ ] 大文件上传正常（>50MB）
- [ ] 错误处理正确（网络失败、文件过大等）

### API 调用

- [ ] 视频分析调用正常（使用 `oss://` URL）
- [ ] 图片分析调用正常（使用 `oss://` URL）
- [ ] 流式输出正常
- [ ] 思考模式正常

### 清理工作

- [ ] `ali-oss` 依赖移除
- [ ] `api/oss-sts.ts` 删除
- [ ] 环境变量配置更新
- [ ] `npm run build` 通过
- [ ] Vercel 部署成功

---

## 参考资料

- [阿里云百炼临时文件 URL 文档](https://help.aliyun.com/zh/model-studio/get-temporary-file-url)
- [OpenAI SDK 兼容模式文档](https://help.aliyun.com/zh/model-studio/developer-reference/use-qwen-by-calling-api)