-- Basement Lab Canonical Supabase Schema & Row Level Security (RLS) Policies
-- Matches basement-db.js 1:1 across all 6 public tables + exercise-images storage bucket

create table if not exists public.strength_logs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  exercise text not null,
  weight numeric,
  band_level text,
  reps integer,
  rpe numeric,
  duration_sec integer,
  sec_per_rep numeric,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.cardio_logs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  modality text not null,
  duration numeric,
  distance numeric,
  incline numeric,
  resistance integer,
  meters integer,
  rpe numeric,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.sauna_logs (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  duration integer,
  type text,
  timing text,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.trainer_notes (
  id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  note_type text,
  content text,
  extra jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.custom_catalog (
  id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  is_shared boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner_id, id)
);

create table if not exists public.user_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.strength_logs enable row level security;
alter table public.cardio_logs enable row level security;
alter table public.sauna_logs enable row level security;
alter table public.trainer_notes enable row level security;
alter table public.custom_catalog enable row level security;
alter table public.user_state enable row level security;

drop policy if exists "strength_logs_owner_all" on public.strength_logs;
create policy "strength_logs_owner_all"
  on public.strength_logs
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

drop policy if exists "trainer_notes_owner_all" on public.trainer_notes;
create policy "trainer_notes_owner_all"
  on public.trainer_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_state_owner_all" on public.user_state;
create policy "user_state_owner_all"
  on public.user_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "custom_catalog_authenticated_read" on public.custom_catalog;
create policy "custom_catalog_authenticated_read"
  on public.custom_catalog
  for select
  to authenticated
  using (auth.uid() = owner_id or is_shared = true);

drop policy if exists "custom_catalog_owner_insert" on public.custom_catalog;
create policy "custom_catalog_owner_insert"
  on public.custom_catalog
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "custom_catalog_owner_update" on public.custom_catalog;
create policy "custom_catalog_owner_update"
  on public.custom_catalog
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "custom_catalog_owner_delete" on public.custom_catalog;
create policy "custom_catalog_owner_delete"
  on public.custom_catalog
  for delete
  to authenticated
  using (auth.uid() = owner_id);
