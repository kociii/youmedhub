# YouMedHub - AI 视频分析工具

一个基于 Vue 3 + TypeScript 的智能视频分析应用，使用阿里云通义千问视觉模型自动分析视频内容，生成详细的脚本拆解表格。

## 功能特性

- 📹 **视频分析**：上传视频或提供视频 URL，AI 自动分析视频内容
- 📊 **脚本拆解**：生成包含景别、运镜、画面内容、口播等详细信息的结构化表格
- 🎬 **视频片段预览**：鼠标悬停即可播放对应时间段的视频片段
- 🔐 **安全存储**：API Key 本地存储，保护隐私
- 🎯 **实时流式输出**：Markdown 流式显示，所见即所得
- 📈 **Token 统计**：实时显示输入/输出/总计 Token 使用量

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置 API Key

获取阿里云 DashScope API Key：<https://help.aliyun.com/zh/model-studio/get-api-key>

方式一：在应用界面配置（推荐）

- 启动应用后点击右上角"配置 API Key"按钮

方式二：环境变量配置

```bash
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

### 3. 启动开发服务器

```bash
pnpm dev
```

### 4. 构建生产版本

```bash
pnpm build
```

## 使用说明

1. 启动应用后，点击上传区域选择视频文件（支持 MP4、MOV、AVI 等格式，最大 100MB）
2. 点击"开始分析"按钮，等待 AI 分析完成
3. 查看分析结果表格，鼠标悬停视频片段可预览播放

## 技术栈

- Vue 3 - 渐进式 JavaScript 框架
- TypeScript - 类型安全
- Vite - 快速构建工具
- 通义千问 VL Max - 视觉语言模型

## 注意事项

- 视频文件最大支持 100MB
- 视频使用浏览器直传到阿里云 OSS（无需经过服务器，节省带宽）
- 视频内容需通过安全检查才能分析
- API 调用需要有效的阿里云 DashScope API Key
- 需要配置阿里云 OSS 环境变量（详见 `.env.example`）
