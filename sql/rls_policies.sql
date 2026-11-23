-- Basement Lab Supabase Schema & Row Level Security (RLS) Policies
create table if not exists public.coach_contexts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  entry jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.cardio_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  entry jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sauna_logs (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  entry jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_catalog (
  exercise_key text primary key,
  owner_user_id uuid references auth.users(id) on delete set null,
  item jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.coach_contexts enable row level security;
alter table public.workout_logs enable row level security;
alter table public.cardio_logs enable row level security;
alter table public.sauna_logs enable row level security;
alter table public.custom_catalog enable row level security;

drop policy if exists "coach_contexts_owner_all" on public.coach_contexts;
create policy "coach_contexts_owner_all"
  on public.coach_contexts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workout_logs_owner_all" on public.workout_logs;
create policy "workout_logs_owner_all"
  on public.workout_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cardio_logs_owner_all" on public.cardio_logs;
create policy "cardio_logs_owner_all"
  on public.cardio_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sauna_logs_owner_all" on public.sauna_logs;
create policy "sauna_logs_owner_all"
  on public.sauna_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "custom_catalog_authenticated_read" on public.custom_catalog;
create policy "custom_catalog_authenticated_read"
  on public.custom_catalog
  for select
  to authenticated
  using (true);

drop policy if exists "custom_catalog_authenticated_insert" on public.custom_catalog;
create policy "custom_catalog_authenticated_insert"
  on public.custom_catalog
  for insert
  to authenticated
  with check (auth.uid() = owner_user_id);

drop policy if exists "custom_catalog_authenticated_update" on public.custom_catalog;
create policy "custom_catalog_authenticated_update"
  on public.custom_catalog
  for update
  to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);
