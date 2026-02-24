# CLAUDE.md

本文件为 Claude Code 提供项目上下文和开发指引。

## 技术栈

- **Vue 3.5** - Composition API + `<script setup>`
- **Vite 7.3** - 构建工具
- **TypeScript 5.7** - 严格模式
- **Tailwind CSS 3.4** - CSS 变量主题
- **shadcn-vue** - New York 风格组件库
- **Vue Router 4.6** - 多页面路由

### 业务依赖

| 依赖 | 用途 |
|------|------|
| `@supabase/supabase-js` | 用户认证和数据存储 |
| `@vueuse/core` | Vue 组合式工具函数 |
| `ali-oss` | 阿里云 OSS 浏览器直传 |
| `markstream-vue` | Markdown 流式渲染 |
| `xlsx` | Excel 导出 |
| `lucide-vue-next` | 图标库 |

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # TypeScript 类型检查 + 生产构建
npm run preview  # 预览生产构建
```

## 项目架构

### 路径别名

- `@/` → `src/`（vite.config.ts + tsconfig.json）

### 目录结构

```
src/
├── api/
│   ├── analysis.ts              # 分析 API 统一入口
│   ├── providers/
│   │   └── aliyun.ts            # 阿里百炼 API
│   ├── temporaryFile.ts         # OSS 上传
│   └── videoAnalysis.ts         # 视频分析（SSE 流式）
├── components/
│   ├── layout/                  # 布局组件（v0.2.2 新增）
│   │   ├── AppLayout.vue
│   │   ├── AppMenu.vue
│   │   └── UserBar.vue
│   ├── ui/                      # shadcn-vue 组件
│   ├── ApiKeyDialog.vue         # API Key 配置
│   ├── VideoUploader.vue        # 视频上传
│   ├── VideoPreview.vue         # 视频预览
│   ├── AnalysisControl.vue      # 分析控制
│   ├── LeftPanel.vue            # 左侧配置面板
│   ├── RightPanel.vue           # 右侧结果面板
│   ├── ResultToolbar.vue        # 结果工具栏
│   ├── MarkdownView.vue         # Markdown 渲染
│   ├── ScriptTable.vue          # 分镜表格
│   └── VideoSegmentPlayer.vue   # 视频片段播放
├── composables/
│   └── useVideoAnalysis.ts      # 全局状态（ref 单例）
├── config/
│   └── models.ts                # 模型配置（v0.2.2 新增）
├── lib/
│   ├── utils.ts                 # cn() 类名合并
│   ├── supabase.ts              # Supabase 客户端
│   └── openai-client.ts         # OpenAI 兼容客户端
├── prompts/
│   └── videoAnalysis.ts         # AI 提示词
├── router/
│   └── index.ts                 # 路由配置（v0.2.2 新增）
├── types/
│   └── video.ts                 # VideoScriptItem 等类型
├── utils/
│   ├── exportExcel.ts           # Excel 导出
│   └── videoCapture.ts          # 时间解析
├── views/                       # 页面视图（v0.2.2 新增）
│   ├── HomePage.vue             # 首页
│   ├── AnalyzePage.vue          # 视频分析
│   ├── CreatePage.vue           # 脚本生成
│   ├── FavoritesPage.vue        # 收藏
│   ├── LoginPage.vue            # 登录
│   ├── ProfilePage.vue          # 个人中心
│   └── SettingsPage.vue         # 设置
├── App.vue
├── main.ts
├── env.d.ts
└── style.css
api/
└── oss-sts.ts                   # Vercel Serverless（STS 凭证）
```

### 路由架构

使用 Vue Router 实现多页面，支持嵌套路由：

| 路径 | 页面 | 需登录 |
|------|------|--------|
| `/` | HomePage | 否 |
| `/analyze` | AnalyzePage + LeftPanel | 否 |
| `/create` | CreatePage + LeftPanel | 否 |
| `/favorites` | FavoritesPage | 是 |
| `/settings` | SettingsPage | 否 |
| `/profile` | ProfilePage | 是 |
| `/login` | LoginPage | 否 |

### 状态管理

`useVideoAnalysis.ts` 模块级 ref + computed 单例：

- `videoFile` / `videoUrl` / `uploadProgress` - 上传状态
- `analysisStatus` / `markdownContent` / `scriptItems` / `tokenUsage` - 分析状态
- `viewMode` - 展示模式（markdown/table）
- 状态定义在模块顶层，函数仅返回引用

### AI 提供商架构

使用阿里百炼（DashScope）API：

- `src/api/providers/aliyun.ts` - 阿里百炼 API 封装
- `src/config/models.ts` - 模型配置（仅 `qwen3.5-plus`）

### 环境变量

**前端（VITE_ 前缀）**：

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - Supabase（必须）
- `VITE_ALIYUN_*` - 阿里云 OSS
- `VITE_DASHSCOPE_API_KEY` - 阿里百炼（可选，可在界面配置）

**后端（Vercel）**：

- `ALIYUN_*` - STS 临时凭证生成

## 开发规范

- Composition API + `<script setup lang="ts">`
- Tailwind CSS 工具类 + `cn()` 合并类名
- 部署目标：Vercel（`api/` → Serverless Functions）

## 已知限制

- **SSE 流解析**：已实现 buffer 机制，修改时需保留
- **全局状态单例**：新增状态需定义在模块顶层
- **VideoSegmentPlayer**：大量行数（50+）时考虑虚拟滚动

## v0.2.2 审查修复记录

### 新增功能

1. **多页面路由**：Vue Router 实现 7 个页面
2. **AI 分析**：阿里百炼 qwen3.5-plus 模型
3. **Supabase 集成**：用户认证系统
4. **思考模式**：支持 enable_thinking 参数
5. **布局组件**：AppLayout、AppMenu、UserBar

## v0.2.1 审查修复记录

1. 分析控制精简、Token 信息移至 ResultToolbar
2. 分镜表格 12 列→9 列（景别+运镜、时间合并）
3. 视频预览 hover 播放、等比缩放
4. viewMode 自动切换、`<br>` 转换行
5. 模型选择下拉框、表头居中

## v0.2.0 审查修复记录

1. 模型名称修正、SSE buffer 机制
2. computed 提升到模块顶层
3. DEBUG 日志清理、死代码删除
4. 时间解析歧义修复、懒加载优化
5. catch 类型安全、文件格式校验统一
