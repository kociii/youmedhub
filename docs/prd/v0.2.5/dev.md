# v0.2.5 技术开发文档

> 增长与国际化能力增强 - 基于当前 Vue 3 三栏工作台的实现方案

---

## 1. 当前架构审查

### 1.1 当前页面壳层

当前应用通过 `src/App.vue` 将 `AppLayout` 作为统一壳层，并使用命名视图组织配置区与内容区：

- `RouterView name="config"`：仅 `analyze` / `create` 路由挂载配置区。
- 默认 `RouterView`：承载首页、右侧结果区、收藏、设置、个人中心等内容。

### 1.2 当前关键布局组件

| 文件 | 当前职责 | 对 v0.2.5 的影响 |
|------|----------|------------------|
| `src/components/layout/AppLayout.vue` | 三栏壳层：左菜单 + 条件配置栏 + 主内容区 | v0.2.5 所有新页面应兼容这套壳层 |
| `src/components/layout/AppMenu.vue` | 侧边菜单入口 | 历史记录入口应从这里接入 |
| `src/components/LeftPanel.vue` | 分析/生成流程左侧配置容器 | API Key 引导和历史记录回填要兼容这里 |
| `src/components/RightPanel.vue` | 通用结果工作台 | 历史记录回看和公告提示不应破坏结果区结构 |
| `src/components/CreateModePanel.vue` | 生成页单面板信息流 | 设计必须基于此，不再假设旧版 Tabs |
| `src/views/SettingsPage.vue` | 轻量 API Key 页面 | v0.2.5 的主要重构入口 |

### 1.3 当前状态管理现状

`src/composables/useVideoAnalysis.ts` 已经承担：
- 分析/生成主流程状态
- 视频与图片文件的本地预览和临时上传
- 当前模型、思考模式、结果 Markdown、结构化分镜
- 多候选脚本、生成输入快照、配置栏展开状态
- 本地 API Key 存储

**结论**：
- 历史记录写入应复用现有 `useVideoAnalysis` 里的结果与输入快照，而不是重复组装来源数据。
- API Key 仍留在本地浏览器，不进入 Supabase。
- 设置页新增语言配置应考虑拆出独立 `useSettings`，避免继续堆到 `useVideoAnalysis`。

---

## 2. v0.2.5 架构目标

### 2.1 目标架构

```
┌──────────────────────────────────────────────────────────────────┐
│                          AppLayout 三栏壳层                      │
├──────────────┬──────────────────────────────┬────────────────────┤
│ AppMenu      │ LeftPanel（analyze/create）  │ 主内容区            │
│ + History    │                              │ Home / History /   │
│ 入口         │                              │ Favorites /        │
│              │                              │ Settings / Profile │
├──────────────┴──────────────────────────────┴────────────────────┤
│ composables: useVideoAnalysis / useSettings / useHistory        │
│              useAnnouncements / useFeedback                     │
├──────────────────────────────────────────────────────────────────┤
│ Supabase: profiles(扩展语言) / generation_history /             │
│          release_announcements / user_announcement_reads /      │
│          feature_feedback                                       │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 核心原则

- 保持当前三栏桌面壳层，不额外引入新的全局导航系统。
- 历史记录、公告、反馈属于“新增能力”，不直接改写现有分析/生成主流程。
- 所有新增页面和组件继续采用 Composition API + `<script setup lang="ts">`。
- 文档和实现都要明确区分“当前已实现结构”与“本版本增量变更”。

---

## 3. 模块拆分建议

### 3.1 新增/重构页面

- `src/views/HistoryPage.vue`
  - 负责历史记录页编排。
  - 参考当前收藏页的搜索/列表逻辑，但增加详情区域和筛选器。

- `src/views/SettingsPage.vue`
  - 从单列 API Key 表单升级为配置中心。
  - 适合拆出多个子组件，避免单文件继续膨胀。

- `src/views/HomePage.vue`
  - 保留现有 Hero 和功能卡片，新增公告横幅和 SEO 内容区。

- `src/views/EnHomePage.vue` 或首页语言化方案
  - 负责英文公开内容和英文 SEO 元信息。

### 3.2 新增 composables

- `src/composables/useSettings.ts`
  - 负责 `uiLocale`、`aiLocale`、本地持久化、登录同步。
  - 不接管 API Key 明文，仅协调设置页显示状态。

- `src/composables/useHistory.ts`
  - 负责历史记录创建、更新、查询、分页、筛选和回填。
  - 与 `useVideoAnalysis` 配合，从现有状态抽取可持久化字段。

- `src/composables/useAnnouncements.ts`
  - 负责公告读取、未读判断、已读状态写入、横幅/弹窗展示。

- `src/composables/useFeedback.ts`
  - 负责反馈提交、列表查询、状态展示。

### 3.3 新增组件建议

- `src/components/history/HistoryFilters.vue`
- `src/components/history/HistoryList.vue`
- `src/components/history/HistoryDetail.vue`
- `src/components/settings/LocaleSettingsCard.vue`
- `src/components/settings/ApiKeyGuideCard.vue`
- `src/components/settings/FeedbackPanel.vue`
- `src/components/announcement/AnnouncementBanner.vue`
- `src/components/announcement/AnnouncementDialog.vue`

这些组件拆分符合当前项目的 Vue 3 组织方式：
- 路由页面只负责编排
- 复杂逻辑放 composable
- 独立 UI 区块拆组件

---

## 4. 数据模型

### 4.1 扩展 `profiles`

```sql
alter table profiles
  add column if not exists ui_locale text default 'zh-CN',
  add column if not exists ai_locale text default 'zh-CN';
```

**说明**：
- 仅同步语言偏好。
- 不保存 API Key。

### 4.2 公告表 `release_announcements`

```sql
create table if not exists release_announcements (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  locale text not null default 'zh-CN',
  title text not null,
  summary text not null,
  content_md text not null,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 4.3 公告已读表 `user_announcement_reads`

```sql
create table if not exists user_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  announcement_id uuid not null references release_announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (user_id, announcement_id)
);
```

### 4.4 历史记录表 `generation_history`

```sql
create table if not exists generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  mode text not null,
  status text not null default 'pending',
  title text not null,
  input_summary text not null default '',
  prompt_text text not null default '',
  ui_locale text not null default 'zh-CN',
  ai_locale text not null default 'zh-CN',
  model_provider text not null default 'aliyun',
  model_id text not null default '',
  raw_markdown text not null default '',
  script_data jsonb not null default '[]'::jsonb,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  error_message text not null default '',
  source_file_name text not null default '',
  source_file_type text not null default '',
  source_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**字段说明**：
- `mode`：`analyze` / `create` / `reference`
- `status`：`pending` / `success` / `failed`
- `source_meta`：仅作为辅助调试或回填信息，不作为核心展示依赖

### 4.5 反馈表 `feature_feedback`

```sql
create table if not exists feature_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  feedback_type text not null,
  title text not null,
  content text not null,
  expected_result text not null default '',
  contact text not null default '',
  locale text not null default 'zh-CN',
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 5. 与当前代码的集成点

### 5.1 菜单与路由

需要修改：
- `src/components/layout/AppMenu.vue`：新增历史记录入口。
- `src/router/index.ts`：新增 `/history` 路由，必要时新增英文公开入口。

### 5.2 首页增强

需要修改：
- `src/views/HomePage.vue`
  - 保留现有 Hero、两张功能卡片、“即将推出”模块。
  - 在顶部插入 `AnnouncementBanner`。
  - 在底部追加静态 SEO 内容区。

### 5.3 设置页重构

需要修改：
- `src/views/SettingsPage.vue`
  - 从 `max-w-md` 的单列 API Key 页面扩展为多卡片设置中心。
- 可能新增：
  - `src/components/settings/LocaleSettingsCard.vue`
  - `src/components/settings/ApiKeyGuideCard.vue`
  - `src/components/settings/FeedbackPanel.vue`

### 5.4 分析/生成流程接入历史记录

建议接入点：
- `src/components/AnalysisControl.vue`
  - 在分析开始时创建历史记录 `pending`
  - 在成功/失败时更新状态与结果

- `src/components/LeftPanel.vue`
  - 在脚本生成流程中统一创建/更新历史记录
  - 可利用已有 `generationInputSnapshot` 和结果状态

### 5.5 API Key 引导增强

需要修改：
- `src/views/SettingsPage.vue`：增加 3 步引导和校验反馈
- `src/components/AnalysisControl.vue`：缺少 Key 时增加跳设置页 CTA
- `src/components/CreateModePanel.vue` 或 `src/components/LeftPanel.vue`：缺少 Key 时增加跳设置页 CTA

---

## 6. 状态流设计

### 6.1 公告读取流程

```text
应用启动 / 首页进入
  -> useAnnouncements.loadLatest(locale)
  -> 查询已发布公告
  -> 判断用户已读状态或 localStorage 已读标记
  -> 未读则显示 AnnouncementDialog
  -> 用户关闭后写入已读状态
```

### 6.2 历史记录写入流程

```text
点击分析/生成
  -> createHistory(status='pending')
  -> 调用阿里百炼分析/生成
    -> 成功：updateHistory(status='success', raw_markdown, script_data, tokens)
    -> 失败：updateHistory(status='failed', error_message)
```

### 6.3 语言配置流程

```text
设置页切换 UI locale
  -> 更新 i18n 当前语言
  -> 写入 localStorage
  -> 已登录时同步 profiles.ui_locale

设置页切换 AI locale
  -> 写入 localStorage
  -> 已登录时同步 profiles.ai_locale
  -> 后续分析/生成请求附加输出语言约束
```

### 6.4 API Key 引导流程

```text
分析页/生成页检测到缺少 API Key
  -> 展示提示 + 去设置页按钮
  -> 设置页引导用户前往百炼控制台申请 Key
  -> 粘贴保存后做基础校验
  -> 返回原工作流继续使用
```

---

## 7. 测试策略

### 7.1 功能测试

- 公告：横幅展示、弹窗展示、关闭后不重复、中英文文案切换。
- 历史记录：三种模式自动写入、成功/失败状态正确、可回填继续生成。
- 设置页：语言设置、API Key 引导、反馈区提交都可正常工作。
- 首页：原有 Hero 和功能入口不受影响，新增 SEO 内容正确展示。
- 菜单：新增历史记录入口后，不影响现有菜单高亮和跳转。

### 7.2 回归测试

- 原有分析页上传、生成页配置、收藏页搜索、个人中心编辑昵称都不受影响。
- 生成成功后配置栏收起逻辑保持可用。
- 结果区工具栏和分镜表格展示不受历史记录能力影响。

### 7.3 SEO 检查

- 检查首页和英文公开页的 `title` / `description` / `canonical` / `og:*`
- 检查 `sitemap.xml` 和 `robots.txt`
- 检查首页是否输出 JSON-LD

---

## 8. 实施建议

1. 先从 `AppMenu`、`router`、`SettingsPage`、`HomePage` 这些边界清晰的入口开始改。
2. 历史记录写入优先接在现有分析/生成成功失败流程上，不要重做主流程状态机。
3. 设置能力尽量拆到 `useSettings`，不要让 `useVideoAnalysis` 继续承担无关配置。
4. 所有后续版本规划，必须先审查当前相关页面与组件代码，再落设计方案。
