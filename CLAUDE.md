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
| `markstream-vue` | Markdown 流式渲染 |
| `xlsx` | Excel 导出 |
| `lucide-vue-next` | 图标库 |

> **v0.2.3 变更**：移除了 `ali-oss` 依赖，使用阿里云百炼临时存储替代自建 OSS。

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # TypeScript 类型检查 + 生产构建
npm run preview  # 预览生产构建
```

## PRD 版本文档

需求与版本文档按版本目录组织在 `docs/prd/`，索引见 `docs/prd/README.md`（倒序，最新在上）。文档边界：prd.md 只写需求与验收（业务语言），技术方案在 dev.md，数据表在 database.md + sql/，界面设计在 design.md。

| 版本 | 主题 | 状态 |
|------|------|------|
| [v0.3.0](./docs/prd/v0.3.0/prd.md) | 媒体资料库与多语言基础版 | 规划中，PRD 待评审（R4 已上线、R5 部分上线） |
| [v0.2.5](./docs/prd/v0.2.5/prd.md) | 能力增强与国际化基础版 | ✅ 已完成（事后归档） |
| [v0.2.4](./docs/prd/v0.2.4/prd.md) | 免费试用与平台 Key 托管 | 规划中，PRD 待评审 |

## 项目架构

### 路径别名

- `@/` → `src/`（vite.config.ts + tsconfig.json）

### 目录结构

```
src/
├── api/
│   ├── analysis.ts              # 分析 API 统一入口
│   ├── dashscope-upload.ts      # [v0.2.3新增] 百炼临时存储上传
│   ├── providers/
│   │   └── aliyun.ts            # 阿里百炼 API
│   ├── temporaryFile.ts         # [v0.2.3修改] 改为调用百炼上传
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
│   ├── useProfile.ts            # 个人资料管理
│   ├── useLocale.ts             # 多语言状态（模块级单例，含 localeTag）
│   └── useModelSelect.ts        # 模型选择 + 切换重传提示（三面板共用）
├── locales/
│   ├── zh.ts                    # 中文语言包（字典键的基准类型）
│   └── en.ts                    # 英文语言包（typeof zh 强制键一致）
├── config/
│   ├── models.ts                # 模型配置（qwen3.8/qwen3.7 系列，见「AI 模型约束」）
│   └── site.ts                  # 站点地址 SITE_URL（静态文件需手动同步）
├── lib/
│   ├── utils.ts                 # cn() 类名合并
│   ├── supabase.ts              # Supabase 客户端
│   ├── openai-client.ts         # OpenAI 兼容客户端
│   └── errors.ts                # extractErrorMessage 错误消息提取
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
```

> **v0.2.3 变更**：移除了 `api/oss-sts.ts` Vercel Serverless Function，不再需要 STS 临时凭证。

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

**使用统计**（`src/api/usageLog.ts`，无状态模块）：
- `logUsage(feature, modelId)` - AI 调用成功后上报 `usage_logs` 表（谁/功能/模型/时间）
- feature 取值：`analyze`（视频分析）/ `create`（从零创作）/ `reference`（参考生成）
- 表结构与 RLS 见 `supabase/migrations/20260918_usage_logs.sql`（需在 Supabase SQL Editor 手动执行）
- 统计失败静默降级，不影响主流程；数据仅通过 Supabase Dashboard 查看

### AI 提供商架构

使用阿里百炼（DashScope）API：

- `src/api/providers/aliyun.ts` - 阿里百炼 API 封装（SSE 流式）
- `src/config/models.ts` - 模型配置（qwen3.8/qwen3.7 系列，按页面区分可选列表）

**思考模式参数配置**（参考[阿里云官方文档](https://help.aliyun.com/zh/model-studio/developer-reference/thinking)）：

- `enable_thinking` 和 `thinking_budget` 必须放在请求体**顶层**，不能放在 `extra_body` 中
- 北京地域 base_url: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- 弗吉尼亚地域: `https://dashscope-us.aliyuncs.com/compatible-mode/v1/chat/completions`
- 新加坡地域: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions`

```typescript
// 正确示例
const body = {
  model: "qwen3.8-max",
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
- `getPromptByMode(mode, locale)` - 根据模式和输出语言获取提示词
- `buildPromptByMode(mode, context, locale)` - 携带用户输入构建提示词
- 英文模式（locale='en'）会在提示词末尾追加 `ENGLISH_OUTPUT_DIRECTIVE`，要求固定英文表头（No./Shot/Camera/...）

### 多语言（i18n）

自建轻量方案（不依赖 vue-i18n），与项目模块级单例风格一致：

- `src/composables/useLocale.ts` - `locale` ref（'zh' | 'en'）+ `t(key, params)` + `setLocale`，localStorage 键 `app_locale`
- `src/locales/zh.ts` - 中文字典（类型基准）；`en.ts` - 英文字典（`typeof zh` 约束键完全一致，编译期校验）
- 字典键按分组命名：`common.*` / `menu.*` / `analyze.*` / `create.*` / `panel.*` / `field.*` / `api.*` 等
- 左侧菜单栏语言切换：`AppMenu` 底部的 `LanguageSwitcher` 组件（v0.2.5 起从右上角移入）
- **AI 输出语言**：`analyzeVideo`/`generateScript` 的 `locale` 参数（`OutputLocale` 类型）控制结果语言；`parseMarkdownTable` 同时兼容中英文表头定位
- 新增文案时：先加 `zh.ts` 键，再加 `en.ts` 同名键（漏键会编译报错）
- CreateModePanel 的 `videoTypes` 是 computed，模板由字段 label 生成，语言切换自动跟随
- **初始语言检测**：localStorage 显式选择 > 中国时区（Asia/Shanghai 等）> 浏览器语言 zh* > 默认英文

### Google AdSense

- `src/lib/adsense.ts` - 发布商 ID 读取（`VITE_ADSENSE_CLIENT`）+ 脚本懒加载单例；未配置 `ca-pub-` 前缀 ID 时完全不加载、不渲染
- `src/components/AdSlot.vue` - 广告位组件，挂载时渲染 `<ins>` 并 push（SPA 路由切换自动刷新）；加载失败静默隐藏
- 广告位：首页底部（`ADSENSE_SLOT_HOME`）、分析/生成结果区底部（`ADSENSE_SLOT_RESULT`），避开操作区
- `public/ads.txt` - 授权文件
- `/privacy` 隐私政策页（AdSense 审核必备，双语）
- **发布商 ID 存在三处**，更换账号需同步修改：`index.html`（脚本 URL + meta 标记）、`public/ads.txt`、`src/lib/adsense.ts`（回退值）
- 新增环境变量后需在 Vercel 项目设置中同步配置

### SEO

- **静态 meta**（index.html）：title/description/keywords、Open Graph、Twitter Card、canonical、JSON-LD WebApplication 结构化数据
- **路由动态 meta**（router/index.ts）：每路由 `meta.description`（i18n 键），beforeEach 写入 description/og:title/og:url/canonical；`SITE_URL` 常量与 sitemap/robots 保持一致
- **爬虫文件**（public/）：robots.txt（屏蔽 /profile、/favorites）、sitemap.xml（4 个公开路由）、og-image.png（1200×630 分享图）
- 首页 h1 含 sr-only 关键词（`home.heroSeoTitle`）
- **正式域名**：`www.youmedhub.com`（canonical/og:url/SITE_URL/sitemap/robots 已统一）；如再次更换域名需同步修改 `index.html`、`router/index.ts`、`robots.txt`、`sitemap.xml` 四处
- SPA 无 SSR，社交爬虫只看到 index.html 的静态 meta；如需进一步提升，后续可考虑预渲染或 Nuxt 迁移

### 环境变量

**前端（VITE_ 前缀）**：

- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` - Supabase（必须）
- `VITE_DASHSCOPE_API_KEY` - 阿里百炼（可选，可在界面配置）
- `VITE_ADSENSE_CLIENT` / `VITE_ADSENSE_SLOT_HOME` / `VITE_ADSENSE_SLOT_RESULT` - Google AdSense（可选，未配置时不渲染广告）

> **v0.2.3 变更**：移除了所有 OSS 相关环境变量（`VITE_ALIYUN_OSS_*`、`ALIYUN_*`），使用百炼临时存储。

## 开发规范

- Composition API + `<script setup lang="ts">`
- Tailwind CSS 工具类 + `cn()` 合并类名
- 部署目标：Vercel（`api/` → Serverless Functions）

### AI 模型约束

- **仅使用阿里百炼 qwen 系列模型**，模型列表按页面区分（见 `src/config/models.ts`）：
  - **视频拆解页（/analyze）**：`qwen3.8-omni-flash`（默认，全模态，**原生理解视频画面与音频**，免 ASR 前置转写）、`qwen3.8-flash`
  - **脚本生成页（/create）**：`qwen3.8-max`（默认）、`qwen3.8-flash`
  - 面板挂载时若全局选中模型不在本页列表，自动校正为本页默认
- 多模态（图片理解）：`qwen-vl-max`
- **语音转写专用**：`qwen3-asr-flash`（见 `src/api/asr.ts`，OpenAI 兼容接口）——非 omni 模型的视频输入为抽帧视觉、不含音频轨，台词列依赖 ASR 前置转写注入提示词（`supportsNativeAudio()` 判断是否跳过）。实现：浏览器 WebAudio 提取音轨（decodeAudioData + OfflineAudioContext 重采样 16k mono）→ 30s 分块 WAV → 分批并发转写（块偏移即时间戳）
- **禁止使用**：`qwen3.7-max`（纯文本，不支持视频/图片输入）、qwen2.5、qwen3、qwen3.5、deepseek 等其他模型系列

## 已知限制

- **SSE 流解析**：已实现 buffer 机制，修改时需保留
- **全局状态单例**：新增状态需定义在模块顶层
- **VideoSegmentPlayer**：大量行数（50+）时考虑虚拟滚动

## v0.2.5 能力增强与国际化基础版（已上线）

> PRD 见 `docs/prd/v0.2.5/prd.md`（**事后归档**——功能已随 2026-09-17 ~ 09-18 的提交上线，文档用于补齐版本记录）。

七项已上线能力：**ASR 前置转写**（非 omni 模型分析视频前先转写音轨，台词列不再靠猜）、**模型升级与按页面区分**（qwen3.8 系列，拆解页/生成页各自的可选列表与默认值）、**中英双语界面**、**结果语言跟随界面语言**、**Google AdSense 广告**、**SEO 优化**、**AI 使用统计**。

**已知遗留**（详见 PRD 文末）：
- 结果语言与界面语言未解耦，中文界面无法产出英文结果 → 交由 v0.3.0 R5 解决
- 转写时间戳粒度为 30 秒（模型不输出原生时间戳，以分块偏移代替）
- 语言偏好仅存本地，不跨设备同步

## v0.2.4 免费试用与平台 Key 托管（规划中，PRD 待评审）

> PRD 见 `docs/prd/v0.2.4/prd.md`。评审①挂起——**下次开发会话启动时，先让使用人逐条确认 PRD 文末「待确认事项」表（Q1–Q11），全部拍板后才能继续生成 design.md、dev.md、database.md、sql/、plan.md、test.md、ops.md**。

三个需求：**免费试用额度**（登录用户 5 次免费生成，按账号计数、失败返还，用完引导配置自己的百炼 Key，BYOK 调用不消耗额度）、**邮箱验证注册**（注册后点击验证邮件才能登录，GitHub OAuth 不受影响）、**平台 Key 托管**（免费试用由服务端代理调用百炼，Key 只存服务端环境变量，绝不进入浏览器请求）。

**评审①挂起**：11 条待确认的业务假设已集中在 PRD 文末「待确认事项」表（Q1–Q11），以 PRD 为单一事实源。

**技术风险（实现前需实测）**：
- Vercel Function 时长上限 vs 视频拆解长任务——SSE 流式代理能否撑住全链路耗时，需实测后决定 maxDuration 配置或备选方案
- SSE buffer 机制在代理透传中必须保留（见「已知限制」）

## v0.2.3 存储方案重构

### 架构变更

**存储方案迁移**：从自建阿里云 OSS 迁移至阿里云百炼临时存储

| 变更项 | 变更前 | 变更后 |
|--------|--------|--------|
| 上传方式 | ali-oss SDK 直传 | 标准表单 POST |
| 凭证获取 | Vercel STS Serverless | 百炼 API 直接获取 |
| URL 格式 | `https://...` 签名 URL | `oss://...` 临时 URL |
| 有效期 | 24 小时（可配置） | 48 小时（固定） |
| 环境变量 | 5+ 个 OSS 相关 | 仅需 API Key |

### 文件变更

- **新增**：`src/api/dashscope-upload.ts` - 百炼临时存储上传封装
- **修改**：`src/api/temporaryFile.ts` - 改为调用新上传模块
- **修改**：`src/lib/openai-client.ts` - 添加 `X-DashScope-OssResourceResolve` Header
- **修改**：`src/composables/useVideoAnalysis.ts` - 分离本地文件和 OSS URL
- **删除**：`api/oss-sts.ts` - 移除 Vercel Serverless Function
- **删除**：`ali-oss` 依赖

### 交互变更

**v0.2.3 新交互**：
1. 选择文件 → 仅生成本地预览 URL（`blob:`）
2. 本地预览播放使用本地文件
3. 点击提交 → 上传文件 → 获取 `oss://` URL
4. AI 调用使用 `oss://` URL（需添加 Header）

### 待完成功能

1. **视频分析页适配**：修改提交逻辑，先上传再调用 AI
2. **图片上传适配**：参考生成模式的图片上传逻辑
3. **模型切换提示**：切换模型后需重新上传（文件与模型绑定）

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
