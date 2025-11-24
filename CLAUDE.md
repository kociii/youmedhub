# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

YouMedHub 是一个基于 Vue 3 + TypeScript 的视频分析应用，使用 AI 分析视频内容并生成结构化的脚本拆解。应用通过 DashScope API 调用阿里巴巴的通义千问视觉语言模型（qwen3-vl-flash/qwen3-vl-plus），从视频中提取景别、运镜方式、画面内容、口播等详细信息。

## 开发命令

### 启动开发服务器

```bash
pnpm dev
```

启动 Vite 开发服务器（使用 rolldown-vite 变体）。

### 构建生产版本

```bash
pnpm build
```

运行 TypeScript 类型检查并构建应用。

### 预览生产构建

```bash
pnpm preview
```

在本地预览生产构建。

## Git 工作流规范

**重要：每次提交前必须先构建验证！**

### 提交到功能分支

1. 完成代码修改后，先运行构建验证：

```bash
pnpm build
```

2. 确认构建成功（无错误）后再提交：

```bash
git add .
git commit -m "commit message"
```

### 合并到主分支

1. 切换到主分支并合并功能分支前，先在功能分支验证构建：

```bash
# 在功能分支
pnpm build

# 确认无误后合并
git checkout main
git merge feature-branch
```

2. 合并后再次构建验证：

```bash
pnpm build
```

3. 确认构建成功后再推送到远程：

```bash
git push origin main
```

### 构建失败处理

如果构建失败：

- **不要提交**，先修复错误
- 常见错误类型：
  - TypeScript 类型错误
  - 未使用的导入或变量
  - 缺失的依赖
  - 语法错误

## 架构设计

### 核心应用结构

- **单页应用**：应用使用单个主组件 ([VideoAnalyzer.vue](src/components/VideoAnalyzer.vue)) 挂载在 [App.vue](src/App.vue) 中
- **无路由**：这是一个单视图应用，不使用 Vue Router
- **状态管理**：使用 Vue 3 Composition API 和响应式 refs，不使用 Pinia 或 Vuex

### 核心组件

**[VideoAnalyzer.vue](src/components/VideoAnalyzer.vue)** （主组件）：

- 处理视频文件上传和预览
- 通过模态对话框管理 API Key 配置
- **AI 模型选择**：支持 qwen3-vl-flash（默认）和 qwen3-vl-plus
- 调用 AI 视频分析 API
- 在表格中展示结构化结果
- 导出结果为 JSON/CSV 格式
- API Key 持久化存储在 localStorage

### API 集成

**[videoAnalysis.ts](src/api/videoAnalysis.ts)** 包含视频分析逻辑（已优化简化，从 747 行减少到 198 行）：

- **上传分析流程**：
  1. 浏览器直接上传视频到阿里云 OSS（支持 100MB）
  2. 获取 OSS 访问 URL
  3. 使用 URL 调用通义千问 AI 进行分析

- **统一接口**：`analyzeVideo(source, apiKey, model, onProgress)` 自动处理 File 或 URL

- **模型支持**：
  - `qwen3-vl-flash` - 默认，响应速度快
  - `qwen3-vl-plus` - 更强大，适合复杂视频场景

- **API 详情**：
  - 端点：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
  - 使用兼容 OpenAI 的 chat completions 格式，支持视觉能力
  - 通过 Bearer token 进行授权（DashScope API Key）

- **文件上传**：
  - 使用阿里云 OSS SDK 实现浏览器直传
  - 通过 STS 临时凭证确保安全性
  - 上传流量不占用 Vercel 带宽

- **错误处理**：对常见 API 问题进行全面的错误解析（SafetyError、InvalidParameter、TooLarge、AuthenticationNotPass、Throttling）

- **响应解析**：从多种格式中提取 JSON（纯 JSON、markdown 代码块或嵌入在文本中）

### 类型定义

**[video.ts](src/types/video.ts)** 定义结构化输出格式：

```typescript
// 视频分析脚本项
interface VideoScriptItem {
  sequenceNumber: number;      // 序号
  shotType: string;            // 景别
  cameraMovement: string;      // 运镜方式
  visualContent: string;       // 画面内容
  onScreenText: string;        // 画面文案
  voiceover: string;           // 口播
  audio: string;               // 音效/音乐
  startTime: string;           // 开始时间 (MM:SS)
  endTime: string;             // 结束时间 (MM:SS)
  duration: string;            // 时长 (MM:SS)
}

// API 返回结果
interface VideoAnalysisResponse {
  rep: VideoScriptItem[];
}

// Token 使用统计
interface TokenUsage {
  prompt_tokens: number;       // 输入 Tokens
  completion_tokens: number;   // 输出 Tokens
  total_tokens: number;        // 总计 Tokens
}
```

### 构建配置

- **Vite 变体**：使用 `rolldown-vite@7.2.5` 而非标准 Vite（在 package.json overrides 中配置）
- **TypeScript**：启用严格模式和所有 linting 规则 ([tsconfig.app.json](tsconfig.app.json:8-13))
- **Vue SFC**：全部使用 `<script setup>` 语法

## API Key 配置

应用需要阿里云的 DashScope API Key：

- 获取 API Key：<https://help.aliyun.com/zh/model-studio/get-api-key>
- 可通过 UI 模态框配置，或在 `.env` 文件中设置（参见 `.env.example`）
- 存储在 localStorage，键名为：`dashscope_api_key`

## 视频文件处理

- **支持格式**：MP4、MOV、AVI、WebM、MKV
- **文件大小限制**：100MB
- **上传方式**：浏览器直传到阿里云 OSS（无需经过服务器）
- **安全机制**：
  - 使用 STS 临时凭证，权限自动过期（1 小时）
  - 视频会经过 AI API 的内容安全检查
  - 上传流量不占用 Vercel 带宽

## 关键实现要点

- AI 提示词 ([videoAnalysis.ts](src/api/videoAnalysis.ts:7-47)) 对输出质量至关重要 - 它指示模型扮演专业视频创作者，并输出符合 VideoScriptItem 结构的 JSON
- 整个分析流程使用进度回调向用户提供反馈
- CSV 导出包含 BOM (\ufeff) 以确保在 Excel 中正确显示 UTF-8
- 视频预览使用对象 URL，并在清理时正确释放
- **代码优化**：videoAnalysis.ts 已从 747 行简化到 198 行，移除了流式输出和 base64 备用方案

## 阿里云 OSS 集成

应用使用阿里云对象存储服务（OSS）实现视频文件的浏览器直传：

### 架构设计

- **浏览器直传**：视频文件直接从浏览器上传到 OSS，不经过 Vercel 服务器
- **STS 临时凭证**：通过 Vercel Edge Function 生成临时访问凭证，确保安全性
- **自动过期**：临时凭证有效期 1 小时，过期后自动失效

### OSS 集成核心文件

**[api/oss-sts.ts](api/oss-sts.ts)** - Vercel Edge Function：

- 调用阿里云 STS API 生成临时凭证
- 实现完整的阿里云 API 签名算法（HMAC-SHA1）
- 返回 accessKeyId、accessKeySecret、securityToken 等信息

**[temporaryFile.ts](src/api/temporaryFile.ts)** - 前端上传逻辑：

- 使用 ali-oss SDK（v6.23.0）实现浏览器直传
- 自动获取 STS 临时凭证
- 支持上传进度回调
- 生成唯一文件名（`videos/{timestamp}-{random}.{ext}`）

### 环境变量配置

在 Vercel 项目设置中配置以下环境变量：

```bash
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_ROLE_ARN=acs:ram::account-id:role/role-name
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
```

### RAM 角色权限

需要创建一个 RAM 角色，并授予以下权限：

- `oss:PutObject` - 允许上传文件
- `oss:GetObject` - 允许读取文件（可选，用于预览）

详细配置步骤参见 [.env.example](.env.example) 文件。
