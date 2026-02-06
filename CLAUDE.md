# CLAUDE.md

本文件为 Claude Code 提供项目上下文和开发指引。

## 技术栈

- **Vue 3.5** - 使用 Composition API 和 `<script setup>` 语法
- **Vite 7.3** - 构建工具和开发服务器
- **TypeScript 5.7** - 启用严格模式
- **Tailwind CSS 3.4** - 使用 CSS 变量主题系统
- **shadcn-vue** - 基于 radix-vue 的组件库（New York 风格）

### 业务依赖

- `ali-oss` - 阿里云 OSS 浏览器直传
- `markstream-vue` - Markdown 流式渲染（AI 输出实时展示）
- `xlsx` - Excel 导出
- `lucide-vue-next` - 图标库

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # TypeScript 类型检查 + 生产构建
npm run preview  # 预览生产构建
```

## 项目架构

### 路径别名

- `@/` 映射到 `src/` 目录（在 vite.config.ts 和 tsconfig.json 中配置）
- shadcn-vue 组件别名：`@/components`、`@/lib/utils`、`@/components/ui`

### 目录结构

```
src/
├── api/
│   ├── temporaryFile.ts       # 阿里云 OSS 上传（STS 临时凭证 / 本地直传）
│   └── videoAnalysis.ts       # 百炼 API 调用（流式 SSE + Markdown 表格解析）
├── assets/                    # Logo 等静态资源
├── components/
│   ├── ui/                    # shadcn-vue 组件（button/card/tabs/table/dialog/input/progress/badge/separator）
│   ├── ApiKeyDialog.vue       # F5 API Key 配置弹窗
│   ├── VideoUploader.vue      # F1 拖拽/点击上传
│   ├── VideoPreview.vue       # F1 视频预览播放器
│   ├── AnalysisControl.vue    # F2 分析控制面板
│   ├── LeftPanel.vue          # 左侧面板容器
│   ├── RightPanel.vue         # 右侧主区域容器
│   ├── ResultToolbar.vue      # F3 模式切换 + F4 导出按钮
│   ├── MarkdownView.vue       # F3 Markdown 流式渲染（markstream-vue）
│   ├── ScriptTable.vue        # F3 分镜脚本表格
│   └── VideoSegmentPlayer.vue # F3 行内视频片段播放器
├── composables/
│   └── useVideoAnalysis.ts    # 全局状态管理（ref 单例模式，无需 Pinia）
├── lib/
│   └── utils.ts               # cn() 类名合并函数
├── prompts/
│   └── videoAnalysis.ts       # AI 提示词（分镜拍摄脚本分析）
├── types/
│   └── video.ts               # VideoScriptItem / AnalysisStatus / TokenUsage 类型
├── utils/
│   ├── exportExcel.ts         # Excel 导出
│   ├── localCache.ts          # localStorage 缓存工具
│   └── videoCapture.ts        # 时间解析（parseTimeToSeconds）
├── App.vue                    # 根组件（顶部栏 + 左右分栏布局）
├── main.ts                    # 应用入口
├── env.d.ts                   # 环境变量类型声明
└── style.css                  # Tailwind 指令 + CSS 变量主题
api/
└── oss-sts.ts                 # Vercel Serverless Function（STS 临时凭证）
```

### 状态管理

使用 `src/composables/useVideoAnalysis.ts` 管理全局状态，基于 Vue 3 模块级 `ref` 单例模式：

- `videoFile` / `videoUrl` / `uploadProgress` - 视频上传状态
- `analysisStatus` / `markdownContent` / `scriptItems` / `tokenUsage` - AI 分析状态
- `viewMode` - 展示模式切换（markdown / table）
- `apiKey` - API Key（localStorage 持久化）

### 数据类型

`VideoScriptItem` 包含 11 个字段，与 AI 提示词输出格式严格对应：
序号、景别、运镜、画面内容、拍摄指导（shootingGuide）、画面文案/花字、口播/台词、音效/BGM、开始时间、结束时间、时长

### 环境变量

- 前端变量使用 `VITE_` 前缀，通过 `import.meta.env` 读取
- 后端变量（Vercel Serverless）通过 `process.env` 读取
- 本地开发：`.env` 文件（已 gitignore）
- 生产环境：Vercel 项目设置中配置
- 模板文件：`.env.example`

### 主题系统

- 主题变量定义在 `src/style.css` 的 `:root` 和 `.dark` 中
- 使用 HSL 颜色值（如 `--primary: 0 0% 9%`）
- Tailwind 配置在 `tailwind.config.js` 中扩展了主题颜色

### shadcn-vue 集成

配置文件：`components.json`

- 风格：New York
- 基础颜色：neutral
- 使用 CSS 变量
- 组件通过 CLI 添加：`npx shadcn-vue@latest add <component>`

## 开发规范

- 使用 Composition API 和 `<script setup lang="ts">` 语法
- 组件使用 TypeScript
- 样式使用 Tailwind CSS 工具类
- 使用 `cn()` 函数合并条件类名
- 部署目标：Vercel（`api/` 目录自动识别为 Serverless Functions）
