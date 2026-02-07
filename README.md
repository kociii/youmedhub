# youmedhub

AI 视频分镜脚本分析工具 — 上传视频，自动生成结构化分镜拍摄脚本。

## 功能

- **视频上传** — 拖拽或点击上传，支持 mp4/mov，≤100MB / ≤10 分钟，阿里云 OSS 直传
- **AI 分镜分析** — 阿里云百炼 Qwen VL 模型（flash/plus 可选），SSE 流式输出
- **双模式展示** — Markdown 原始内容（实时流式渲染）/ 分镜表格（9 列 + 色彩标签 + hover 视频预览）
- **Excel 导出** — 一键导出分镜脚本为 .xlsx
- **API Key 管理** — 浏览器本地存储，不经过服务端

## 技术栈

Vue 3.5 + Vite 7.3 + TypeScript 5.7 + Tailwind CSS 3.4 + shadcn-vue

关键依赖：`ali-oss`（OSS 直传）、`markstream-vue`（Markdown 流式渲染）、`xlsx`（Excel 导出）

## 快速开始

```bash
npm install
cp .env.example .env   # 填入阿里云 OSS 配置
npm run dev
```

环境变量（本地开发）：

```bash
VITE_ALIYUN_ACCESS_KEY_ID=your_access_key_id
VITE_ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
VITE_ALIYUN_OSS_REGION=oss-cn-hangzhou
VITE_ALIYUN_OSS_BUCKET=your-bucket-name
```

## 部署

Vercel 部署，`api/oss-sts.ts` 自动识别为 Serverless Function（STS 临时凭证）。

Vercel 环境变量：

```bash
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_ROLE_ARN=acs:ram::your-account-id:role/your-role-name
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=your-bucket-name
```

## 项目结构

```
src/
├── api/            # OSS 上传、百炼视频分析 API
├── components/     # 业务组件 + ui/ (shadcn-vue)
├── composables/    # 全局状态管理 (useVideoAnalysis)
├── prompts/        # AI 分镜分析提示词
├── types/          # TypeScript 类型定义
└── utils/          # Excel 导出、时间解析
api/
└── oss-sts.ts      # Vercel Serverless Function
docs/
└── prd/            # 产品文档 (v0.2.0, v0.2.1)
```

## 更新日志

详见 [CHANGELOG.md](./CHANGELOG.md)
