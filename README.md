# YouMedHub - AI 视频分镜脚本分析工具

上传视频，AI 自动分析生成分镜拍摄脚本，支持按分镜预览视频片段和导出表格。

## 功能

- **视频上传** - 拖拽/点击上传，支持 mp4、mov，≤100MB / ≤10 分钟
- **AI 视频分析** - 支持 qwen3-vl-flash / qwen3-vl-plus 模型选择，流式输出分析结果
- **分析结果展示** - 两种模式切换：
  - Markdown 原始内容（流式渲染）
  - 分镜脚本表格（9 列结构化数据 + hover 视频预览 + 色彩标签）
- **导出 Excel** - 将分镜脚本导出为 .xlsx 文件
- **API Key 配置** - 浏览器本地存储，无需每次输入

## 技术栈

- Vue 3 + Vite 7 + TypeScript
- Tailwind CSS + shadcn-vue
- markstream-vue（Markdown 流式渲染）
- ali-oss（阿里云 OSS 浏览器直传）
- 部署：Vercel

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制环境变量模板并填入真实值：

```bash
cp .env.example .env
```

本地开发需要配置：

```bash
# 阿里云 OSS 直传（本地开发）
VITE_ALIYUN_ACCESS_KEY_ID=your_access_key_id
VITE_ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
VITE_ALIYUN_OSS_REGION=oss-cn-hangzhou
VITE_ALIYUN_OSS_BUCKET=your-bucket-name
```

### 启动开发服务器

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

## Vercel 部署

1. 将项目推送到 GitHub
2. 在 Vercel 中导入项目
3. 在 Vercel 项目设置中配置环境变量：

```bash
# 服务端 STS 凭证（必须）
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_ROLE_ARN=acs:ram::your-account-id:role/your-role-name
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
```

`api/oss-sts.ts` 会自动被识别为 Vercel Serverless Function，用于生成 STS 临时凭证。

## 项目结构

```
src/
├── api/                       # API 调用（OSS 上传、百炼视频分析）
├── components/                # 业务组件
│   └── ui/                    # shadcn-vue 基础组件
├── composables/               # 状态管理（useVideoAnalysis）
├── prompts/                   # AI 提示词
├── types/                     # TypeScript 类型定义
└── utils/                     # 工具函数（Excel 导出、时间解析）
api/
└── oss-sts.ts                 # Vercel Serverless Function
docs/
├── prd/v0.2.0/                # v0.2.0 产品文档（PRD、设计、提示词、开发计划）
└── prd/v0.2.1/                # v0.2.1 UI 优化文档（PRD、设计、开发计划）
```
