-- NeuroSprint Accounts & Profiles v1
-- Run this in the Supabase SQL editor before enabling cloud auth/sync in production.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_profiles (
  id text primary key,
  account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  role text not null,
  ownership_kind text not null default 'linked',
  sync_state text not null default 'synced',
  avatar_emoji text,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  last_activity timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_training_profiles_account_id
  on public.training_profiles(account_id);

create or replace function public.ensure_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_sync_table(table_name text)
returns void
language plpgsql
as $$
begin
  execute format(
    'create table if not exists public.%I (
      id text primary key,
      account_id uuid not null references public.accounts(id) on delete cascade,
      training_profile_id text not null references public.training_profiles(id) on delete cascade,
      payload jsonb not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )',
    table_name
  );

  execute format(
    'create index if not exists %I on public.%I(account_id, training_profile_id)',
    'idx_' || table_name || '_account_profile',
    table_name
  );

  execute format(
    'drop trigger if exists set_%I_updated_at on public.%I',
    table_name,
    table_name
  );

  execute format(
    'create trigger set_%I_updated_at
      before update on public.%I
      for each row
      execute function public.ensure_updated_at()',
    table_name,
    table_name
  );
end;
$$;

select public.create_sync_table('sessions');
select public.create_sync_table('user_mode_profiles');
select public.create_sync_table('user_preferences');
select public.create_sync_table('daily_trainings');
select public.create_sync_table('daily_training_sessions');
select public.create_sync_table('daily_challenges');
select public.create_sync_table('daily_challenge_attempts');
select public.create_sync_table('user_levels');
select public.create_sync_table('user_achievements');
select public.create_sync_table('user_skill_achievements');
select public.create_sync_table('xp_logs');

drop function if exists public.create_sync_table(text);

drop trigger if exists set_accounts_updated_at on public.accounts;
create trigger set_accounts_updated_at
  before update on public.accounts
  for each row
  execute function public.ensure_updated_at();

drop trigger if exists set_training_profiles_updated_at on public.training_profiles;
create trigger set_training_profiles_updated_at
  before update on public.training_profiles
  for each row
  execute function public.ensure_updated_at();

alter table public.accounts enable row level security;
alter table public.training_profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.user_mode_profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.daily_trainings enable row level security;
alter table public.daily_training_sessions enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.daily_challenge_attempts enable row level security;
alter table public.user_levels enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_skill_achievements enable row level security;
alter table public.xp_logs enable row level security;

drop policy if exists "accounts_owner_all" on public.accounts;
drop policy if exists "training_profiles_owner_all" on public.training_profiles;
drop policy if exists "sessions_owner_all" on public.sessions;
drop policy if exists "user_mode_profiles_owner_all" on public.user_mode_profiles;
drop policy if exists "user_preferences_owner_all" on public.user_preferences;
drop policy if exists "daily_trainings_owner_all" on public.daily_trainings;
drop policy if exists "daily_training_sessions_owner_all" on public.daily_training_sessions;
drop policy if exists "daily_challenges_owner_all" on public.daily_challenges;
drop policy if exists "daily_challenge_attempts_owner_all" on public.daily_challenge_attempts;
drop policy if exists "user_levels_owner_all" on public.user_levels;
drop policy if exists "user_achievements_owner_all" on public.user_achievements;
drop policy if exists "user_skill_achievements_owner_all" on public.user_skill_achievements;
drop policy if exists "xp_logs_owner_all" on public.xp_logs;

create policy "accounts_owner_all"
  on public.accounts
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "training_profiles_owner_all"
  on public.training_profiles
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "sessions_owner_all"
  on public.sessions
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "user_mode_profiles_owner_all"
  on public.user_mode_profiles
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "user_preferences_owner_all"
  on public.user_preferences
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "daily_trainings_owner_all"
  on public.daily_trainings
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "daily_training_sessions_owner_all"
  on public.daily_training_sessions
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "daily_challenges_owner_all"
  on public.daily_challenges
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "daily_challenge_attempts_owner_all"
  on public.daily_challenge_attempts
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "user_levels_owner_all"
  on public.user_levels
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "user_achievements_owner_all"
  on public.user_achievements
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "user_skill_achievements_owner_all"
  on public.user_skill_achievements
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);

create policy "xp_logs_owner_all"
  on public.xp_logs
  for all
  using (auth.uid() = account_id)
  with check (auth.uid() = account_id);
