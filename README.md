# YouMedHub

AI 视频分镜脚本工具 — 拆解视频或从零创作，生成结构化分镜拍摄脚本。

## 功能

- **视频拆解** — 上传短视频，AI 自动生成分镜脚本（景别、运镜、台词、音效等）
- **脚本生成** — 从零创作或参考已有脚本风格，生成全新分镜脚本
- **双模式展示** — Markdown 流式渲染 / 分镜表格（含视频片段预览）
- **云端收藏** — 登录后保存脚本，随时查看和管理
- **Excel 导出** — 一键导出分镜脚本为 .xlsx

## 技术栈

Vue 3.5 + Vite 7.3 + TypeScript 5.7 + Tailwind CSS 3.4 + shadcn-vue

| 依赖 | 用途 |
|------|------|
| `@supabase/supabase-js` | 用户认证 + 数据存储 |
| `ali-oss` | 阿里云 OSS 视频直传 |
| `markstream-vue` | Markdown 流式渲染 |
| `xlsx` | Excel 导出 |

## 快速开始

```bash
npm install
cp .env.example .env   # 填入环境变量
npm run dev
```

环境变量：

```bash
# Supabase（必须）
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 阿里云 OSS（视频上传）
VITE_ALIYUN_ACCESS_KEY_ID=your_access_key_id
VITE_ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
VITE_ALIYUN_OSS_REGION=oss-cn-hangzhou
VITE_ALIYUN_OSS_BUCKET=your-bucket-name
```

## 部署

Vercel 部署，`api/oss-sts.ts` 作为 Serverless Function 提供 STS 临时凭证。

## 项目结构

```
src/
├── api/            # AI 分析、OSS 上传
├── components/     # 业务组件 + ui/ (shadcn-vue)
├── composables/    # 全局状态（useVideoAnalysis / useAuth / useFavorites）
├── config/         # 模型配置
├── lib/            # Supabase 客户端
├── prompts/        # AI 提示词（三种模式）
├── router/         # Vue Router 路由
├── types/          # TypeScript 类型
├── utils/          # Excel 导出、时间解析
└── views/          # 页面（首页/分析/生成/收藏/设置/个人中心）
api/
└── oss-sts.ts      # Vercel Serverless Function
docs/
├── roadmap.md      # 产品路线图
└── prd/            # 产品文档
```

## 路线图

详见 [docs/roadmap.md](./docs/roadmap.md)

- 分镜图生成（v0.3.0）
- 视频生成（v0.3.0）
- 移动端适配（v0.4.0）
