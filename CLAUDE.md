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
  1. 通过 tmpfile.link 临时文件服务上传视频（支持 100MB）
  2. 获取临时访问 URL（有效期 7 天）
  3. 使用 URL 调用通义千问 AI 进行分析

- **统一接口**：`analyzeVideo(source, apiKey, model, onProgress)` 自动处理 File 或 URL

- **模型支持**：
  - `qwen3-vl-flash` - 默认，响应速度快
  - `qwen3-vl-plus` - 更强大，适合复杂视频场景

- **API 详情**：
  - 端点：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
  - 使用兼容 OpenAI 的 chat completions 格式，支持视觉能力
  - 通过 Bearer token 进行授权（DashScope API Key）

- **CORS 跨域处理**：
  - 开发环境：通过 Vite 代理 `/api/tmpfile` 解决跨域问题
  - 生产环境：需要配置反向代理（参见 [DEPLOYMENT.md](DEPLOYMENT.md)）

- **错误处理**：对常见 API 问题进行全面的错误解析（SafetyError、InvalidParameter、TooLarge、AuthenticationNotPass、Throttling）

- **响应解析**：从多种格式中提取 JSON（纯 JSON、markdown 代码块或嵌入在文本中）

### 类型定义

**[video.ts](src/types/video.ts)** 定义结构化输出格式：

```typescript
interface VideoScriptItem {
  sequenceNumber: number;      // 序号
  shotType: string;            // 景别
  cameraMovement: string;      // 运镜方式
  visualContent: string;       // 画面内容
  onScreenText: string;        // 画面文案
  voiceover: string;           // 口播
  audio: string;               // 音效/音乐
  duration: string;            // 时长
  keyframeTimes: string;       // 关键画面帧数
}
```

### 构建配置

- **Vite 变体**：使用 `rolldown-vite@7.2.5` 而非标准 Vite（在 package.json overrides 中配置）
- **TypeScript**：启用严格模式和所有 linting 规则 ([tsconfig.app.json](tsconfig.app.json:8-13))
- **Vue SFC**：全部使用 `<script setup>` 语法

## API Key 配置

应用需要阿里云的 DashScope API Key：
- 获取 API Key：https://help.aliyun.com/zh/model-studio/get-api-key
- 可通过 UI 模态框配置，或在 `.env` 文件中设置（参见 `.env.example`）
- 存储在 localStorage，键名为：`dashscope_api_key`

## 视频文件处理

- **支持格式**：MP4、MOV、AVI、WebM、MKV
- **文件大小限制**：100MB（通过 tmpfile.link 临时文件服务）
- **上传方式**：自动上传到临时文件服务，获取 URL 后传给 AI
- **文件保存期限**：7 天自动删除（tmpfile.link 免费服务）
- **安全性**：视频会经过 API 的内容安全检查

## 关键实现要点

- AI 提示词 ([videoAnalysis.ts](src/api/videoAnalysis.ts:7-47)) 对输出质量至关重要 - 它指示模型扮演专业视频创作者，并输出符合 VideoScriptItem 结构的 JSON
- 整个分析流程使用进度回调向用户提供反馈
- CSV 导出包含 BOM (\ufeff) 以确保在 Excel 中正确显示 UTF-8
- 视频预览使用对象 URL，并在清理时正确释放
- **代码优化**：videoAnalysis.ts 已从 747 行简化到 198 行，移除了流式输出和 base64 备用方案

## 临时文件服务集成

应用集成了 tmpfile.link 免费临时文件服务来支持大文件上传：

- **服务地址**：https://tmpfile.link
- **最大文件**：100MB
- **保存期限**：7 天自动删除
- **全球 CDN**：支持全球加速下载
- **无需注册**：匿名上传即可使用

详细的部署配置和反向代理设置请参见 [DEPLOYMENT.md](DEPLOYMENT.md)。
