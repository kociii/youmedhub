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
│   ├── layout/                  # 布局组件
│   │   ├── AppLayout.vue
│   │   ├── AppMenu.vue
│   │   └── UserBar.vue
│   ├── ui/                      # shadcn-vue 组件
│   ├── ApiKeyDialog.vue         # API Key 配置
│   ├── AuthDialog.vue           # 登录/注册弹窗
│   ├── FavoriteDialog.vue       # 收藏确认弹窗
│   ├── VideoUploader.vue        # 视频上传
│   ├── VideoPreview.vue         # 视频预览
│   ├── AnalysisControl.vue      # 分析控制
│   ├── LeftPanel.vue            # 左侧配置面板（含 Tabs）
│   ├── RightPanel.vue           # 右侧结果面板
│   ├── ResultToolbar.vue        # 结果工具栏（收藏/导出/基于此生成）
│   ├── MarkdownView.vue         # Markdown 渲染
│   ├── ScriptTable.vue          # 分镜表格
│   ├── VideoSegmentPlayer.vue   # 视频片段播放
│   ├── ThinkingPanel.vue        # 思考过程面板
│   ├── CreateModePanel.vue      # 从零创作面板
│   ├── ReferenceModePanel.vue   # 参考生成面板
│   └── ImageUploader.vue        # 图片上传组件
├── composables/
│   ├── useVideoAnalysis.ts      # 视频分析全局状态
│   ├── useAuth.ts               # 认证状态管理
│   ├── useFavorites.ts          # 收藏功能管理
│   └── useProfile.ts            # 个人资料管理
├── config/
│   └── models.ts                # 模型配置
├── lib/
│   ├── utils.ts                 # cn() 类名合并
│   ├── supabase.ts              # Supabase 客户端
│   └── openai-client.ts         # OpenAI 兼容客户端
├── prompts/
│   └── videoAnalysis.ts         # AI 提示词（三种模式）
├── router/
│   └── index.ts                 # 路由配置
├── types/
│   └── video.ts                 # VideoScriptItem 等类型
├── utils/
│   ├── exportExcel.ts           # Excel 导出
│   └── videoCapture.ts          # 时间解析
├── views/                       # 页面视图
│   ├── HomePage.vue             # 首页
│   ├── AnalyzePage.vue          # 视频分析
│   ├── CreatePage.vue           # 脚本生成
│   ├── FavoritesPage.vue        # 收藏列表
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

采用模块级 ref + computed 单例模式，状态定义在模块顶层：

**useVideoAnalysis** - 视频分析状态：
- `videoFile` / `videoUrl` / `localVideoUrl` / `uploadProgress` - 视频上传
- `imageFile` / `imageUrl` / `localImageUrl` - 图片上传（参考生成）
- `analysisStatus` / `markdownContent` / `scriptItems` / `tokenUsage` - 分析结果
- `analysisMode` - 分析模式（analyze/create/reference）
- `viewMode` - 展示模式（markdown/table）
- `selectedModel` / `enableThinking` / `thinkingContent` - 模型配置
- `pendingReference` - 待引用的参考脚本（从结果跳转时暂存）

**useAuth** - 认证状态：
- `user` / `isAuthenticated` / `userEmail` / `userName` / `userAvatar`
- `signIn` / `signUp` / `signInWithGitHub` / `signOut`

**useFavorites** - 收藏状态：
- `favorites` / `loading`
- `loadFavorites` / `addFavorite` / `removeFavorite`

**useProfile** - 个人资料：
- `profile` / `nickname` / `avatarUrl`
- `loadProfile` / `updateNickname`

### AI 提供商架构

使用阿里百炼（DashScope）API：

- `src/api/providers/aliyun.ts` - 阿里百炼 API 封装（SSE 流式）
- `src/config/models.ts` - 模型配置（qwen3.5-flash / qwen3.5-plus）

**思考模式参数配置**（参考[阿里云官方文档](https://help.aliyun.com/zh/model-studio/developer-reference/thinking)）：

- `enable_thinking` 和 `thinking_budget` 必须放在请求体**顶层**，不能放在 `extra_body` 中
- 北京地域 base_url: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- 弗吉尼亚地域: `https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions`
- 新加坡地域: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions`

```typescript
// 正确示例
const body = {
  model: "qwen3.5-plus",
  messages: [...],
  stream: true,
  stream_options: { include_usage: true },
  enable_thinking: true,        // 放在顶层
  thinking_budget: 1024,        // 放在顶层
}
```

### 提示词系统

三种分析模式的差异化提示词：

- `VIDEO_ANALYSIS_PROMPT` - 视频拆解模式（analyze）
- `VIDEO_CREATE_PROMPT` - 从零创作模式（create）
- `VIDEO_REFERENCE_PROMPT` - 参考生成模式（reference）
- `getPromptByMode(mode)` - 根据模式获取对应提示词

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

### AI 模型约束

- **仅使用阿里百炼 qwen 系列模型**
- 文本生成：`qwen3.5-flash`（快速）或 `qwen3.5-plus`（高质量）
- 多模态（图片理解）：`qwen-vl-max`
- **禁止使用** qwen2.5、qwen3、deepseek 等其他模型系列
- 模型选择 UI 只展示 qwen3.5-flash 和 qwen3.5-plus

## 已知限制

- **SSE 流解析**：已实现 buffer 机制，修改时需保留
- **全局状态单例**：新增状态需定义在模块顶层
- **VideoSegmentPlayer**：大量行数（50+）时考虑虚拟滚动

## v0.2.2 审查修复记录

### 新增功能

1. **多页面路由**：Vue Router 实现 7 个页面，支持嵌套路由和路由守卫
2. **AI 分析**：阿里百炼 qwen3.5-plus 模型，SSE 流式输出
3. **Supabase 集成**：用户认证系统，支持邮箱和 GitHub OAuth
4. **思考模式**：支持 enable_thinking 参数，ThinkingPanel 展示
5. **布局组件**：AppLayout、AppMenu、UserBar
6. **收藏功能**：收藏 CRUD、收藏列表、搜索删除
7. **脚本生成模式**：从零创作面板、参考生成面板、Tabs 切换
8. **结果跳转生成**：「基于此生成」按钮，自动填充参考脚本
9. **提示词系统**：三种模式差异化提示词（analyze/create/reference）

### 待完成功能

1. **生成 AI 调用**：从零创作/参考生成的实际 AI 调用逻辑
2. **分镜图生成**：图片生成 API、任务轮询、批量生成
3. **响应式适配**：移动端布局、底部导航

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
