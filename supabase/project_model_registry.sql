-- YouMedHub / Project AI 模型注册表
-- 用途：
-- 1) 系统方统一配置可选模型
-- 2) 前端按 category + is_enabled 过滤展示
-- 3) 模型下线后仍保留历史记录（不删除历史数据）

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
-- project_ai_model_registry
-- 项目画布 AI 模型注册表
-- =========================================================
create table if not exists public.project_ai_model_registry (
  id uuid primary key default gen_random_uuid(),
  model_id text not null unique,
  model_name text not null,
  provider text not null default 'aliyun-bailian'
    check (provider in ('aliyun-bailian')),
  category text not null
    check (category in ('text', 'image', 'video')),
  is_enabled boolean not null default true,
  is_deprecated boolean not null default false,
  sort_order integer not null default 100,
  description text not null default '',
  model_meta jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_ai_model_registry_category_enabled
  on public.project_ai_model_registry(category, is_enabled, sort_order, created_at desc);

create index if not exists idx_project_ai_model_registry_enabled
  on public.project_ai_model_registry(is_enabled);

drop trigger if exists set_project_ai_model_registry_updated_at on public.project_ai_model_registry;
create trigger set_project_ai_model_registry_updated_at
before update on public.project_ai_model_registry
for each row
execute function public.set_updated_at();

alter table public.project_ai_model_registry enable row level security;

-- 读策略：
-- 1) 登录用户可读取全部模型（用于历史模型显示）
-- 2) 匿名用户仅可读取启用模型（如未来公开页面需要）
drop policy if exists "Authenticated can read all ai models" on public.project_ai_model_registry;
create policy "Authenticated can read all ai models"
on public.project_ai_model_registry
for select
to authenticated
using (true);

drop policy if exists "Anon can read enabled ai models" on public.project_ai_model_registry;
create policy "Anon can read enabled ai models"
on public.project_ai_model_registry
for select
to anon
using (is_enabled = true);

-- 写策略：
-- 默认不向普通登录用户开放写入，建议仅通过 service role / 后台管理端维护
drop policy if exists "Authenticated can insert ai models" on public.project_ai_model_registry;
drop policy if exists "Authenticated can update ai models" on public.project_ai_model_registry;
drop policy if exists "Authenticated can delete ai models" on public.project_ai_model_registry;

-- 初始数据（可按需调整）
insert into public.project_ai_model_registry (
  model_id,
  model_name,
  provider,
  category,
  is_enabled,
  sort_order,
  description
)
values
  ('qwen3.5-flash', 'Qwen3.5 Flash', 'aliyun-bailian', 'text', true, 10, '通义千问 3.5 快速版（文本）'),
  ('qwen3.5-plus', 'Qwen3.5 Plus', 'aliyun-bailian', 'text', true, 20, '通义千问 3.5 增强版（文本）'),
  ('wanx2.1-imagegen', 'Wanx 2.1 Image', 'aliyun-bailian', 'image', false, 30, '图片生成模型（示例，默认关闭）'),
  ('wanx2.1-videogen', 'Wanx 2.1 Video', 'aliyun-bailian', 'video', false, 40, '视频生成模型（示例，默认关闭）')
on conflict (model_id) do update
set
  model_name = excluded.model_name,
  provider = excluded.provider,
  category = excluded.category,
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  description = excluded.description,
  updated_at = now();

commit;

