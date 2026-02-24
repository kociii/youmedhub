# v0.2.2 技术实现指导文档

## 1. 架构概览

### 1.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue 3 | 3.5+ |
| 构建 | Vite | 7.x |
| 路由 | Vue Router | 4.x |
| 状态 | Composition API | - |
| UI | shadcn-vue | New York |
| 认证 | Supabase Auth | 2.x |
| 存储 | Supabase Database | - |
| 部署 | Vercel Serverless | - |

### 1.2 模块划分

```
src/
├── lib/                    # 外部服务客户端
│   ├── supabase.ts         # Supabase 客户端
│   └── openai-client.ts    # OpenAI 兼容 API 客户端
├── api/                    # API 调用层
│   ├── analysis.ts         # 统一分析接口
│   ├── providers/          # 模型提供商
│   │   ├── aliyun.ts       # 阿里百炼
│   │   └── volcengine.ts   # 火山引擎
│   └── image.ts            # 图片生成
├── composables/            # 状态管理
│   ├── useAuth.ts          # 认证状态
│   ├── useFavorites.ts     # 收藏管理
│   └── useVideoAnalysis.ts # 分析状态
├── views/                  # 页面组件
│   ├── HomePage.vue
│   ├── ScriptPage.vue
│   ├── FavoritesPage.vue
│   ├── SettingsPage.vue
│   ├── ProfilePage.vue
│   └── LoginPage.vue
├── components/             # 通用组件
│   ├── layout/
│   │   ├── AppLayout.vue   # 三栏布局
│   │   ├── AppMenu.vue     # 侧边菜单
│   │   └── UserBar.vue     # 用户状态栏
│   └── ...
├── prompts/                # 提示词模板
│   └── videoAnalysis.ts
├── types/                  # 类型定义
│   ├── video.ts
│   ├── auth.ts
│   └── api.ts
└── router/                 # 路由配置
    └── index.ts
```

---

## 2. OpenAI SDK 兼容层

### 2.1 设计目标

所有模型统一使用 OpenAI SDK 兼容格式调用，便于未来扩展新模型。

### 2.2 接口抽象

```
┌─────────────────────────────────────────────────────┐
│                   analyze()                          │
│                 (统一入口函数)                       │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│              ProviderRouter                          │
│           (根据模型选择 Provider)                    │
└─────────┬───────────────────────┬───────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ AliyunProvider  │     │VolcengineProvider│
│  (OpenAI 格式)  │     │  (OpenAI 格式)   │
└─────────────────┘     └─────────────────┘
          │                       │
          ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ dashscope API   │     │  ark API        │
│ /compatible-mode│     │  /v3/chat       │
└─────────────────┘     └─────────────────┘
```

### 2.3 Provider 接口规范

每个 Provider 需实现：

| 方法 | 参数 | 返回 |
|------|------|------|
| `chat()` | messages, options | AsyncGenerator (stream) |
| `getEndpoint()` | - | API 端点 URL |
| `getHeaders()` | apiKey | 请求头 |

### 2.4 端点配置

| Provider | 端点 | 格式 |
|----------|------|------|
| 阿里百炼 | `dashscope.aliyuncs.com/compatible-mode/v1` | OpenAI 兼容 |
| 火山引擎 | `ark.cn-beijing.volces.com/api/v3` | OpenAI 兼容 |

---

## 3. 认证架构

### 3.1 认证流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   前端应用   │────▶│  Supabase   │────▶│  PostgreSQL  │
│              │     │    Auth     │     │   (RLS)      │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  useAuth()   │     │  JWT Token  │
│  状态管理    │     │  自动刷新   │
└──────────────┘     └──────────────┘
```

### 3.2 状态管理

`useAuth()` composable 职责：

| 状态 | 类型 | 说明 |
|------|------|------|
| `user` | User \| null | 当前用户 |
| `session` | Session \| null | 会话信息 |
| `loading` | boolean | 加载状态 |
| `isAuthenticated` | computed | 是否已登录 |

| 方法 | 说明 |
|------|------|
| `signUp()` | 邮箱注册 |
| `signIn()` | 邮箱登录 |
| `signInWithGitHub()` | GitHub OAuth |
| `signOut()` | 退出登录 |

### 3.3 路由守卫

```
路由跳转
    │
    ▼
┌─────────────────┐
│ 需要登录？      │
└───────┬─────────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
 是         否
   │         │
   ▼         │
┌─────────┐  │
│已登录？ │  │
└────┬────┘  │
     │       │
  ┌──┴──┐    │
  │     │    │
  ▼     ▼    ▼
 是    否   放行
  │     │
  │     ▼
  │  重定向登录页
  │
  ▼
 放行
```

---

## 4. 数据模型

### 4.1 核心类型

#### VideoScriptItem

```
VideoScriptItem {
  sequenceNumber: number     // 序号
  shotType: string          // 景别
  cameraMovement: string    // 运镜
  visualContent: string     // 画面内容
  shootingGuide: string     // 拍摄指导
  onScreenText: string      // 画面文案/花字
  voiceover: string         // 口播/台词
  audio: string             // 音效/BGM
  startTime: string         // 开始时间
  endTime: string           // 结束时间
  duration: string          // 时长
  storyboardImage?: string  // 分镜图 URL
  imageStatus?: enum        // 图片生成状态
}
```

#### AIModel

```
AIModel {
  id: string               // 模型标识
  name: string             // 显示名称
  channel: 'aliyun' | 'volcengine'
  description?: string
}
```

#### Favorite

```
Favorite {
  id: string
  userId: string
  title: string
  description?: string
  scriptData: VideoScriptItem[]
  sourceType: 'video' | 'create' | 'reference'
  sourceUrl?: string
  modelUsed?: string
  createdAt: Date
}
```

### 4.2 数据库 Schema

见 [auth.md](./auth.md) 第 2 节。

---

## 5. 提示词工程

### 5.1 提示词结构

```
┌─────────────────────────────────────────┐
│              系统角色定义                │
│        "你是专业的视频分镜分析师"        │
├─────────────────────────────────────────┤
│              输出格式规范                │
│    Markdown 表格格式 + 列定义           │
├─────────────────────────────────────────┤
│              时间连续性规则              │
│  - 结束时间 = 下一个开始时间            │
│  - 最后一个结束时间 = 视频总时长        │
├─────────────────────────────────────────┤
│              内容衔接规则                │
│  - 景别变化                             │
│  - 运镜转场                             │
├─────────────────────────────────────────┤
│              参考知识                    │
│  - 景别类型说明                         │
│  - 运镜方式说明                         │
├─────────────────────────────────────────┤
│              输入内容                    │
│  视频/图片/文字描述                     │
└─────────────────────────────────────────┘
```

### 5.2 三种模式的提示词差异

| 模式 | 特殊要求 |
|------|----------|
| 视频分析 | 分析实际视频内容，时间戳精确 |
| 从零生成 | 基于描述创意，时长分配合理 |
| 参考生成 | 保留参考脚本风格，按指令调整 |

---

## 6. 图片生成

### 6.1 调用流程

```
用户触发生成
      │
      ▼
┌─────────────────┐
│ 构建提示词      │
│ (景别+内容+运镜)│
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│ 创建异步任务    │
│ POST /generation│
│ 返回 taskId     │
└───────┬─────────┘
        │
        ▼
┌─────────────────┐
│ 轮询任务状态    │
│ GET /{taskId}   │
│ 每 2s 查询一次  │
└───────┬─────────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
成功       失败/超时
   │         │
   ▼         ▼
返回URL   抛出异常
```

### 6.2 并发控制

- 队列模式：任务入队，逐个执行
- 并发限制：最多 2 个任务同时运行
- 失败处理：单个失败不影响其他任务

---

## 7. 路由配置

### 7.1 路由表

| 路由 | 页面 | 需登录 | 说明 |
|------|------|--------|------|
| `/` | HomePage | 否 | 首页/欢迎 |
| `/script` | ScriptPage | 否 | 脚本创作（核心） |
| `/favorites` | FavoritesPage | 是 | 我的收藏 |
| `/settings` | SettingsPage | 否 | 设置 |
| `/profile` | ProfilePage | 是 | 个人中心 |
| `/login` | LoginPage | 否 | 登录/注册 |

### 7.2 布局结构

```
App.vue
├── AppLayout.vue (三栏布局)
│   ├── AppMenu.vue (左一菜单)
│   ├── router-view
│   │   ├── 配置区 (左二，根据页面变化)
│   │   └── 内容区 (右侧)
│   └── UserBar.vue (用户状态栏)
└── Dialogs (全局弹窗)
```

---

## 8. 状态管理策略

### 8.1 状态分类

| 类型 | 存储位置 | 生命周期 |
|------|----------|----------|
| 认证状态 | Supabase + localStorage | 持久化 |
| 用户数据 | Supabase Database | 持久化 |
| 脚本数据 | composable ref | 会话级 |
| UI 状态 | composable ref | 会话级 |
| 配置项 | localStorage | 持久化 |

### 8.2 Composable 职责

| Composable | 职责 |
|------------|------|
| `useAuth` | 认证状态、登录登出 |
| `useFavorites` | 收藏 CRUD |
| `useVideoAnalysis` | 分析状态、脚本数据 |
| `useApiKeys` | API Key 管理 |

---

## 9. 错误处理

### 9.1 错误分类

| 类型 | 处理方式 |
|------|----------|
| 认证错误 | 跳转登录页 |
| API 限流 | 提示等待 + 重试 |
| 网络错误 | Toast 提示 + 重试按钮 |
| 解析错误 | 显示原始内容 + 提示 |
| 业务错误 | 内联提示 |

### 9.2 用户反馈

- 加载状态：按钮 loading + 骨架屏
- 成功：Toast 提示
- 失败：内联错误信息 + 重试

---

## 10. 性能优化

### 10.1 懒加载

| 组件 | 策略 |
|------|------|
| 页面组件 | 路由懒加载 |
| 对话框 | 首次打开时加载 |
| 表格视频 | 首次 hover 时创建 video 元素 |

### 10.2 缓存策略

| 数据 | 缓存方式 |
|------|----------|
| API Key | localStorage |
| 用户信息 | Supabase 自动管理 |
| 脚本结果 | 会话内存（不持久化） |

---

## 11. 安全考虑

### 11.1 API Key 安全

- Key 存储在 localStorage（客户端可见）
- 生产环境考虑使用 Serverless Function 代理
- 不同渠道使用不同 Key

### 11.2 数据安全

- Supabase RLS 保护用户数据
- JWT 自动过期刷新
- HTTPS 强制

### 11.3 XSS 防护

- Markdown 渲染使用 trusted 库
- 用户输入转义处理
- CSP 配置（生产环境）

---

## 12. 部署配置

### 12.1 环境变量

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# 模型 API（可选，也可由用户在设置中配置）
VITE_DASHSCOPE_API_KEY=sk-xxx
VITE_ARK_API_KEY=xxx
```

### 12.2 Vercel 配置

- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：在 Vercel Dashboard 配置

---

## 13. 测试策略

### 13.1 单元测试

| 模块 | 测试重点 |
|------|----------|
| 提示词生成 | 输出格式、规则应用 |
| 时间解析 | 格式转换、边界情况 |
| 数据转换 | ScriptItem 解析 |

### 13.2 集成测试

| 场景 | 测试重点 |
|------|----------|
| 登录流程 | OAuth 回调、状态更新 |
| 脚本分析 | 流式输出、结果解析 |
| 收藏功能 | CRUD 操作 |

### 13.3 E2E 测试

| 流程 | 测试步骤 |
|------|----------|
| 完整分析流程 | 登录 → 上传 → 分析 → 收藏 → 查看 |
| 认证流程 | 注册 → 登录 → 个人中心 → 退出 |

---

## 14. 开发里程碑

### Phase 1：基础架构（3 天）

- [ ] 三栏布局
- [ ] 路由配置
- [ ] Supabase 集成
- [ ] 认证状态管理

### Phase 2：核心功能（5 天）

- [ ] OpenAI 兼容 API 层
- [ ] 模型选择（Qwen3.5 + Doubao）
- [ ] 提示词优化
- [ ] 多输入源生成

### Phase 3：用户功能（3 天）

- [ ] 登录/注册页面
- [ ] 个人中心
- [ ] 收藏功能

### Phase 4：增强功能（2 天）

- [ ] 分镜图生成
- [ ] 性能优化
- [ ] 测试 & 修复

---

## 15. 文件清单

### 新建文件

| 文件 | 说明 |
|------|------|
| `src/lib/supabase.ts` | Supabase 客户端 |
| `src/lib/openai-client.ts` | OpenAI 兼容客户端 |
| `src/api/providers/aliyun.ts` | 阿里百炼 Provider |
| `src/api/providers/volcengine.ts` | 火山引擎 Provider |
| `src/api/analysis.ts` | 统一分析接口 |
| `src/api/image.ts` | 图片生成 API |
| `src/composables/useAuth.ts` | 认证状态 |
| `src/composables/useFavorites.ts` | 收藏管理 |
| `src/composables/useApiKeys.ts` | API Key 管理 |
| `src/views/HomePage.vue` | 首页 |
| `src/views/ScriptPage.vue` | 脚本创作 |
| `src/views/FavoritesPage.vue` | 收藏列表 |
| `src/views/SettingsPage.vue` | 设置页 |
| `src/views/ProfilePage.vue` | 个人中心 |
| `src/views/LoginPage.vue` | 登录页 |
| `src/components/layout/AppLayout.vue` | 三栏布局 |
| `src/components/layout/AppMenu.vue` | 侧边菜单 |
| `src/components/layout/UserBar.vue` | 用户状态栏 |
| `src/router/index.ts` | 路由配置 |
| `src/types/auth.ts` | 认证类型 |

### 修改文件

| 文件 | 说明 |
|------|------|
| `src/App.vue` | 使用 AppLayout |
| `src/types/video.ts` | 扩展类型 |
| `src/prompts/videoAnalysis.ts` | 优化提示词 |
| `src/composables/useVideoAnalysis.ts` | 重构状态管理 |
| `.env.example` | 新增环境变量 |
