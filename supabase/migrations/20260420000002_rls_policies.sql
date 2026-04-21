-- 20260420000002_rls_policies.sql
-- Phase 1 Plan 02: RLS on every user-data table keyed to auth.uid() (D-18, PERS-02).
-- Negative-test gate: tests/rls-negative.test.ts proves user A cannot read user B's player_state.

-- ============================================================================
-- public.users
-- ============================================================================
alter table public.users enable row level security;

create policy "users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy — rows are created by the trigger, not client writes.

-- ============================================================================
-- public.player_state
-- ============================================================================
alter table public.player_state enable row level security;

create policy "player_state read own"
  on public.player_state for select
  using (auth.uid() = user_id);

create policy "player_state update own"
  on public.player_state for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert — trigger handles it. No delete — cascade from auth.users handles it.

-- ============================================================================
-- public.library_entries
-- ============================================================================
alter table public.library_entries enable row level security;

create policy "library_entries read own"
  on public.library_entries for select
  using (auth.uid() = user_id);

create policy "library_entries insert own"
  on public.library_entries for insert
  with check (auth.uid() = user_id);

create policy "library_entries update own"
  on public.library_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "library_entries delete own"
  on public.library_entries for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- public.cosmetic_catalogue — catalog is readable by anyone authed; no client writes.
-- ============================================================================
alter table public.cosmetic_catalogue enable row level security;

create policy "cosmetic_catalogue read all authed"
  on public.cosmetic_catalogue for select
  using (auth.uid() is not null);

-- No insert/update/delete policies — only service role can mutate.

-- ============================================================================
-- public.user_cosmetics
-- ============================================================================
alter table public.user_cosmetics enable row level security;

create policy "user_cosmetics read own"
  on public.user_cosmetics for select
  using (auth.uid() = user_id);

create policy "user_cosmetics insert own"
  on public.user_cosmetics for insert
  with check (auth.uid() = user_id);

-- No update — cosmetics are immutable once granted (PERS-04).
-- No delete policy — regressions blocked at the RLS layer (COS-03 "permanent once earned").

-- ============================================================================
-- public.encounter_attempts — append-only audit; user can read their own history.
-- ============================================================================
alter table public.encounter_attempts enable row level security;

create policy "encounter_attempts read own"
  on public.encounter_attempts for select
  using (auth.uid() = user_id);

-- No insert policy — Phase 2's grading gateway uses the service role key server-side.
-- No update/delete — audit is append-only.
