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

### 4.3 三步生成工作流模型（新增）

#### GenerationInputSnapshot（Step 1 提交快照）

```
GenerationInputSnapshot {
  videoType: 'ecommerce' | 'usage' | 'selling-point' | 'unboxing' | 'comparison' | 'tutorial' | 'brand-story'
  requirementFields: Record<string, string> // 视频类型对应动态字段
  requirementNote?: string                  // 补充说明
  referenceImageUrls?: string[]
  referenceScript?: string
  style?: string
  targetDuration?: number
  scriptCount: number
  submittedAt: string
}
```

#### ScriptCandidate（脚本候选）

```
ScriptCandidate {
  id: string
  index: number
  title: string
  markdownContent: string
  scriptItems: VideoScriptItem[]
  status: 'pending' | 'streaming' | 'success' | 'failed'
  error?: string
}
```

#### GenerationWorkflowState（Step 编排状态）

```
GenerationWorkflowState {
  snapshot?: GenerationInputSnapshot
  scriptStep: 'idle' | 'running' | 'done' | 'failed'
  storyboardStep: 'idle' | 'running' | 'partial' | 'done' | 'failed'
  videoStep: 'idle' | 'running' | 'done' | 'failed'
  candidates: ScriptCandidate[]
  activeCandidateId?: string
}
```

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

### 5.2 统一输入下的提示词策略

| 场景 | 特殊要求 |
|------|----------|
| 视频分析 | 分析实际视频内容，时间戳精确 |
| 脚本生成（无参考） | 基于视频要求卡片生成完整脚本，时长分配合理 |
| 脚本生成（有参考） | 参考输入脚本/图片风格，同时满足视频要求卡片约束 |

### 5.3 视频要求卡片字段映射（7 类）

`videoType` 作为路由字段，动态字段由前端配置映射到统一 prompt 结构：

- 电商头图类：商品名称、核心卖点、价格/优惠、目标人群
- 使用场景类：典型场景、用户痛点、使用步骤、环境限制
- 卖点展示类：卖点清单、证明方式、优先级
- 开箱测评类：开箱亮点、测评维度、优缺点、结论倾向
- 对比种草类：对比对象、对比维度、推荐理由、适用人群
- 教程讲解类：教程目标、步骤拆解、注意事项、成果展示
- 品牌故事类：品牌定位、故事主线、情感关键词、行动号召

---

## 6. 三步生成能力（Step2 分镜图 + Step3 视频）

### 6.1 Step 2 分镜图调用流程

```
用户触发（批量/单条）
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

### 6.2 Step 2 状态与并发控制

- 队列模式：任务入队，逐个执行
- 并发限制：最多 2 个任务同时运行
- 失败处理：单个失败不影响其他任务
- 状态粒度：按 `candidateId + shotId` 维护 `idle/running/success/failed`

### 6.3 Step 3 视频生成流程

```
选择当前脚本候选
      │
      ▼
检查分镜图就绪度（可配置最小阈值）
      │
      ▼
组装视频生成请求（脚本 + 分镜图 + 时长/风格）
      │
      ▼
调用视频生成 API
      │
      ▼
轮询任务状态 → 返回视频 URL / 错误
```

### 6.4 Step 编排约束

- Step 1 提交后生成 `GenerationInputSnapshot`，用于固定信息卡片展示。
- Step 2、Step 3 必须绑定 `activeCandidateId`，避免跨方案错用素材。
- 切换候选脚本时，仅切换展示与操作上下文，不清空其他候选结果。

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
| 三步工作流状态 | composable ref | 会话级 |
| UI 状态 | composable ref | 会话级 |
| 配置项 | localStorage | 持久化 |

### 8.2 Composable 职责

| Composable | 职责 |
|------------|------|
| `useAuth` | 认证状态、登录登出 |
| `useFavorites` | 收藏 CRUD |
| `useVideoAnalysis` | 分析状态、脚本候选、Step1/2/3 编排状态 |
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
| Step 生成流程 | Step1 提交挂起、Step2 分镜图、Step3 视频生成 |
| 收藏功能 | CRUD 操作 |

### 13.3 E2E 测试

| 流程 | 测试步骤 |
|------|----------|
| 完整分析流程 | 登录 → 上传 → 分析 → 收藏 → 查看 |
| 完整生成流程 | 填写视频要求 → 生成多脚本 → 生成分镜图 → 生成视频 |
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
- [ ] 统一输入脚本生成（视频要求卡片 + 多脚本候选）

### Phase 3：用户功能（3 天）

- [ ] 登录/注册页面
- [ ] 个人中心
- [ ] 收藏功能

### Phase 4：增强功能（2 天）

- [ ] Step2 分镜图生成
- [ ] Step3 视频生成
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
