# v0.2.2 开发计划

> 📘 **详细配置指南**: [supabase-setup.md](./supabase-setup.md) - 包含完整 SQL、步骤截图、常见问题
>
> 📋 **后续规划**: [产品路线图](../../roadmap.md) - 记录 v0.3.0+ 的功能规划

---

## 版本状态

```
v0.2.2 ✅ 已发布 (2026-02-25)
```

**包含功能**：
- ✅ 视频分析（AI 拆解脚本）
- ✅ 脚本生成（从零创作 + 参考生成）
- ✅ 用户认证（邮箱注册/登录）
- ✅ 收藏管理（云端存储）
- ✅ 个人中心（昵称修改）
- ✅ Excel 导出

**未完成功能已移至**：[产品路线图](../../roadmap.md)

---

## 前置准备：Supabase 配置 ✅ 已完成

> ✅ **2026-02-24 完成** - 项目已创建，表结构和 RLS 策略已配置。

### 任务清单

- [x] **项目创建**: 注册账号 → 创建项目 → 获取 URL/Key
- [x] **数据库配置**: 执行建表 SQL（profiles + user_settings + script_favorites）
- [x] **RLS 配置**: 执行安全策略 SQL（10 条策略）
- [x] **认证配置**: 启用 Email + GitHub OAuth
- [x] **URL 配置**: Site URL + Redirect URLs 白名单
- [x] **环境变量**: 本地 `.env` 配置完成（Vercel 待配置）

> 📋 所有 SQL 和配置步骤见 [supabase-setup.md](./supabase-setup.md)

---

## 版本规划

```
v0.2.2-alpha  ──▶  v0.2.2-beta  ──▶  v0.2.2-stable ✅
   │                  │                 │
   │                  │                 └── 当前版本（已发布）
   │                  │
   │                  └── 账号体系 + 收藏 ✅
   │
   └── 三栏布局 + 模型接入 + 基础功能 ✅
```

---

## v0.2.2-alpha：基础架构 ✅ 已完成

### 阶段目标

完成三栏布局、OpenAI SDK 兼容层、模型接入。

> ✅ **2026-02-24 完成** - 所有验收标准通过，两个渠道 API 调用验证成功。

### 任务清单

#### 1. 项目结构调整 ✅

- [x] 创建 `src/lib/` 目录
- [x] 创建 `src/views/` 目录
- [x] 创建 `src/components/layout/` 目录
- [x] 创建 `src/router/index.ts`
- [x] 安装 vue-router@4 和 @supabase/supabase-js
- [x] 更新 `env.d.ts` 环境变量类型

#### 2. 三栏布局 ✅

- [x] 创建 `AppLayout.vue`（三栏容器）
- [x] 创建 `AppMenu.vue`（侧边菜单）
- [x] 创建 `UserBar.vue`（用户状态栏）
- [x] 更新 `App.vue` 使用新布局
- [x] 菜单路由高亮
- [x] 左二栏按路由显示/隐藏

> 📋 响应式适配移至 [路线图 v0.4.0](../../roadmap.md#移动端适配)

#### 3. 路由配置 ✅

- [x] 安装 `vue-router@4`
- [x] 配置路由表
- [x] 实现路由懒加载
- [x] 创建空白页面占位（Home/Analyze/Create/Favorites/Settings/Profile/Login）

#### 4. OpenAI SDK 兼容层 ✅

- [x] 创建 `src/lib/openai-client.ts`
- [x] 创建 `src/api/providers/aliyun.ts`
- [x] ~~创建 `src/api/providers/volcengine.ts`~~ (已删除)
- [x] 创建 `src/api/analysis.ts`（统一入口）
- [x] 重构现有 `videoAnalysis.ts` 使用新接口

#### 5. 模型配置 ✅

- [x] 创建 `src/config/models.ts` 硬编码模型配置
- [x] 仅保留 `qwen3.5-plus` 模型
- [x] 删除火山引擎相关代码

#### 6. 思考模式 ✅

- [x] 添加 `enableThinking` 状态（`useVideoAnalysis.ts`）
- [x] 实现思考模式开关 UI（`AnalysisControl.vue`）
- [x] 实现 `extra_body.enable_thinking` 参数传递
- [x] 实现思考内容流式解析（`reasoning_content`）
- [x] 创建思考内容展示组件（`ThinkingPanel.vue`）

#### 7. 提示词优化 ✅

- [x] 添加系统提示词（角色定义 + 核心约束）
- [x] 优化消息结构（system + user）

#### 8. 页面迁移 ✅

- [x] 迁移现有功能到 `AnalyzePage.vue`
- [x] 完善 `HomePage.vue`（欢迎页）
- [x] 完善 `SettingsPage.vue`（API Key 配置）

### 验收标准 ✅

- [x] 三栏布局正常显示
- [x] 菜单切换正常
- [x] Qwen3.5 模型调用正常
- [x] 流式输出正常
- [x] 思考模式参数传递正确（`extra_body.enable_thinking`）
- [x] 系统提示词优化完成

---

## v0.2.2-beta：账号体系 ✅ 已完成

### 阶段目标

完成用户认证、脚本收藏。

> ✅ **2026-02-25 完成** - 账号体系、收藏功能、个人中心开发完成。

### 前置依赖

> Supabase 配置已完成。

### 任务清单

#### 1. Supabase 集成 ✅

- [x] 安装 `@supabase/supabase-js`
- [x] 创建 `src/lib/supabase.ts`
- [x] 配置环境变量
- [x] 测试连接

#### 2. 认证状态管理 ✅

- [x] 创建 `src/composables/useAuth.ts`
- [x] 实现登录/注册方法
- [x] 实现 GitHub OAuth
- [x] 实现退出登录
- [x] 实现状态持久化

#### 3. 登录/注册弹窗 ✅

- [x] 创建 `AuthDialog.vue` 弹窗组件
- [x] 实现登录表单
- [x] 实现注册表单
- [x] 实现 GitHub 登录按钮
- [x] 实现表单验证

#### 4. 路由守卫 ✅

- [x] 实现登录状态检查
- [x] 实现重定向逻辑
- [x] 保护需登录的页面

#### 5. AppMenu 用户状态 ✅

- [x] 未登录显示登录按钮（点击弹出登录弹窗）
- [x] 已登录显示个人中心入口
- [x] 实现退出登录

#### 6. 收藏功能 ✅

- [x] 创建 `src/composables/useFavorites.ts`
- [x] 实现收藏 CRUD 操作
- [x] 创建收藏确认弹窗 `FavoriteDialog.vue`
- [x] 更新 ResultToolbar 添加收藏按钮
- [x] 实现未登录提示

#### 7. 收藏列表页面 ✅

- [x] 完善 `FavoritesPage.vue`
- [x] 实现列表展示
- [x] 实现搜索/筛选
- [x] 实现加载脚本到编辑器
- [x] 实现删除收藏

#### 8. 个人中心页面 ✅

- [x] 完善 `ProfilePage.vue`
- [x] 实现个人信息展示
- [x] 实现昵称修改
- [x] ~~实现最近收藏展示~~ (已移除，收藏列表在收藏页面展示)

### 验收标准 ✅

- [x] 邮箱注册成功
- [x] 邮箱登录成功
- [ ] GitHub OAuth 登录成功（需线上环境测试）
- [x] 登录状态刷新后保持
- [x] 收藏脚本成功
- [x] 收藏列表展示正常
- [x] 加载收藏脚本正常
- [x] 删除收藏正常
- [x] 路由守卫正常
- [x] 个人中心展示正常（不显示最近收藏）
- [x] 昵称修改正常

---

## v0.2.2-stable：功能完善 ✅ 已完成

### 阶段目标

完成提示词优化、首页内容、基础脚本生成。

> ✅ **2026-02-25 完成** - 核心功能已实现，未完成功能移至路线图。

### 任务清单

#### 1. 提示词优化 ✅

- [x] 优化时间连续性规则
- [x] 优化内容衔接规则
- [x] 优化输出格式稳定性
- [x] 保留现有生成提示词基线

#### 2. 脚本生成基础功能 ✅

- [x] 创建 `ImageUploader.vue` 组件
- [x] 扩展图片上传 API（useVideoAnalysis 添加图片状态）
- [x] 从零创作模式
- [x] 参考生成模式
- [x] 分析结果跳转生成

> 📋 统一输入流程移至 [路线图 v0.3.0](../../roadmap.md#统一输入流程)

#### 3. 首页内容 ✅

- [x] 设计欢迎页内容
- [x] 实现功能入口（拆解脚本、脚本生成）
- [x] 添加"即将推出"功能预告

#### 4. 性能优化（部分完成）

- [x] 路由懒加载

> 📋 组件懒加载、图片懒加载移至 [路线图 v0.4.0](../../roadmap.md#性能优化)

### 验收标准 ✅

- [x] 时间戳完全连续
- [x] 图片上传正常（UI）
- [x] 从零创作模式正常
- [x] 参考生成模式正常
- [x] 分析结果跳转生成正常
- [x] 首页功能预告展示正常
- [x] 构建通过

---

## 环境变量清单

### 开发环境 `.env`

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 模型 API（用户在页面设置中配置，无需在此配置）
```

### Vercel 生产环境

在 Vercel Dashboard 中配置相同的环境变量。

---

## 里程碑

```
[x] Supabase 配置  ──  数据库 + RLS + OAuth 完成 (2026-02-24)
[x] v0.2.2-alpha  ──  三栏布局 + 模型接入完成 (2026-02-24)
[x] v0.2.2-beta   ──  账号体系 + 收藏功能完成 (2026-02-25)
[x] v0.2.2-stable ──  核心功能完成，版本发布 (2026-02-25)
```

---

## 新增组件清单

### v0.2.2 新增组件

| 组件 | 路径 | 功能 |
|------|------|------|
| AppLayout | `src/components/layout/AppLayout.vue` | 三栏布局容器 |
| AppMenu | `src/components/layout/AppMenu.vue` | 侧边导航菜单 |
| UserBar | `src/components/layout/UserBar.vue` | 用户状态栏 |
| AuthDialog | `src/components/AuthDialog.vue` | 登录/注册弹窗 |
| FavoriteDialog | `src/components/FavoriteDialog.vue` | 收藏确认弹窗 |
| ThinkingPanel | `src/components/ThinkingPanel.vue` | 思考过程面板 |
| CreateModePanel | `src/components/CreateModePanel.vue` | 从零创作面板 |
| ReferenceModePanel | `src/components/ReferenceModePanel.vue` | 参考生成面板 |
| ImageUploader | `src/components/ImageUploader.vue` | 图片上传组件 |
| useAuth | `src/composables/useAuth.ts` | 认证状态管理 |
| useFavorites | `src/composables/useFavorites.ts` | 收藏功能管理 |
| useProfile | `src/composables/useProfile.ts` | 个人资料管理 |

---

## 状态管理架构

### useVideoAnalysis

核心全局状态（模块级单例）：

```typescript
// 视频状态
videoFile, videoUrl, localVideoUrl, uploadProgress, uploadStatus

// 图片状态（参考生成）
imageFile, imageUrl, localImageUrl

// 分析结果
markdownContent, scriptItems, tokenUsage
analysisMode, viewMode

// 模型配置
selectedModel, enableThinking, thinkingContent

// 分析结果跳转预填
pendingReference
```

### useAuth

认证状态：

```typescript
user, isAuthenticated, userEmail, userName, userAvatar
signIn, signUp, signInWithGitHub, signOut
```

### useFavorites

收藏状态：

```typescript
favorites, loading
loadFavorites, addFavorite, removeFavorite, getFavoriteById
```

### useProfile

个人资料状态：

```typescript
profile, nickname, avatarUrl
loadProfile, updateNickname, updateAvatarUrl
```
