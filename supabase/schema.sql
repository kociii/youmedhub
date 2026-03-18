-- YouMedHub / Supabase schema
-- 覆盖当前代码已依赖表：profiles、script_favorites
-- 预留 v0.2.5 计划表：generation_history、feature_feedback、release_announcements、user_announcement_reads
-- 注意：当前代码未使用 user_settings，因此本文件不创建该表

begin;

create extension if not exists pgcrypto;

-- =========================================================
-- 通用函数：自动维护 updated_at
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- profiles
-- 当前代码依赖：useProfile.ts
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '',
  avatar_url text not null default '',
  ui_locale text not null default 'zh-CN' check (ui_locale in ('zh-CN', 'en-US')),
  ai_locale text not null default 'zh-CN' check (ai_locale in ('zh-CN', 'en-US')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_ui_locale on public.profiles(ui_locale);
create index if not exists idx_profiles_ai_locale on public.profiles(ai_locale);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- 可选：新用户注册后自动创建 profile
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    nickname,
    avatar_url,
    ui_locale,
    ai_locale
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1),
      '用户'
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', ''),
    'zh-CN',
    'zh-CN'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- =========================================================
-- script_favorites
-- 当前代码依赖：useFavorites.ts
-- =========================================================
create table if not exists public.script_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  raw_markdown text not null default '',
  script_data jsonb not null default '[]'::jsonb,
  source_type text not null check (source_type in ('video', 'create', 'reference')),
  source_url text not null default '',
  source_video_duration integer not null default 0 check (source_video_duration >= 0),
  model_provider text not null default '',
  model_id text not null default '',
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  shot_count integer not null default 0 check (shot_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_favorites_user on public.script_favorites(user_id);
create index if not exists idx_favorites_created on public.script_favorites(created_at desc);
create index if not exists idx_favorites_source on public.script_favorites(user_id, source_type);

drop trigger if exists set_script_favorites_updated_at on public.script_favorites;
create trigger set_script_favorites_updated_at
before update on public.script_favorites
for each row
execute function public.set_updated_at();

alter table public.script_favorites enable row level security;

drop policy if exists "Users can view own favorites" on public.script_favorites;
create policy "Users can view own favorites"
on public.script_favorites
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own favorites" on public.script_favorites;
create policy "Users can insert own favorites"
on public.script_favorites
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own favorites" on public.script_favorites;
create policy "Users can update own favorites"
on public.script_favorites
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.script_favorites;
create policy "Users can delete own favorites"
on public.script_favorites
for delete
using (auth.uid() = user_id);

-- =========================================================
-- generation_history
-- v0.2.5 预留：历史记录
-- =========================================================
create table if not exists public.generation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('analyze', 'create', 'reference')),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  title text not null default '',
  input_summary text not null default '',
  prompt_text text not null default '',
  ui_locale text not null default 'zh-CN' check (ui_locale in ('zh-CN', 'en-US')),
  ai_locale text not null default 'zh-CN' check (ai_locale in ('zh-CN', 'en-US')),
  model_provider text not null default 'aliyun',
  model_id text not null default '',
  raw_markdown text not null default '',
  script_data jsonb not null default '[]'::jsonb,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  error_message text not null default '',
  source_file_name text not null default '',
  source_file_type text not null default '',
  source_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_generation_history_user on public.generation_history(user_id);
create index if not exists idx_generation_history_user_created on public.generation_history(user_id, created_at desc);
create index if not exists idx_generation_history_user_mode on public.generation_history(user_id, mode);
create index if not exists idx_generation_history_user_status on public.generation_history(user_id, status);

drop trigger if exists set_generation_history_updated_at on public.generation_history;
create trigger set_generation_history_updated_at
before update on public.generation_history
for each row
execute function public.set_updated_at();

alter table public.generation_history enable row level security;

drop policy if exists "Users can view own generation history" on public.generation_history;
create policy "Users can view own generation history"
on public.generation_history
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own generation history" on public.generation_history;
create policy "Users can insert own generation history"
on public.generation_history
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own generation history" on public.generation_history;
create policy "Users can update own generation history"
on public.generation_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own generation history" on public.generation_history;
create policy "Users can delete own generation history"
on public.generation_history
for delete
using (auth.uid() = user_id);

-- =========================================================
-- feature_feedback
-- v0.2.5 预留：功能反馈
-- =========================================================
create table if not exists public.feature_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feedback_type text not null check (feedback_type in ('feature', 'bug', 'idea')),
  title text not null,
  content text not null,
  expected_result text not null default '',
  contact text not null default '',
  locale text not null default 'zh-CN' check (locale in ('zh-CN', 'en-US')),
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'accepted', 'completed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_feature_feedback_user on public.feature_feedback(user_id);
create index if not exists idx_feature_feedback_status on public.feature_feedback(status);
create index if not exists idx_feature_feedback_created on public.feature_feedback(created_at desc);

drop trigger if exists set_feature_feedback_updated_at on public.feature_feedback;
create trigger set_feature_feedback_updated_at
before update on public.feature_feedback
for each row
execute function public.set_updated_at();

alter table public.feature_feedback enable row level security;

drop policy if exists "Users can view own feedback" on public.feature_feedback;
create policy "Users can view own feedback"
on public.feature_feedback
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own feedback" on public.feature_feedback;
create policy "Users can insert own feedback"
on public.feature_feedback
for insert
with check (auth.uid() = user_id);

-- 默认不开放用户更新/删除自己的反馈，避免状态和审理记录被客户端随意修改
-- 如果后续要支持匿名反馈，可单独放开 insert policy，并配合频率限制/验证码。

-- =========================================================
-- release_announcements
-- v0.2.5 预留：更新公告
-- =========================================================
create table if not exists public.release_announcements (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  locale text not null default 'zh-CN' check (locale in ('zh-CN', 'en-US')),
  title text not null,
  summary text not null,
  content_md text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_release_announcements_status on public.release_announcements(status);
create index if not exists idx_release_announcements_locale on public.release_announcements(locale);
create index if not exists idx_release_announcements_published_at on public.release_announcements(published_at desc);

drop trigger if exists set_release_announcements_updated_at on public.release_announcements;
create trigger set_release_announcements_updated_at
before update on public.release_announcements
for each row
execute function public.set_updated_at();

alter table public.release_announcements enable row level security;

drop policy if exists "Public can view published announcements" on public.release_announcements;
create policy "Public can view published announcements"
on public.release_announcements
for select
using (status = 'published');

-- =========================================================
-- user_announcement_reads
-- v0.2.5 预留：公告已读状态
-- =========================================================
create table if not exists public.user_announcement_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.release_announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, announcement_id)
);

create index if not exists idx_user_announcement_reads_user on public.user_announcement_reads(user_id);
create index if not exists idx_user_announcement_reads_announcement on public.user_announcement_reads(announcement_id);

alter table public.user_announcement_reads enable row level security;

drop policy if exists "Users can view own announcement reads" on public.user_announcement_reads;
create policy "Users can view own announcement reads"
on public.user_announcement_reads
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own announcement reads" on public.user_announcement_reads;
create policy "Users can insert own announcement reads"
on public.user_announcement_reads
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own announcement reads" on public.user_announcement_reads;
create policy "Users can delete own announcement reads"
on public.user_announcement_reads
for delete
using (auth.uid() = user_id);

commit;
