# Supabase 配置指南

> 本文档将指导你完成 v0.2.2 版本所需的 Supabase 配置。请按顺序执行每个步骤。

## 目录

1. [创建项目](#1-创建项目)
2. [数据库配置](#2-数据库配置)
3. [认证配置](#3-认证配置)
4. [安全配置](#4-安全配置)
5. [环境变量](#5-环境变量)
6. [测试验证](#6-测试验证)

---

## 1. 创建项目

### 1.1 注册/登录

1. 访问 [Supabase 官网](https://supabase.com)
2. 点击「Start your project」注册账号（支持 GitHub 登录）
3. 顫录后进入 Dashboard

### 1.2 创建新项目

1. 点击「New Project」
2. 填写项目信息：

| 字段 | 值 |
|------|-----|
| Name | `youmedhub` |
| Database Password | **自行设置强密码，记录下来** |
| Region | `Southeast Asia (Singapore)` - 推荐选择离中国较近的区域 |
| Pricing Plan | `Free` - 免费版足够开发使用 |

3. 等待项目创建完成（约 2-3 分钟）

### 1.3 获取项目信息

创建完成后，进入 `Settings` → `API`：

| 信息 | 说明 | 示例 |
|------|------|------|
| Project URL | 项目 API 地址 | `https://xxx.supabase.co` |
| anon public | 匿名访问密钥（公开） | `eyJhbGciOiJIUzI1NiIs...` |
| service_role | 服务端密钥（保密） | `eyJhbGciOiJIUzI1NiIs...` |

> ⚠️ `service_role` 密钥不要暴露给前端，仅用于服务端或初始化脚本。

---

## 2. 数据库配置

### 2.1 打开 SQL Editor

1. 进入项目 Dashboard
2. 左侧菜单点击 `SQL Editor`
3. 点击 `New query` 创建新查询

### 2.2 执行建表 SQL

复制以下 SQL 到编辑器，点击 `Run` 执行：

```sql
-- =====================================================
-- 1. 用户资料扩展表
-- =====================================================
-- 扩展 Supabase auth.users 表，存储用户基本信息

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.profiles IS '用户资料扩展表';
COMMENT ON COLUMN public.profiles.id IS '用户 ID，关联 auth.users';
COMMENT ON COLUMN public.profiles.nickname IS '用户昵称';
COMMENT ON COLUMN public.profiles.avatar_url IS '头像 URL';

-- =====================================================
-- 2. 用户设置表
-- =====================================================
-- 存储用户的 API Key 配置（阿里百炼、火山引擎）

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  dashscope_api_key TEXT DEFAULT '',
  ark_api_key TEXT DEFAULT '',
  default_model TEXT DEFAULT 'qwen3-vl-flash'
    CHECK (default_model IN ('qwen3-vl-flash', 'qwen3-vl-plus', 'doubao-seed-2')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.user_settings IS '用户设置表';
COMMENT ON COLUMN public.user_settings.dashscope_api_key IS '阿里百炼 API Key';
COMMENT ON COLUMN public.user_settings.ark_api_key IS '火山引擎 ARK API Key';
COMMENT ON COLUMN public.user_settings.default_model IS '默认使用的模型';

-- =====================================================
-- 3. 脚本收藏表
-- =====================================================
-- 存储用户收藏的视频脚本（包含 AI 原始返回和解析后数据）

CREATE TABLE IF NOT EXISTS public.script_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  raw_markdown TEXT NOT NULL DEFAULT '',
  script_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL CHECK (source_type IN ('video', 'create', 'reference')),
  source_url TEXT DEFAULT '',
  source_video_duration INTEGER DEFAULT 0,
  model_provider TEXT DEFAULT '',
  model_id TEXT DEFAULT '',
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  shot_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.script_favorites IS '脚本收藏表';
COMMENT ON COLUMN public.script_favorites.raw_markdown IS 'AI 原始返回的 Markdown 内容';
COMMENT ON COLUMN public.script_favorites.script_data IS '解析后的分镜 JSON 数组';
COMMENT ON COLUMN public.script_favorites.source_type IS '来源类型';
COMMENT ON COLUMN public.script_favorites.model_provider IS '模型提供商';

-- =====================================================
-- 4. 创建索引
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_script_favorites_user_id ON public.script_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_script_favorites_created_at ON public.script_favorites(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_favorites_source_type ON public.script_favorites(user_id, source_type);

-- =====================================================
-- 5. 自动更新 updated_at 字段
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles 表触发器
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- user_settings 表触发器
DROP TRIGGER IF EXISTS set_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER set_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- script_favorites 表触发器
DROP TRIGGER IF EXISTS set_script_favorites_updated_at ON public.script_favorites;
CREATE TRIGGER set_script_favorites_updated_at
  BEFORE UPDATE ON public.script_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 6. 用户注册时自动创建 profile 和 settings
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 用户注册时触发（先删除已存在的触发器）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2.3 验证表创建成功

执行以下 SQL 验证：

```sql
-- 查看创建的表
SELECT table_name,
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables
WHERE table_schema = 'public';
```

---

## 3. 认证配置

### 3.1 启用邮箱认证

1. 进入 `Authentication` → `Providers`
2. 确保 `Email` 已启用
3. 配置 Email 设置：

| 设置 | 值 |
|------|-----|
| Enable Email Confirmations | ✅ 开启 |
| Secure Email Change | ✅ 开启 |
| Secure Email Change | ✅ 开启 |

### 3.2 配置 GitHub OAuth（可选但推荐）

#### 步骤 1：创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 `OAuth Apps` → `New OAuth App`
3. 填写信息：

| 字段 | 值 |
|------|-----|
| Application name | `YouMedHub` |
| Homepage URL | `https://www.youmedhub.com` |
| Authorization callback URL | 见下方 |

**回调 URL（支持多环境）：**
```
http://localhost:5173/auth/v1/callback
https://www.youmedhub.com/auth/v1/callback
```

> 💡 GitHub OAuth App 支持配置多个回调 URL，生产和开发环境可共用同一个 App。

4. 点击 `Register application`
5. 记录 `Client ID` 和 `Client Secret`

#### 步骤 2：在 Supabase 配置 GitHub

1. 进入 `Authentication` → `Providers`
2. 找到 `GitHub`，点击启用
3. 填写从 GitHub 获取的 `Client ID` 和 `Client Secret`
4. 点击 `Save`

#### 步骤 3：配置 Supabase URL 白名单

1. 进入 `Authentication` → `URL Configuration`
2. 配置 `Site URL`（生产环境）：

| 环境 | 值 |
|------|-----|
| 生产 | `https://www.youmedhub.com` |

3. 配置 `Redirect URLs`（允许列表）：

```
http://localhost:5173/**
https://www.youmedhub.com/**
```

> ⚠️ Supabase 的 Site URL 是全局的，不支持按环境切换。开发时本地调试 OAuth 会跳转到生产地址，但登录后可以手动切回本地测试。

### 3.3 配置邮件模板（可选）

1. 进入 `Authentication` → `Email Templates`
2. 可自定义：
   - 确认邮件
   - 魔法链接邮件
   - 重置密码邮件
   - 邀请邮件

---

## 4. 安全配置

### 4.1 配置 RLS（行级安全）

在 SQL Editor 中执行：

```sql
-- =====================================================
-- 1. 启用 RLS（行级安全）
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_favorites ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. profiles 表 RLS 策略
-- =====================================================

-- 用户只能查看自己的资料
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- 用户只能更新自己的资料
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- 用户只能插入自己的资料（通常由触发器自动创建）
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- 3. user_settings 表 RLS 策略
-- =====================================================
-- API Key 等敏感数据，严格控制访问权限

-- 用户只能查看自己的设置
CREATE POLICY "Users can view own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能更新自己的设置
CREATE POLICY "Users can update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 用户只能插入自己的设置（通常由触发器自动创建）
CREATE POLICY "Users can insert own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 4. script_favorites 表 RLS 策略
-- =====================================================

-- 用户只能查看自己的收藏
CREATE POLICY "Users can view own favorites"
  ON public.script_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- 用户只能插入自己的收藏
CREATE POLICY "Users can insert own favorites"
  ON public.script_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的收藏
CREATE POLICY "Users can update own favorites"
  ON public.script_favorites
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 用户只能删除自己的收藏
CREATE POLICY "Users can delete own favorites"
  ON public.script_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. 验证 RLS 配置
-- =====================================================

-- 查看所有表的 RLS 策略
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 验证 RLS 是否启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### 4.2 配置 URL 白名单

1. 进入 `Authentication` → `URL Configuration`
2. 配置 `Site URL`：

| 环境 | 值 |
|------|-----|
| 开发 | `http://localhost:5173` |
| 生产 | `https://your-domain.vercel.app` |

3. 配置 `Redirect URLs`：

```
# 开发环境
http://localhost:5173/**
http://localhost:5173/auth/v1/callback

# 生产环境（替换 your-domain）
https://your-domain.vercel.app/**
https://your-domain.vercel.app/auth/v1/callback
```

### 4.3 配置 JWT 设置（可选）

1. 进入 `Authentication` → `URL Configuration`
2. 可调整 JWT 过期时间（默认 3600 秒）

---

## 5. 环境变量

### 5.1 本地开发环境

创建 `.env` 文件（从 `.env.example` 复制）：

```env
# Supabase（必填）
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 阿里云 OSS（已有）
VITE_ALIYUN_ACCESS_KEY_ID=your_key
VITE_ALIYUN_ACCESS_KEY_SECRET=your_secret
VITE_ALIYUN_OSS_REGION=oss-cn-hangzhou
VITE_ALIYUN_OSS_BUCKET=your-bucket
```

### 5.2 Vercel 生产环境

在 Vercel Dashboard → 项目 → Settings → Environment Variables：

| 变量名 | 值 |
|--------|-----|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |

---

## 6. 测试验证

### 6.1 SQL 测试

在 SQL Editor 中执行以下测试 SQL：

```sql
-- 测试 profiles 表（需要先有用户）
-- 注意：先注册一个测试用户再执行
SELECT * FROM public.profiles LIMIT 5;

-- 测试 script_favorites 表结构
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'script_favorites'
ORDER BY ordinal_position;

-- 测试 RLS 策略数量（应该是 7 个：profiles 3个 + script_favorites 4个）
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('profiles', 'script_favorites');
```

### 6.2 前端连接测试

在项目中创建测试文件验证连接：

```typescript
// test-supabase.ts（临时测试文件，测试后删除）
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

async function testConnection() {
  // 测试数据库连接
  const { data, error } = await supabase.from('profiles').select('id').limit(1)

  if (error) {
    console.error('连接失败:', error)
  } else {
    console.log('连接成功:', data)
  }

  // 测试认证状态
  const { data: { session }, error: authError } = await supabase.auth.getSession()

  if (authError) {
    console.log('未登录（正常）')
  } else {
    console.log('当前会话:', session)
  }
}

testConnection()
```

### 6.3 功能验证清单

- [ ] 项目创建成功，项目 URL 和 Anon Key 已获取
- [ ] `profiles` 表创建成功
- [ ] `script_favorites` 表创建成功
- [ ] 索引创建成功
- [ ] RLS 策略配置成功
- [ ] Email 认证启用
- [ ] GitHub OAuth 配置成功（可选）
- [ ] URL 白名单配置成功
- [ ] 本地 `.env` 配置完成
- [ ] Vercel 环境变量配置完成
- [ ] 前端连接测试通过

---

## 7. 常见问题

### Q1: RLS 策略不生效？

确保已执行 `ENABLE ROW LEVEL SECURITY`：

```sql
-- 检查 RLS 是否启用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

### Q2: GitHub OAuth 登录失败？

检查：
1. GitHub OAuth App 的回调 URL 是否正确
2. Supabase 中的 Client ID/Secret 是否正确
3. Site URL 是否配置

### Q3: 邮件发送失败？

1. 检查 Supabase 项目是否已暂停（免费版有限制）
2. 开发阶段查看 `Inbucket`（本地邮件测试工具）
3. 生产环境需要配置 SMTP（设置 → Authentication → SMTP）

### Q4: 前端报错 "Invalid API key"？

检查：
1. 环境变量是否正确设置
2. 使用的是 `anon` key 而非 `service_role` key
3. 环境变量是否正确加载（重启开发服务器）

---

## 8. 参考链接

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Auth 指南](https://supabase.com/docs/guides/auth)
- [RLS 详解](https://supabase.com/docs/guides/auth/row-level-security)
- [GitHub OAuth 配置](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [环境变量配置](https://supabase.com/docs/guides/local-development#env-variables)
