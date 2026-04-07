-- YouMedHub / Project 0.3.x schema
-- 说明：
-- 1. “项目”是独立功能板块
-- 2. 项目画布以 /projects/:id 全屏打开
-- 3. 实际文件统一存阿里云 OSS
-- 4. Supabase 只保存项目、快照、OSS 文件元数据
-- 5. 支持后续项目公开分享

begin;

create extension if not exists pgcrypto;

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
-- projects
-- 项目主表
-- =========================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  source_type text not null default 'manual'
    check (source_type in ('manual', 'analyze', 'create', 'reference')),
  source_ref_id text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'active', 'archived')),
  storage_provider text not null default 'aliyun-oss',
  thumbnail_url text not null default '',
  current_snapshot_version integer not null default 0 check (current_snapshot_version >= 0),
  node_count integer not null default 0 check (node_count >= 0),
  asset_count integer not null default 0 check (asset_count >= 0),
  project_meta jsonb not null default '{}'::jsonb,
  last_opened_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_projects_user_updated on public.projects(user_id, updated_at desc);
create index if not exists idx_projects_user_status on public.projects(user_id, status);
create index if not exists idx_projects_user_source on public.projects(user_id, source_type);

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;

drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects"
on public.projects
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own projects" on public.projects;
create policy "Users can insert own projects"
on public.projects
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
on public.projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
on public.projects
for delete
using (auth.uid() = user_id);

-- =========================================================
-- project_snapshots
-- 项目画布快照
-- version=1 通常用于“从脚本拆解/创作首次导入”的初始快照
-- =========================================================
create table if not exists public.project_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot_type text not null default 'manual_save'
    check (snapshot_type in ('initial_import', 'autosave', 'manual_save', 'published')),
  title text not null default '',
  canvas_state jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  node_count integer not null default 0 check (node_count >= 0),
  asset_count integer not null default 0 check (asset_count >= 0),
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create index if not exists idx_project_snapshots_project on public.project_snapshots(project_id);
create index if not exists idx_project_snapshots_user_created on public.project_snapshots(user_id, created_at desc);
create index if not exists idx_project_snapshots_project_created on public.project_snapshots(project_id, created_at desc);

alter table public.project_snapshots enable row level security;

drop policy if exists "Users can view own project snapshots" on public.project_snapshots;
create policy "Users can view own project snapshots"
on public.project_snapshots
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project snapshots" on public.project_snapshots;
create policy "Users can insert own project snapshots"
on public.project_snapshots
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project snapshots" on public.project_snapshots;
create policy "Users can update own project snapshots"
on public.project_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project snapshots" on public.project_snapshots;
create policy "Users can delete own project snapshots"
on public.project_snapshots
for delete
using (auth.uid() = user_id);

-- =========================================================
-- project_assets
-- 文件元数据表，真实文件统一存阿里云 OSS
-- =========================================================
create table if not exists public.project_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  snapshot_id uuid references public.project_snapshots(id) on delete set null,
  asset_type text not null
    check (asset_type in ('image', 'video', 'audio', 'thumbnail', 'attachment')),
  source_type text not null default 'upload'
    check (source_type in ('upload', 'ai_generated', 'imported')),
  provider text not null default 'aliyun-oss',
  bucket text not null,
  region text not null default '',
  object_key text not null,
  oss_url text not null default '',
  public_url text not null default '',
  file_name text not null default '',
  mime_type text not null default '',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  width integer not null default 0 check (width >= 0),
  height integer not null default 0 check (height >= 0),
  duration_ms bigint not null default 0 check (duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, bucket, object_key)
);

create index if not exists idx_project_assets_user on public.project_assets(user_id);
create index if not exists idx_project_assets_project on public.project_assets(project_id);
create index if not exists idx_project_assets_snapshot on public.project_assets(snapshot_id);
create index if not exists idx_project_assets_type on public.project_assets(asset_type);
create index if not exists idx_project_assets_source on public.project_assets(source_type);

drop trigger if exists set_project_assets_updated_at on public.project_assets;
create trigger set_project_assets_updated_at
before update on public.project_assets
for each row
execute function public.set_updated_at();

alter table public.project_assets enable row level security;

drop policy if exists "Users can view own project assets" on public.project_assets;
create policy "Users can view own project assets"
on public.project_assets
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project assets" on public.project_assets;
create policy "Users can insert own project assets"
on public.project_assets
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project assets" on public.project_assets;
create policy "Users can update own project assets"
on public.project_assets
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project assets" on public.project_assets;
create policy "Users can delete own project assets"
on public.project_assets
for delete
using (auth.uid() = user_id);

-- =========================================================
-- project_shares
-- 项目公开分享表
-- 公开页优先读取本表，不直接暴露私有编辑表
-- =========================================================
create table if not exists public.project_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  snapshot_id uuid references public.project_snapshots(id) on delete set null,
  share_token text not null unique,
  title text not null default '',
  summary text not null default '',
  visibility text not null default 'public'
    check (visibility in ('public', 'unlisted')),
  is_enabled boolean not null default true,
  allow_duplicate boolean not null default false,
  expires_at timestamptz,
  share_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_shares_user on public.project_shares(user_id);
create index if not exists idx_project_shares_project on public.project_shares(project_id);
create index if not exists idx_project_shares_token on public.project_shares(share_token);
create index if not exists idx_project_shares_enabled on public.project_shares(is_enabled);

drop trigger if exists set_project_shares_updated_at on public.project_shares;
create trigger set_project_shares_updated_at
before update on public.project_shares
for each row
execute function public.set_updated_at();

alter table public.project_shares enable row level security;

drop policy if exists "Users can view own project shares" on public.project_shares;
create policy "Users can view own project shares"
on public.project_shares
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own project shares" on public.project_shares;
create policy "Users can insert own project shares"
on public.project_shares
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own project shares" on public.project_shares;
create policy "Users can update own project shares"
on public.project_shares
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own project shares" on public.project_shares;
create policy "Users can delete own project shares"
on public.project_shares
for delete
using (auth.uid() = user_id);

drop policy if exists "Public can view enabled project shares" on public.project_shares;
create policy "Public can view enabled project shares"
on public.project_shares
for select
using (
  is_enabled = true
  and (expires_at is null or expires_at > now())
);

commit;
