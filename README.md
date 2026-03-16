# YouMedHub

AI 视频分镜脚本工具 — 拆解视频或从零创作，生成结构化分镜拍摄脚本。

## 功能

- **视频拆解** — 上传短视频，AI 自动生成分镜脚本（景别、运镜、台词、音效等）
- **脚本生成** — 从零创作或参考已有脚本风格，生成全新分镜脚本
- **双模式展示** — Markdown 流式渲染 / 分镜表格（含按分镜时间 hover 预览，默认带声音）
- **云端收藏** — 登录后保存脚本，随时查看和管理
- **Excel 导出** — 一键导出分镜脚本为 .xlsx

## 技术栈

Vue 3.5 + Vite 7.3 + TypeScript 5.7 + Tailwind CSS 3.4 + shadcn-vue

| 依赖 | 用途 |
|------|------|
| `@supabase/supabase-js` | 用户认证 + 数据存储 |
| 阿里云百炼临时存储 | 多模态文件上传（`oss://` 临时 URL，仅供模型调用） |
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

# 阿里云百炼（可选，也可在页面设置中填写）
VITE_DASHSCOPE_API_KEY=sk-xxxx
VITE_ARK_API_KEY=your_ark_api_key
```

说明：

- 本地开发时，Vite 已内置 `/api/dashscope-policy` 代理，无需单独启动额外代理服务。
- 百炼返回的 `oss://` 临时 URL 有效期 48 小时，只能供模型调用，不能作为浏览器视频预览地址。
- 分镜表格中的视频预览基于本地 `blob:` 视频源实现，所以当前会话内可按分镜时间 hover 播放；刷新页面或跨设备不会保留本地预览能力。

## 部署

推荐部署到 Vercel。线上通过 `api/dashscope-policy.ts` 代理百炼上传凭证请求。

## 项目结构

```
src/
├── api/            # AI 分析、百炼临时文件上传
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
└── dashscope-policy.ts  # Vercel Serverless Function
docs/
├── roadmap.md      # 产品路线图
└── prd/            # 产品文档
```

## 路线图

详见 [docs/roadmap.md](./docs/roadmap.md)

- 分镜图生成（v0.3.0）
- 视频生成（v0.3.0）
- 移动端适配（v0.4.0）
