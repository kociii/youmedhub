# AI 视频分镜脚本分析工具 v0.2.0 — 开发计划

## 概述

基于 PRD（`prd.md`）和界面设计（`design.md`），在已重构的 Vue 3 + Vite 7 + TypeScript + Tailwind CSS + shadcn-vue 技术栈上，实现完整的视频分镜脚本分析功能。

核心策略：从 main 分支迁移可复用的业务逻辑（API 调用、类型定义、工具函数），用 shadcn-vue 组件重建 UI 层。

---

## 阶段一：基础设施

### P1-1 安装项目依赖

新增依赖：

```text
# 业务依赖
ali-oss                  # 阿里云 OSS SDK（浏览器直传）
xlsx                     # Excel 导出
markstream-vue           # Markdown 流式渲染
```

### P1-2 添加 shadcn-vue 组件

根据界面设计，需要以下 UI 组件：

```text
npx shadcn-vue@latest add button
npx shadcn-vue@latest add card
npx shadcn-vue@latest add tabs
npx shadcn-vue@latest add table
npx shadcn-vue@latest add dialog
npx shadcn-vue@latest add input
npx shadcn-vue@latest add progress
npx shadcn-vue@latest add badge
npx shadcn-vue@latest add separator
```

### P1-3 迁移业务逻辑层

从 main 分支迁移以下文件，适配新技术栈：

| 源文件 (main) | 目标文件 (v0.2.0) | 适配说明 |
| --- | --- | --- |
| `src/types/video.ts` | `src/types/video.ts` | 新增 `shootingGuide` 字段（拍摄指导），与 prompt.md 11 列对齐 |
| `src/prompts/videoAnalysis.ts` | `src/prompts/videoAnalysis.ts` | 直接复用，确认与 prompt.md 一致 |
| `src/api/temporaryFile.ts` | `src/api/temporaryFile.ts` | 直接复用 OSS 上传逻辑 |
| `src/api/videoAnalysis.ts` | `src/api/videoAnalysis.ts` | 适配新类型定义（11 列解析），模型使用 qwen-vl-flash |
| `src/utils/exportExcel.ts` | `src/utils/exportExcel.ts` | 适配新字段（增加拍摄指导列） |
| `src/utils/videoCapture.ts` | `src/utils/videoCapture.ts` | 仅保留时间解析函数，移除截图相关 |
| `api/oss-sts.ts` | `api/oss-sts.ts` | Vercel Serverless Function，直接复用 |

### P1-4 本地缓存工具

从 main 分支迁移 `src/utils/localCache.ts`，用于 API Key 的 localStorage 存取。

---

## 阶段二：页面骨架与布局

### P2-1 App.vue 主布局

替换当前计数器示例，实现整体页面结构：

```text
+-----------------------------------------------------------------------------------+
|  顶部栏：Logo + 标题 "youmedhub"                          [API Key 设置]          |
+-------------------+---------------------------------------------------------------+
|                   |  右侧上方工具栏                                                |
|   左侧面板        |  分析结果  [@ 原始内容] [# 分镜表格]       [导出 Excel]         |
|   (固定宽度)      +---------------------------------------------------------------+
|                   |                                                               |
|   视频上传/预览    |  右侧内容区                                                   |
|   分析控制        |                                                               |
|                   |                                                               |
+-------------------+---------------------------------------------------------------+
```

组件拆分：
- `App.vue` — 顶部栏 + 左右分栏容器
- `LeftPanel.vue` — 左侧面板容器
- `RightPanel.vue` — 右侧主区域容器

---

## 阶段三：功能实现

### P3-1 F5 — API Key 配置

**优先级最高**，后续功能依赖 API Key。

文件：
- `src/components/ApiKeyDialog.vue`

功能：
- Dialog 弹窗，包含 Input 输入框
- 读写 localStorage（通过 localCache 工具）
- 顶部栏右侧 [API Key 设置] 按钮触发

### P3-2 F1 — 视频上传

文件：
- `src/components/VideoUploader.vue` — 拖拽/点击上传区
- `src/components/VideoPreview.vue` — 视频预览播放器

功能：
- 拖拽和点击上传（原生 input[type=file] + drag events）
- 前端校验：格式（mp4/mov）、大小（≤100MB）、时长（≤10 分钟）
- 调用 `api/temporaryFile.ts` 上传至 OSS
- Progress 组件显示上传进度
- 上传完成后切换为视频预览播放器

### P3-3 F2 — AI 视频分析

文件：
- `src/components/AnalysisControl.vue` — 分析控制面板

功能：
- [开始分析] 按钮（视频未上传时禁用）
- 调用 `api/videoAnalysis.ts`，传入 OSS 链接 + 内置提示词
- 流式接收 SSE 数据，实时累积 Markdown 内容
- 显示分析状态（idle / analyzing / success / error）
- 显示 Token 使用统计（Badge 组件）

### P3-4 F3 — 分析结果展示

文件：
- `src/components/ResultToolbar.vue` — 右侧上方工具栏（模式切换 + 导出按钮）
- `src/components/MarkdownView.vue` — Markdown 原始内容模式
- `src/components/ScriptTable.vue` — 分镜脚本表格模式
- `src/components/VideoSegmentPlayer.vue` — 行内视频片段播放器

**模式一：Markdown 原始内容**
- 使用 `markstream-vue` 的 `MarkdownRender` 组件
- 流式渲染：通过 `parseMarkdownToStructure` 解析累积的 buffer，传入 `nodes` prop
- 设置 `max-live-nodes="0"` 启用增量批次渲染（打字机效果）
- 流结束时设置 `final` prop 为 true

```vue
<MarkdownRender
  :nodes="nodes"
  :max-live-nodes="0"
  :batch-rendering="{ renderBatchSize: 16, renderBatchDelay: 8 }"
  :final="isComplete"
/>
```

**模式二：分镜脚本表格**
- 调用 `videoAnalysis.ts` 中的 Markdown 表格解析函数，转为 `VideoScriptItem[]`
- 使用 shadcn-vue Table 组件渲染 11 列数据
- 最右列嵌入 `VideoSegmentPlayer.vue`，基于 startTime/endTime 约束播放区间

**VideoSegmentPlayer 实现要点：**
- 复用上传视频的 URL 作为 `<video>` src
- 通过 `currentTime` 设置起始位置
- 监听 `timeupdate` 事件，到达 endTime 时暂停
- 提供播放/暂停按钮

### P3-5 F4 — 导出 Excel

功能：
- 右侧工具栏 [导出 Excel] 按钮
- 调用 `utils/exportExcel.ts`，将 `VideoScriptItem[]` 导出为 .xlsx
- 仅在表格模式且有数据时可用

---

## 阶段四：状态管理与串联

### P4-1 应用状态

使用 Vue 3 Composition API（`ref` / `reactive` / `provide` / `inject`）管理全局状态，无需引入 Pinia：

```typescript
// src/composables/useVideoAnalysis.ts
interface AppState {
  // F1 视频上传
  videoFile: File | null
  videoUrl: string          // OSS 临时链接
  uploadProgress: number
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'

  // F2 AI 分析
  analysisStatus: AnalysisStatus
  markdownContent: string   // AI 返回的原始 Markdown（流式累积）
  scriptItems: VideoScriptItem[]  // 解析后的结构化数据
  tokenUsage: TokenUsage | null

  // F3 展示模式
  viewMode: 'markdown' | 'table'

  // F5 API Key
  apiKey: string
}
```

### P4-2 组件通信

```text
App.vue
├── 顶部栏
│   ├── Logo + 标题
│   └── ApiKeyDialog.vue          ← apiKey
├── LeftPanel.vue
│   ├── VideoUploader.vue         ← videoFile, uploadProgress
│   ├── VideoPreview.vue          ← videoUrl
│   └── AnalysisControl.vue       ← analysisStatus, tokenUsage
└── RightPanel.vue
    ├── ResultToolbar.vue         ← viewMode, 导出按钮
    ├── MarkdownView.vue          ← markdownContent (流式)
    ├── ScriptTable.vue           ← scriptItems
    └── VideoSegmentPlayer.vue    ← videoUrl, startTime, endTime
```

---

## 目标文件结构

```text
src/
├── api/
│   ├── temporaryFile.ts          # OSS 上传（从 main 迁移）
│   └── videoAnalysis.ts          # 百炼 API 调用（从 main 迁移 + 适配）
├── assets/
│   ├── logo.png
│   └── logo.svg
├── components/
│   ├── ui/                       # shadcn-vue 组件
│   │   ├── button/
│   │   ├── card/
│   │   ├── tabs/
│   │   ├── table/
│   │   ├── dialog/
│   │   ├── input/
│   │   ├── progress/
│   │   ├── badge/
│   │   └── separator/
│   ├── ApiKeyDialog.vue          # F5 API Key 弹窗
│   ├── VideoUploader.vue         # F1 拖拽/点击上传
│   ├── VideoPreview.vue          # F1 视频预览播放器
│   ├── AnalysisControl.vue       # F2 分析控制面板
│   ├── LeftPanel.vue             # 左侧面板容器
│   ├── RightPanel.vue            # 右侧主区域容器
│   ├── ResultToolbar.vue         # F3 模式切换 + F4 导出按钮
│   ├── MarkdownView.vue          # F3 Markdown 渲染
│   ├── ScriptTable.vue           # F3 分镜脚本表格
│   └── VideoSegmentPlayer.vue    # F3 行内视频播放器
├── composables/
│   └── useVideoAnalysis.ts       # 应用状态管理
├── lib/
│   └── utils.ts                  # cn() 工具函数
├── prompts/
│   └── videoAnalysis.ts          # AI 提示词（从 main 迁移）
├── types/
│   └── video.ts                  # 类型定义（从 main 迁移 + 适配）
├── utils/
│   ├── exportExcel.ts            # Excel 导出（从 main 迁移）
│   ├── localCache.ts             # localStorage 工具（从 main 迁移）
│   └── videoCapture.ts           # 时间解析工具（从 main 迁移）
├── App.vue                       # 根组件（主布局）
├── main.ts                       # 应用入口
├── style.css                     # Tailwind 主题
└── vite-env.d.ts
api/
└── oss-sts.ts                    # Vercel Serverless（从 main 迁移）
```

---

## 实施顺序

```text
P1-1 安装依赖
 ↓
P1-2 添加 shadcn-vue 组件
 ↓
P1-3 迁移业务逻辑层（types → prompts → api → utils）
P1-4 本地缓存工具
 ↓
P2-1 App.vue 主布局 + LeftPanel + RightPanel
 ↓
P3-1 F5 API Key 配置
 ↓
P3-2 F1 视频上传 + 预览
 ↓
P3-3 F2 AI 视频分析（流式）
 ↓
P3-4 F3 分析结果展示（Markdown + 表格 + 行内播放器）
 ↓
P3-5 F4 导出 Excel
 ↓
P4-1 状态管理 composable 串联
P4-2 组件通信与集成测试
```
