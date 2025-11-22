# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

YouMedHub 是一个基于 Vue 3 + TypeScript 的视频分析应用，使用 AI 分析视频内容并生成结构化的脚本拆解。应用通过 DashScope API 调用阿里巴巴的通义千问视觉语言模型（qwen-vl-max），从视频中提取景别、运镜方式、画面内容、口播等详细信息。

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
- 调用 AI 视频分析 API
- 在表格中展示结构化结果
- 导出结果为 JSON/CSV 格式
- API Key 持久化存储在 localStorage

### API 集成

**[videoAnalysis.ts](src/api/videoAnalysis.ts)** 包含视频分析逻辑：

- **两种分析模式**：
  1. `analyzeVideoByUrl()` - 推荐：分析来自公共 URL 的视频
  2. `analyzeVideoByFile()` - 将视频转换为 base64 进行本地文件上传（10MB 限制）

- **统一接口**：`analyzeVideo()` 根据输入类型（File 或 string）自动路由到相应方法

- **API 详情**：
  - 端点：`https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
  - 模型：`qwen-vl-max`
  - 使用兼容 OpenAI 的 chat completions 格式，支持视觉能力
  - 通过 Bearer token 进行授权（DashScope API Key）

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
- **文件大小限制**：base64 上传模式下限制为 10MB
- **建议**：使用视频 URL 而非本地文件，可绕过大小限制并提高可靠性
- **安全性**：视频会经过 API 的内容安全检查

## 关键实现要点

- AI 提示词 ([videoAnalysis.ts](src/api/videoAnalysis.ts:3-40)) 对输出质量至关重要 - 它指示模型扮演专业视频创作者，并输出符合 VideoScriptItem 结构的 JSON
- 整个分析流程使用进度回调向用户提供反馈
- CSV 导出包含 BOM (\ufeff) 以确保在 Excel 中正确显示 UTF-8
- 视频预览使用对象 URL，并在清理时正确释放
