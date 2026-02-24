# v0.2.2 开发计划

> 📘 **详细配置指南**: [supabase-setup.md](./supabase-setup.md) - 包含完整 SQL、步骤截图、常见问题

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
v0.2.2-alpha  ──▶  v0.2.2-beta  ──▶  v0.2.2-stable
   │                  │                 │
   │                  │                 └── 完整功能 + 优化
   │                  │
   │                  └── 账号体系 + 收藏
   │
   └── 三栏布局 + 模型接入 + 基础功能
```

---

## v0.2.2-alpha：基础架构

### 阶段目标

完成三栏布局、OpenAI SDK 兼容层、模型接入。

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
- [ ] 响应式适配（移动端）

#### 3. 路由配置 ✅

- [x] 安装 `vue-router@4`
- [x] 配置路由表
- [x] 实现路由懒加载
- [x] 创建空白页面占位（Home/Analyze/Create/Favorites/Settings/Profile/Login）

#### 4. OpenAI SDK 兼容层 ✅

- [x] 创建 `src/lib/openai-client.ts`
- [x] 创建 `src/api/providers/aliyun.ts`
- [x] 创建 `src/api/providers/volcengine.ts`
- [x] 创建 `src/api/analysis.ts`（统一入口）
- [x] 重构现有 `videoAnalysis.ts` 使用新接口

#### 5. 模型选择 UI ✅

- [x] 更新 `AnalysisControl.vue` 支持分组下拉
- [x] 实现 API Key 双渠道配置
- [x] 创建 `src/config/models.ts` 硬编码模型配置
- [x] 移除旧模型（仅保留 Qwen3.5 + Doubao）

#### 6. 页面迁移 ✅

- [x] 迁移现有功能到 `AnalyzePage.vue`
- [x] 完善 `HomePage.vue`（欢迎页）
- [x] 完善 `SettingsPage.vue`（API Key 配置）

### 验收标准

- [x] 三栏布局正常显示
- [x] 菜单切换正常
- [ ] Qwen3.5 模型调用正常
- [ ] Doubao 模型调用正常
- [ ] 流式输出正常

---

## v0.2.2-beta：账号体系

### 阶段目标

完成 Supabase 集成、用户认证、脚本收藏。

### 前置依赖

> 必须先完成「前置准备：Supabase 配置」中的所有任务。

### 任务清单

#### 1. Supabase 集成 ✅

- [x] 安装 `@supabase/supabase-js`
- [x] 创建 `src/lib/supabase.ts`
- [x] 配置环境变量
- [ ] 测试连接

#### 2. 认证状态管理

- [ ] 创建 `src/composables/useAuth.ts`
- [ ] 实现登录/注册方法
- [ ] 实现 GitHub OAuth
- [ ] 实现退出登录
- [ ] 实现状态持久化

#### 3. 登录/注册页面

- [ ] 创建 `LoginPage.vue`
- [ ] 实现登录表单
- [ ] 实现注册表单
- [ ] 实现 GitHub 登录按钮
- [ ] 实现表单验证

#### 4. 路由守卫

- [ ] 实现登录状态检查
- [ ] 实现重定向逻辑
- [ ] 保护需登录的页面

#### 5. 用户状态栏

- [ ] 未登录显示登录/注册按钮
- [ ] 已登录显示头像和下拉菜单
- [ ] 实现退出登录

#### 6. 收藏功能

- [ ] 创建 `src/composables/useFavorites.ts`
- [ ] 实现收藏 CRUD 操作
- [ ] 创建收藏弹窗组件
- [ ] 更新 ResultToolbar 添加收藏按钮
- [ ] 实现未登录提示

#### 7. 收藏列表页面

- [ ] 创建 `FavoritesPage.vue`
- [ ] 实现列表展示
- [ ] 实现搜索/筛选
- [ ] 实现加载脚本到编辑器
- [ ] 实现删除收藏

#### 8. 个人中心页面

- [ ] 创建 `ProfilePage.vue`
- [ ] 实现个人信息展示
- [ ] 实现昵称修改
- [ ] 实现最近收藏展示

### 验收标准

- [ ] 邮箱注册成功
- [ ] 邮箱登录成功
- [ ] GitHub OAuth 登录成功
- [ ] 登录状态刷新后保持
- [ ] 收藏脚本成功
- [ ] 收藏列表展示正常
- [ ] 加载收藏脚本正常
- [ ] 删除收藏正常
- [ ] 路由守卫正常

---

## v0.2.2-stable：功能完善

### 阶段目标

完成提示词优化、多输入源生成、收藏引用、结果跳转、分镜图生成。

### 任务清单

#### 1. 提示词优化

- [ ] 优化时间连续性规则
- [ ] 优化内容衔接规则
- [ ] 优化输出格式稳定性
- [ ] 添加三种模式的差异化提示词

#### 2. 多输入源生成

- [ ] 创建 `ImageUploader.vue` 组件
- [ ] 扩展图片上传 API
- [ ] 创建 `CreateModePanel.vue`
- [ ] 创建 `ReferenceModePanel.vue`
- [ ] 更新 `LeftPanel.vue` 支持 Tabs 切换

#### 3. 收藏脚本引用

- [ ] 在参考生成模式添加来源选择
- [ ] 实现收藏脚本选择下拉
- [ ] 实现从收藏加载到参考脚本

#### 4. 分析结果跳转生成

- [ ] 在 ResultToolbar 添加「基于此生成」按钮
- [ ] 实现跳转到参考生成模式
- [ ] 自动填充当前脚本为参考

#### 5. 分镜图生成

- [ ] 创建 `src/api/imageGeneration.ts`
- [ ] 实现异步任务创建
- [ ] 实现任务轮询
- [ ] 创建 `src/utils/imageQueue.ts`（并发控制）
- [ ] 更新 `ScriptTable.vue` 添加分镜图列
- [ ] 更新 `ResultToolbar.vue` 添加生成按钮
- [ ] 实现单个/批量生成

#### 6. 首页内容

- [ ] 设计欢迎页内容
- [ ] 实现使用指南
- [ ] 实现快速开始入口

#### 7. 性能优化

- [ ] 路由懒加载
- [ ] 组件懒加载
- [ ] 图片懒加载

#### 8. 测试与修复

- [ ] 功能测试
- [ ] 响应式测试
- [ ] 兼容性测试
- [ ] Bug 修复

### 验收标准

- [ ] 时间戳完全连续
- [ ] 三种模式切换正常
- [ ] 图片上传正常
- [ ] 参考脚本加载正常
- [ ] 收藏脚本引用正常
- [ ] 结果跳转生成正常
- [ ] 分镜图批量生成正常
- [ ] 分镜图单个重新生成正常
- [ ] 构建通过
- [ ] Vercel 部署正常

---

## 环境变量清单

### 开发环境 `.env`

```env
# Supabase
VITE_SUPABASE_URL=https://itvxtgubawholioliysr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 模型 API（用户在页面设置中配置，无需在此配置）
```

### Vercel 生产环境

在 Vercel Dashboard 中配置相同的环境变量。

---

## 时间估算

| 版本 | 预计工作量 | 说明 |
|------|-----------|------|
| Supabase 配置 | 0.5 天 | 一次性配置 |
| v0.2.2-alpha | 2-3 天 | 基础架构 |
| v0.2.2-beta | 2-3 天 | 账号收藏 |
| v0.2.2-stable | 2-3 天 | 功能完善 |
| **总计** | **7-10 天** | - |

---

## 风险与依赖

| 风险/依赖 | 影响 | 缓解措施 |
|----------|------|----------|
| Supabase 服务稳定性 | 认证功能不可用 | 监控状态页，准备降级方案 |
| 火山引擎 API 变更 | Doubao 调用失败 | 使用 OpenAI 兼容格式降低耦合 |
| OAuth 配置错误 | 第三方登录失败 | 提供邮箱登录作为备选 |
| RLS 配置错误 | 数据泄露风险 | 开发环境充分测试 |

---

## 里程碑

```
[x] Supabase 配置  ──  数据库 + RLS + OAuth 完成 (2026-02-24)
[x] v0.2.2-alpha  ──  三栏布局 + 模型接入完成 (2026-02-24)
[ ] v0.2.2-beta   ──  账号体系 + 收藏功能完成
[ ] v0.2.2-stable ──  全部功能完成，准备发布
```
