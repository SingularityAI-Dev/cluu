-- 20260420000001_init_schema.sql
-- Phase 1 Plan 02: create the 5 data-model tables from design doc section 9
-- plus encounter_attempts (audit, used by Phase 2).
-- `auth.users` is Supabase-managed — DO NOT redefine it here.
-- RLS policies live in the next migration (20260420000002).

-- ============================================================================
-- Enums
-- ============================================================================
create type public.cluu_mood as enum ('stoked', 'content', 'sleepy', 'blue');
create type public.verdict_grade as enum ('pass', 'flair');
create type public.attempt_verdict as enum ('pass', 'flair', 'fail');
create type public.cosmetic_slot as enum ('head', 'body', 'back', 'eyes');
create type public.cosmetic_source as enum ('encounter_reward', 'dlc_pack', 'event');

-- ============================================================================
-- public.users — profile mirror of auth.users. Populated by trigger.
-- Design doc section 9 shows `users` with id/email/display_name/created_at/last_active_at;
-- we mirror what we actually need on the client side.
-- ============================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- Insert a public.users row whenever a new auth.users row is created
-- (covers both magic-link signups AND anonymous sign-ins).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ============================================================================
-- public.player_state — one row per user; created on first write.
-- `migration_processed` is Plan 03's idempotency flag for /api/migrate-anonymous (Pitfall 4).
-- ============================================================================
create table public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cluu_mood public.cluu_mood not null default 'content',
  cluu_cosmetics jsonb not null default '{"head": null, "body": null, "back": null, "eyes": null}'::jsonb,
  island_progress jsonb not null default '{}'::jsonb,
  unlocked_biomes text[] not null default array['meadow']::text[],
  migration_processed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Auto-create a player_state row alongside every new auth.users row.
create or replace function public.handle_new_player_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created_player_state
  after insert on auth.users
  for each row execute function public.handle_new_player_state();

-- ============================================================================
-- public.library_entries — Flair-rated prompts the user saved.
-- Phase 3 populates; Phase 1 just defines.
-- ============================================================================
create table public.library_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id text not null,
  prompt_text text not null,
  generated_response text not null,
  grade public.verdict_grade not null,
  tags text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);

create index library_entries_user_id_created_at_idx
  on public.library_entries (user_id, created_at desc);

-- ============================================================================
-- public.cosmetic_catalogue — readable by any authed user; writes are service-role only.
-- Phase 3 seeds this; Phase 1 just defines.
-- ============================================================================
create table public.cosmetic_catalogue (
  id text primary key,
  slot public.cosmetic_slot not null,
  name text not null,
  source public.cosmetic_source not null,
  sprite_path text not null,
  unlock_condition jsonb not null default '{}'::jsonb
);

-- ============================================================================
-- public.user_cosmetics — ownership; unique per (user, cosmetic).
-- ============================================================================
create table public.user_cosmetics (
  user_id uuid not null references auth.users(id) on delete cascade,
  cosmetic_id text not null references public.cosmetic_catalogue(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  acquisition_source text,
  primary key (user_id, cosmetic_id)
);

-- ============================================================================
-- public.encounter_attempts — audit log for Phase 2 grading gateway.
-- Phase 1 defines the shape; Phase 2 writes to it.
-- ============================================================================
create table public.encounter_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id text not null,
  verdict public.attempt_verdict not null,
  prompt_hash text not null,
  tokens_used int not null default 0,
  cached boolean not null default false,
  created_at timestamptz not null default now()
);

create index encounter_attempts_user_id_created_at_idx
  on public.encounter_attempts (user_id, created_at desc);
