# v0.2.2 账号体系设计文档

## 1. 技术方案调研

### 1.1 候选方案对比

| 方案 | 优势 | 劣势 | 适用性 |
|------|------|------|--------|
| **Supabase Auth** | 完整方案、RLS 支持、免费额度大、与 Vercel 集成好 | 需要额外数据库 | ★★★★★ |
| **Clerk** | 开箱即用、UI 组件完善 | Vue 支持有限、收费 | ★★☆☆☆ |
| **Auth.js** | 开源免费、生态成熟 | 主要针对 Next.js | ★★★☆☆ |
| **自建 JWT + Vercel KV** | 完全可控、无第三方依赖 | 开发成本高、安全性需自行保障 | ★★★☆☆ |

### 1.2 推荐方案：Supabase Auth

**理由**：
1. 提供完整的用户认证（邮箱/密码、OAuth、魔法链接）
2. 内置 PostgreSQL 数据库，支持行级安全（RLS）
3. 免费额度：50,000 月活用户
4. 与 Vercel 部署无缝集成
5. 提供 Vue 3 SDK（@supabase/supabase-js）

---

## 2. 功能需求

### 2.1 用户功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 注册/登录 | 邮箱 + 密码 | P0 |
| OAuth 登录 | GitHub / Google | P1 |
| 个人信息 | 昵称、头像 | P1 |
| 脚本收藏 | 保存生成的脚本 | P0 |
| 收藏列表 | 查看/管理收藏 | P0 |

### 2.2 数据模型

#### 用户表（Supabase auth.users + public.profiles）

```sql
-- Supabase 内置 auth.users 表
-- 扩展 profiles 表
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  nickname TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 用户设置表（user_settings）

```sql
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users UNIQUE NOT NULL,
  dashscope_api_key TEXT DEFAULT '',   -- 阿里百炼 API Key
  ark_api_key TEXT DEFAULT '',         -- 火山引擎 ARK API Key
  default_model TEXT DEFAULT 'qwen3-vl-flash',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 脚本收藏表（script_favorites）

```sql
CREATE TABLE script_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- AI 输出
  raw_markdown TEXT NOT NULL DEFAULT '',  -- AI 原始返回
  script_data JSONB NOT NULL DEFAULT '[]', -- 解析后的分镜数据

  -- 来源信息
  source_type TEXT NOT NULL,   -- 'video' | 'create' | 'reference'
  source_url TEXT,             -- 原视频/图片 URL
  source_video_duration INTEGER DEFAULT 0,

  -- 模型信息
  model_provider TEXT DEFAULT '',  -- 'aliyun' | 'volcengine'
  model_id TEXT DEFAULT '',

  -- Token 消耗
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  shot_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_favorites_user ON script_favorites(user_id);
CREATE INDEX idx_favorites_created ON script_favorites(created_at DESC);
CREATE INDEX idx_favorites_source ON script_favorites(user_id, source_type);
```

### 2.3 行级安全（RLS）

```sql
-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_favorites ENABLE ROW LEVEL SECURITY;

-- profiles: 用户只能查看和修改自己的资料
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_settings: 用户只能操作自己的设置
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- script_favorites: 用户只能操作自己的收藏
CREATE POLICY "Users can view own favorites" ON script_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON script_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own favorites" ON script_favorites
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON script_favorites
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 3. 前端集成

### 3.1 依赖安装

```bash
npm install @supabase/supabase-js
```

### 3.2 环境变量

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3.3 客户端初始化

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### 3.4 认证状态管理

```typescript
// src/composables/useAuth.ts
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)

// 初始化：监听认证状态变化
supabase.auth.onAuthStateChange((event, newSession) => {
  session.value = newSession
  user.value = newSession?.user ?? null
  loading.value = false
})

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return { data, error }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signInWithGitHub() {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'github' })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return {
    user,
    session,
    loading,
    isAuthenticated,
    signUp,
    signIn,
    signInWithGitHub,
    signOut,
  }
}
```

### 3.5 收藏功能

```typescript
// src/composables/useFavorites.ts
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { VideoScriptItem, TokenUsage } from '@/types/video'

interface Favorite {
  id: string
  title: string
  description: string
  raw_markdown: string
  script_data: VideoScriptItem[]
  source_type: string
  source_url: string
  model_provider: string
  model_id: string
  input_tokens: number
  output_tokens: number
  shot_count: number
  created_at: string
}

interface AddFavoriteParams {
  title: string
  description?: string
  rawMarkdown: string
  scriptData: VideoScriptItem[]
  sourceType: 'video' | 'create' | 'reference'
  sourceUrl?: string
  modelProvider: 'aliyun' | 'volcengine'
  modelId: string
  tokenUsage?: TokenUsage | null
}

const favorites = ref<Favorite[]>([])
const loading = ref(false)

export function useFavorites() {
  const { user } = useAuth()

  async function fetchFavorites() {
    if (!user.value) return

    loading.value = true
    const { data } = await supabase
      .from('script_favorites')
      .select('*')
      .order('created_at', { ascending: false })

    favorites.value = data ?? []
    loading.value = false
  }

  async function addFavorite(params: AddFavoriteParams) {
    if (!user.value) return { error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('script_favorites')
      .insert({
        user_id: user.value.id,
        title: params.title,
        description: params.description || '',
        raw_markdown: params.rawMarkdown,
        script_data: params.scriptData,
        source_type: params.sourceType,
        source_url: params.sourceUrl || '',
        model_provider: params.modelProvider,
        model_id: params.modelId,
        input_tokens: params.tokenUsage?.prompt_tokens || 0,
        output_tokens: params.tokenUsage?.completion_tokens || 0,
        shot_count: params.scriptData.length,
      })
      .select()
      .single()

    if (!error && data) {
      favorites.value.unshift(data)
    }

    return { data, error }
  }

  async function removeFavorite(id: string) {
    const { error } = await supabase
      .from('script_favorites')
      .delete()
      .eq('id', id)

    if (!error) {
      favorites.value = favorites.value.filter(f => f.id !== id)
    }

    return { error }
  }

  return {
    favorites,
    loading,
    fetchFavorites,
    addFavorite,
    removeFavorite,
  }
}
```

---

## 4. 页面结构

### 4.1 新增页面

| 页面 | 路由 | 描述 |
|------|------|------|
| 登录 | `/login` | 邮箱密码 + OAuth |
| 注册 | `/register` | 邮箱注册 |
| 个人中心 | `/profile` | 个人信息 + 收藏列表 |

### 4.2 路由守卫

```typescript
// 需要登录才能访问的页面
const protectedRoutes = ['/profile']

router.beforeEach((to, from, next) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading.value) {
    // 等待认证状态加载完成
    watchOnce(loading, () => next())
    return
  }

  if (protectedRoutes.includes(to.path) && !isAuthenticated.value) {
    next('/login')
  } else {
    next()
  }
})
```

---

## 5. UI 设计

### 5.1 登录页面

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                   YouMedHub                         │
│                                                     │
│              ┌───────────────────────┐              │
│              │   登录 / 注册         │              │
│              ├───────────────────────┤              │
│              │                       │              │
│              │  邮箱                 │              │
│              │  ┌─────────────────┐  │              │
│              │  │                 │  │              │
│              │  └─────────────────┘  │              │
│              │                       │              │
│              │  密码                 │              │
│              │  ┌─────────────────┐  │              │
│              │  │                 │  │              │
│              │  └─────────────────┘  │              │
│              │                       │              │
│              │  ┌─────────────────┐  │              │
│              │  │     登 录       │  │              │
│              │  └─────────────────┘  │              │
│              │                       │              │
│              │  ─────── 或 ───────   │              │
│              │                       │              │
│              │  ┌─────────────────┐  │              │
│              │  │  🔑 GitHub 登录 │  │              │
│              │  └─────────────────┘  │              │
│              │                       │              │
│              └───────────────────────┘              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 个人中心页面

```
┌─────────────────────────────────────────────────────────────────┐
│  个人中心                                                   [X] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  基本信息                                                │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │                                                         │   │
│  │     ┌──────┐    昵称: [用户昵称        ] [修改]        │   │
│  │     │      │                                          │   │
│  │     │ 头像 │    邮箱: user@example.com                │   │
│  │     │      │                                          │   │
│  │     └──────┘    注册: 2025-02-24                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  我的收藏 (12)                        [全部查看 →]       │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │                                                         │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │
│  │  │ 脚本1   │  │ 脚本2   │  │ 脚本3   │  │ 脚本4   │   │   │
│  │  │ 10 个   │  │ 8 个    │  │ 15 个   │  │ 6 个    │   │   │
│  │  │ 分镜    │  │ 分镜    │  │ 分镜    │  │ 分镜    │   │   │
│  │  │ 2天前   │  │ 5天前   │  │ 1周前   │  │ 2周前   │   │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                        [退出登录]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 实现步骤

### Phase 1：基础认证（P0）

1. Supabase 项目创建与配置
2. 登录/注册页面
3. 认证状态管理
4. 路由守卫

### Phase 2：用户资料（P1）

1. profiles 表创建与 RLS 配置
2. 个人信息编辑
3. 头像上传

### Phase 3：脚本收藏（P0）

1. script_favorites 表创建与 RLS 配置
2. 收藏/取消收藏功能
3. 收藏列表页面
4. 从收藏加载脚本

---

## 7. 安全考虑

1. **RLS（行级安全）**：所有用户数据通过 RLS 保护
2. **JWT 验证**：Supabase 自动处理 Token 刷新
3. **HTTPS Only**：生产环境强制 HTTPS
4. **敏感数据**：API Key 等敏感信息不存入数据库
5. **CSRF 防护**：Supabase 内置 CSRF 保护

---

## 8. 成本估算

| 项目 | 免费额度 | 预估成本 |
|------|----------|----------|
| Supabase | 50,000 MAU | 0 元/月 |
| 数据库存储 | 500MB | 0 元/月 |
| 带宽 | 5GB | 0 元/月 |

初期完全免费，超出后按量付费。
