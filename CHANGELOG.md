# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-06

### Added

- **技术栈重构**：迁移至 Vue 3.5 + Vite 7.3 + TypeScript 5.7 + Tailwind CSS 3.4 + shadcn-vue
- **F1 视频上传**：拖拽/点击上传，前端校验（mp4/mov、≤100MB、≤10 分钟），阿里云 OSS 浏览器直传，实时进度条
- **F2 AI 视频分析**：接入阿里云百炼 Qwen VL 模型，SSE 流式接收，实时 Markdown 输出，Token 用量统计
- **F3 分析结果展示**：Markdown 流式渲染模式（markstream-vue）+ 11 列分镜脚本表格模式，行内视频片段播放器
- **F4 导出 Excel**：一键导出分镜脚本为 .xlsx 文件
- **F5 API Key 配置**：Dialog 弹窗配置，localStorage 本地存储，不经过环境变量
- **Vercel Serverless**：`api/oss-sts.ts` 提供 STS 临时凭证，生产环境安全上传
- **分镜拍摄脚本提示词**：专业短视频拆解提示词，含拍摄指导核心字段（11 列输出）

### Changed

- 项目从 Bootstrap + 原生 JS 重构为 Vue 3 Composition API + shadcn-vue 组件体系
- 全局状态管理采用模块级 `ref` + `computed` 单例模式（`useVideoAnalysis` composable）
- AI 提示词升级为分镜导演视角，新增「拍摄指导」核心字段

### Fixed

- 修复 AI 模型名称错误（`qwen-vl-flash` → `qwen3-vl-flash`）
- 修复 SSE 流解析跨 chunk 截断导致数据丢失的问题
- 修复 `parseTimeToSeconds` 三段式时间格式解析歧义
- 修复 MarkdownView 未正确使用流式渲染组件的问题
- 修复文件格式校验不一致（API 层与 UI 层统一为 mp4/mov）

### Removed

- 移除未使用的 `localCache.ts`（API Key 存取已内联到 composable）
- 移除 `videoCapture.ts` 中未使用的截图/录制函数
- 移除生产环境 DEBUG 日志
- 移除环境变量中的 `VITE_DASHSCOPE_API_KEY`（API Key 仅通过页面 UI 配置）

### Security

- `.gitignore` 添加 `.env` 规则，防止密钥意外提交
- API Key 仅存储在浏览器 localStorage，不经过环境变量或代码明文
- 生产环境 OSS 上传使用 STS 临时凭证，避免暴露主账号密钥

## [0.1.0] - 2025-01-01

### Added

- 初始版本：Bootstrap + 原生 JavaScript 实现
- 基础视频上传与 AI 分析功能
- Markdown 表格解析与 Excel 导出
