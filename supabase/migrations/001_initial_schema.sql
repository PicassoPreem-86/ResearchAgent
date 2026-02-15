-- ============================================================
-- ResearchAgent: Initial schema
-- ============================================================

-- Reports table
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  domain text not null,
  report_data jsonb not null,
  template text not null default 'general',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_reports_user_id on public.reports(user_id);
create index idx_reports_domain on public.reports(domain);
create unique index idx_reports_user_domain on public.reports(user_id, domain);

alter table public.reports enable row level security;
create policy "Users can read own reports" on public.reports for select using (auth.uid() = user_id);
create policy "Users can insert own reports" on public.reports for insert with check (auth.uid() = user_id);
create policy "Users can update own reports" on public.reports for update using (auth.uid() = user_id);
create policy "Users can delete own reports" on public.reports for delete using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reports_updated_at
  before update on public.reports
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Workspaces
-- ============================================================

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now() not null
);

create index idx_workspaces_user_id on public.workspaces(user_id);

alter table public.workspaces enable row level security;
create policy "Users can read own workspaces" on public.workspaces for select using (auth.uid() = user_id);
create policy "Users can insert own workspaces" on public.workspaces for insert with check (auth.uid() = user_id);
create policy "Users can update own workspaces" on public.workspaces for update using (auth.uid() = user_id);
create policy "Users can delete own workspaces" on public.workspaces for delete using (auth.uid() = user_id);

-- ============================================================
-- Workspace-Report junction
-- ============================================================

create table public.workspace_reports (
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  report_id uuid references public.reports(id) on delete cascade not null,
  added_at timestamptz default now() not null,
  primary key (workspace_id, report_id)
);

alter table public.workspace_reports enable row level security;
create policy "Users can read own workspace reports" on public.workspace_reports
  for select using (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
  );
create policy "Users can insert own workspace reports" on public.workspace_reports
  for insert with check (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
  );
create policy "Users can delete own workspace reports" on public.workspace_reports
  for delete using (
    exists (select 1 from public.workspaces w where w.id = workspace_id and w.user_id = auth.uid())
  );

-- ============================================================
-- Comparisons
-- ============================================================

create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  domains text[] not null,
  comparison_data jsonb not null,
  created_at timestamptz default now() not null
);

create index idx_comparisons_user_id on public.comparisons(user_id);

alter table public.comparisons enable row level security;
create policy "Users can read own comparisons" on public.comparisons for select using (auth.uid() = user_id);
create policy "Users can insert own comparisons" on public.comparisons for insert with check (auth.uid() = user_id);
create policy "Users can update own comparisons" on public.comparisons for update using (auth.uid() = user_id);
create policy "Users can delete own comparisons" on public.comparisons for delete using (auth.uid() = user_id);

-- ============================================================
-- ICP profiles
-- ============================================================

create table public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icp_data jsonb not null,
  is_default boolean default false not null,
  created_at timestamptz default now() not null
);

create index idx_icp_profiles_user_id on public.icp_profiles(user_id);

alter table public.icp_profiles enable row level security;
create policy "Users can read own icp profiles" on public.icp_profiles for select using (auth.uid() = user_id);
create policy "Users can insert own icp profiles" on public.icp_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own icp profiles" on public.icp_profiles for update using (auth.uid() = user_id);
create policy "Users can delete own icp profiles" on public.icp_profiles for delete using (auth.uid() = user_id);

-- ============================================================
-- Usage events
-- ============================================================

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  event_type text not null,
  domain text,
  tokens_used integer default 0 not null,
  created_at timestamptz default now() not null
);

create index idx_usage_events_user_id on public.usage_events(user_id);
create index idx_usage_events_created_at on public.usage_events(created_at);

alter table public.usage_events enable row level security;
create policy "Users can read own usage events" on public.usage_events for select using (auth.uid() = user_id);
create policy "Users can insert own usage events" on public.usage_events for insert with check (auth.uid() = user_id);
