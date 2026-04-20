---
phase: 01-scaffold
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - supabase/migrations/20260420000001_init_schema.sql
  - supabase/migrations/20260420000002_rls_policies.sql
  - supabase/seed.sql
  - supabase/config.toml
  - supabase/tests/rls-negative.test.ts
  - lib/supabase/server.ts
  - lib/supabase/client.ts
  - lib/supabase/middleware.ts
  - lib/supabase/types.ts
  - middleware.ts
  - app/auth/callback/route.ts
  - app/auth/signin/page.tsx
  - app/auth/signin/SignInForm.tsx
  - app/auth/actions.ts
  - .env.example
autonomous: true
requirements:
  - AUTH-02
  - AUTH-04
  - PERS-02
user_setup:
  - service: supabase
    why: "Auth (magic-link + anonymous sign-ins) + Postgres with RLS for player_state, library_entries, users, cosmetic_catalogue, user_cosmetics"
    env_vars:
      - name: NEXT_PUBLIC_SUPABASE_URL
        source: "Supabase Dashboard -> Project Settings -> API"
      - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
        source: "Supabase Dashboard -> Project Settings -> API"
      - name: SUPABASE_SERVICE_ROLE_KEY
        source: "Supabase Dashboard -> Project Settings -> API (service_role key — server only, never expose)"
    dashboard_config:
      - task: "Enable Anonymous Sign-ins"
        location: "Supabase Dashboard -> Authentication -> Providers -> Anonymous Sign-ins (toggle ON) — required by D-04"
      - task: "Enable Email provider with Magic Link"
        location: "Supabase Dashboard -> Authentication -> Providers -> Email -> 'Enable Email provider' ON, 'Confirm email' ON, 'Secure email change' ON"
      - task: "Set Site URL + Redirect URLs to include /auth/callback"
        location: "Supabase Dashboard -> Authentication -> URL Configuration"
      - task: "Install Supabase CLI locally and run `supabase link` to connect this repo to the project"
        location: "https://supabase.com/docs/guides/cli/getting-started"

must_haves:
  truths:
    - "A fresh Supabase project can run `supabase db reset` and end up with all 5 tables + RLS policies applied"
    - "An anonymous user calling `supabase.auth.signInAnonymously()` receives a valid session and an `auth.users` row with `is_anonymous: true`"
    - "Calling `supabase.auth.updateUser({ email })` from a signed-in anonymous session sends a magic-link email (via Supabase default SMTP per D-05)"
    - "The magic-link callback at `/auth/callback` exchanges the code for a session cookie and redirects to `/play`"
    - "Next.js middleware refreshes the Supabase session cookie on every request per @supabase/ssr guide"
    - "Server code always calls `supabase.auth.getUser()` — never `getSession()` — per D-17 and Anti-Pattern 5"
    - "RLS is enabled on users, player_state, library_entries, cosmetic_catalogue, user_cosmetics, encounter_attempts"
    - "A negative RLS integration test proves user B cannot SELECT user A's player_state row (PERS-02 ship gate)"
  artifacts:
    - path: "supabase/migrations/20260420000001_init_schema.sql"
      provides: "5 tables from design doc §9 (users, player_state, library_entries, cosmetic_catalogue, user_cosmetics) + encounter_attempts audit table"
      contains: "create table public.player_state"
    - path: "supabase/migrations/20260420000002_rls_policies.sql"
      provides: "Row-Level Security policies keyed to auth.uid() on every table (D-18)"
      contains: "alter table public.player_state enable row level security"
    - path: "lib/supabase/server.ts"
      provides: "Cookie-bound server client for Server Components, Route Handlers, Server Actions"
      exports: ["createServerClient"]
    - path: "lib/supabase/client.ts"
      provides: "Browser client for client components"
      exports: ["createBrowserClient"]
    - path: "lib/supabase/middleware.ts"
      provides: "Session refresh helper used by middleware.ts"
      exports: ["updateSession"]
    - path: "middleware.ts"
      provides: "Next.js middleware that refreshes Supabase session on every matched request (AUTH-04)"
      contains: "updateSession"
    - path: "app/auth/callback/route.ts"
      provides: "Magic-link callback that calls exchangeCodeForSession and redirects"
      exports: ["GET"]
    - path: "app/auth/signin/page.tsx"
      provides: "Magic-link sign-in form"
      contains: "SignInForm"
    - path: "supabase/tests/rls-negative.test.ts"
      provides: "Integration test proving RLS blocks cross-user reads (PERS-02)"
      contains: "cannot read other user"
  key_links:
    - from: "middleware.ts"
      to: "lib/supabase/middleware.ts updateSession"
      via: "Next.js middleware chain"
      pattern: "updateSession"
    - from: "app/auth/callback/route.ts"
      to: "supabase.auth.exchangeCodeForSession"
      via: "magic-link token exchange"
      pattern: "exchangeCodeForSession"
    - from: "supabase/migrations/*_rls_policies.sql"
      to: "auth.uid() on every RLS policy"
      via: "Postgres RLS"
      pattern: "auth\\.uid\\(\\)"
---

<objective>
Stand up Supabase — auth + database + RLS — so Phase 1 can prove anonymous play, magic-link upgrade, and session persistence. Creates all 5 tables from design doc §9 (plus `encounter_attempts` for Phase 2 audit rows), enables RLS on every one of them with `auth.uid() = user_id` policies (D-18), and writes a real negative test that confirms RLS blocks cross-user reads (PERS-02 ship gate).

Wires `@supabase/ssr` correctly for Next 16 App Router: browser client, cookie-bound server client, and a middleware session-refresh helper. Server paths all use `supabase.auth.getUser()` per D-17 / Anti-Pattern 5. Enables Supabase anonymous sign-ins (D-04) and magic-link email auth via default SMTP (D-05). The `/auth/callback` route handles the magic-link code exchange and redirects to `/play`.

This plan does NOT write the anon→authed client migration (that's Plan 03, because the pattern D-04 locks in means there is no row migration — just `updateUser({ email })`). It does NOT wire the Phaser game (Plan 04). It does NOT write the Zustand store (Plan 03).

Purpose: AUTH-02 (magic link), AUTH-04 (session persistence), PERS-02 (RLS everywhere) must pass before any client-side feature is built. The negative RLS test is a blocker: if user B can read user A's data, nothing else is safe to ship.
Output: Working auth flow from signin → magic-link email → callback → session cookie → `getUser()` returns the user. RLS enforced with a green negative test.
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@docs/cluu-v1-design.md

<interfaces>
<!-- Critical contracts from STACK.md and design doc §9 — executor uses these directly -->

Pinned versions (from STACK.md install block):
```
@supabase/supabase-js@^2.103.3
@supabase/ssr@^0.10.2
```

From design doc §9 (data model — shapes of all 5 tables):
```
users            (id uuid pk, email, display_name, created_at, last_active_at)
player_state    (user_id fk, cluu_mood enum, cluu_cosmetics jsonb, island_progress jsonb, unlocked_biomes text[], updated_at)
library_entries (id uuid pk, user_id fk, encounter_id text, prompt_text, generated_response, grade enum pass|flair, tags text[], created_at)
cosmetic_catalogue (id text pk, slot enum head|body|back|eyes, name, source enum, sprite_path, unlock_condition jsonb)
user_cosmetics  (user_id fk, cosmetic_id fk, acquired_at, acquisition_source text)
```
Plus `encounter_attempts` (Phase 2 audit table — created now to avoid schema churn): (id uuid, user_id fk, encounter_id text, prompt_hash text, verdict enum fail|pass|flair, tokens_used int, cached boolean, created_at).

From STACK.md "Integration gotchas §3":
- `createBrowserClient` in client components
- `createServerClient` in server components, route handlers, middleware
- NEVER mix `@supabase/auth-helpers-nextjs` — it's deprecated
- Middleware pattern: read cookies → `supabase.auth.getUser()` → refresh JWT → pass through
- Magic link callback lands on `/auth/callback?code=...` — handle with `exchangeCodeForSession`

From ARCHITECTURE.md "Anti-Pattern 5":
- NEVER use `getSession()` in Server Components — may return forged cookies as valid
- ALWAYS `getUser()` in Server Components, Server Actions, Route Handlers

From CONTEXT.md D-04:
- First-visit: `supabase.auth.signInAnonymously()` — creates a real `auth.users` row with `is_anonymous: true`
- Signup: `supabase.auth.updateUser({ email })` — Supabase sends magic link, on confirm user is upgraded in place
- NO row migration — `player_state.user_id` is stable across the upgrade
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install Supabase packages, create schema + RLS migrations, seed catalogue</name>
  <files>package.json, supabase/migrations/20260420000001_init_schema.sql, supabase/migrations/20260420000002_rls_policies.sql, supabase/seed.sql, supabase/config.toml</files>

  <read_first>
    - docs/cluu-v1-design.md §9 "Data model" (lines 266-307) — EXACT column shapes
    - .planning/research/STACK.md — "Installation" block for version pins
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-04, D-05, D-18
    - .planning/research/PITFALLS.md Pitfall 4 (anonymous migration expectations)
    - .planning/research/ARCHITECTURE.md — Anti-Pattern 5 (getUser not getSession)
  </read_first>

  <action>
1. Install Supabase SDKs from repo root with the exact pinned versions:
```bash
pnpm add @supabase/supabase-js@^2.103.3 @supabase/ssr@^0.10.2
```

2. Create `supabase/config.toml`. This is the Supabase CLI config for local dev (minimal — real config happens in the dashboard):
```toml
project_id = "cluu"

[api]
enabled = true
port = 54321
schemas = ["public", "graphql_public"]

[db]
port = 54322
shadow_port = 54320
major_version = 15

[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback", "https://cluu.game/auth/callback", "https://*.vercel.app/auth/callback"]
jwt_expiry = 3600
enable_anonymous_sign_ins = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
```

3. Create `supabase/migrations/20260420000001_init_schema.sql`. Tables exactly per design doc §9, with `encounter_attempts` added so Phase 2 doesn't need another schema bump:
```sql
-- Cluu initial schema — Phase 1
-- Source: docs/cluu-v1-design.md §9

create extension if not exists "uuid-ossp";

-- users: mirror of auth.users for display_name and last_active (auth.users owned by Supabase)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- cluu_mood enum
create type cluu_mood as enum ('stoked', 'content', 'sleepy', 'blue');

-- player_state: one row per user
create table public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cluu_mood cluu_mood not null default 'content',
  cluu_cosmetics jsonb not null default '{"head":null,"body":null,"back":null,"eyes":null}'::jsonb,
  island_progress jsonb not null default '{}'::jsonb,
  unlocked_biomes text[] not null default array['meadow']::text[],
  migration_processed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- library grade enum
create type library_grade as enum ('pass', 'flair');

-- library_entries: user's saved prompts
create table public.library_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id text not null,
  prompt_text text not null,
  generated_response text not null,
  grade library_grade not null,
  tags text[] not null default array[]::text[],
  created_at timestamptz not null default now()
);
create index library_entries_user_id_idx on public.library_entries(user_id);

-- cosmetic slot enum
create type cosmetic_slot as enum ('head', 'body', 'back', 'eyes');

-- cosmetic catalogue: readable by all authed users
create type cosmetic_source as enum ('encounter_reward', 'dlc_pack', 'event');
create table public.cosmetic_catalogue (
  id text primary key,
  slot cosmetic_slot not null,
  name text not null,
  source cosmetic_source not null,
  sprite_path text not null,
  unlock_condition jsonb not null default '{}'::jsonb
);

-- user_cosmetics: which cosmetics each user owns
create table public.user_cosmetics (
  user_id uuid not null references auth.users(id) on delete cascade,
  cosmetic_id text not null references public.cosmetic_catalogue(id) on delete restrict,
  acquired_at timestamptz not null default now(),
  acquisition_source text,
  primary key (user_id, cosmetic_id)
);

-- encounter_attempts: audit log (Phase 2 populates; scaffold now)
create type encounter_verdict as enum ('fail', 'pass', 'flair');
create table public.encounter_attempts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  encounter_id text not null,
  prompt_hash text not null,
  verdict encounter_verdict not null,
  tokens_used integer,
  cached boolean not null default false,
  created_at timestamptz not null default now()
);
create index encounter_attempts_user_id_idx on public.encounter_attempts(user_id);

-- auto-create public.users row when auth.users is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.player_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

4. Create `supabase/migrations/20260420000002_rls_policies.sql`. RLS on every table (D-18). `cosmetic_catalogue` is readable by all authed users per ARCHITECTURE.md cross-cutting concerns. User tables use `auth.uid() = user_id`:
```sql
-- Row-Level Security — Phase 1
-- Every table scoped to auth.uid() except cosmetic_catalogue (read-all-authed)

-- users: each user owns their row
alter table public.users enable row level security;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- player_state: each user owns their row
alter table public.player_state enable row level security;
create policy "player_state_select_own" on public.player_state
  for select using (auth.uid() = user_id);
create policy "player_state_insert_own" on public.player_state
  for insert with check (auth.uid() = user_id);
create policy "player_state_update_own" on public.player_state
  for update using (auth.uid() = user_id);

-- library_entries: each user owns their entries
alter table public.library_entries enable row level security;
create policy "library_entries_select_own" on public.library_entries
  for select using (auth.uid() = user_id);
create policy "library_entries_insert_own" on public.library_entries
  for insert with check (auth.uid() = user_id);
create policy "library_entries_delete_own" on public.library_entries
  for delete using (auth.uid() = user_id);

-- cosmetic_catalogue: readable by all authed users, writable only by service_role
alter table public.cosmetic_catalogue enable row level security;
create policy "cosmetic_catalogue_select_all_authed" on public.cosmetic_catalogue
  for select using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- user_cosmetics: each user owns their inventory
alter table public.user_cosmetics enable row level security;
create policy "user_cosmetics_select_own" on public.user_cosmetics
  for select using (auth.uid() = user_id);
create policy "user_cosmetics_insert_own" on public.user_cosmetics
  for insert with check (auth.uid() = user_id);

-- encounter_attempts: each user sees their audit rows; writes only by service_role (grading gateway uses service role bypass)
alter table public.encounter_attempts enable row level security;
create policy "encounter_attempts_select_own" on public.encounter_attempts
  for select using (auth.uid() = user_id);
-- insert policy deliberately omitted: Phase 2 grading gateway will use service_role which bypasses RLS
```

5. Create `supabase/seed.sql`. Empty for Phase 1 (Phase 3 seeds the 15 cosmetics):
```sql
-- Cluu seed data — Phase 1 is empty.
-- Phase 3 seeds cosmetic_catalogue with the 15 v1 free cosmetics (COS-01).
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; test -f supabase/migrations/20260420000001_init_schema.sql &amp;&amp; test -f supabase/migrations/20260420000002_rls_policies.sql &amp;&amp; grep -q "enable row level security" supabase/migrations/20260420000002_rls_policies.sql &amp;&amp; grep -q "auth.uid()" supabase/migrations/20260420000002_rls_policies.sql</automated>
  </verify>

  <acceptance_criteria>
    - `supabase/migrations/20260420000001_init_schema.sql` creates tables: users, player_state, library_entries, cosmetic_catalogue, user_cosmetics, encounter_attempts (grep: `grep -c "create table public\\." supabase/migrations/20260420000001_init_schema.sql` returns 6)
    - `supabase/migrations/20260420000002_rls_policies.sql` has `enable row level security` on all 6 tables (grep: `grep -c "enable row level security" supabase/migrations/20260420000002_rls_policies.sql` returns 6)
    - Every RLS policy uses `auth.uid()` or `auth.role()` (no hardcoded UUIDs)
    - `handle_new_user` trigger exists and inserts into both `public.users` and `public.player_state`
    - `supabase/config.toml` has `enable_anonymous_sign_ins = true` (D-04)
    - `pnpm install` picked up `@supabase/ssr@^0.10.2` and `@supabase/supabase-js@^2.103.3` (check pnpm-lock.yaml)
  </acceptance_criteria>

  <done>Schema + RLS migrations committable. CLI can run `supabase db reset` and apply cleanly. Anonymous sign-ins enabled in config.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire @supabase/ssr clients + middleware session refresh</name>
  <files>lib/supabase/server.ts, lib/supabase/client.ts, lib/supabase/middleware.ts, lib/supabase/types.ts, middleware.ts</files>

  <read_first>
    - .planning/research/STACK.md — "Integration gotchas §3" (Next.js App Router + @supabase/ssr cookies)
    - .planning/research/ARCHITECTURE.md — Anti-Pattern 5 (getUser not getSession)
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-17 (getUser never getSession)
    - Supabase official guide: https://supabase.com/docs/guides/auth/server-side/nextjs
    - supabase/migrations/*.sql (Task 1) — confirms table names for Database type
  </read_first>

  <action>
1. Create `lib/supabase/types.ts`. A minimal Database type (Phase 3 will generate the full type via `supabase gen types typescript`). For Phase 1 we type the tables we actually use:
```ts
// lib/supabase/types.ts
// Minimal Database type for Phase 1. Phase 3 replaces this with generated types:
//   supabase gen types typescript --project-id <id> --schema public > lib/supabase/types.ts
// See: https://supabase.com/docs/guides/api/rest/generating-types

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type CluuMood = 'stoked' | 'content' | 'sleepy' | 'blue';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string | null; display_name: string | null; created_at: string; last_active_at: string };
        Insert: { id: string; email?: string | null; display_name?: string | null };
        Update: { email?: string | null; display_name?: string | null; last_active_at?: string };
      };
      player_state: {
        Row: {
          user_id: string;
          cluu_mood: CluuMood;
          cluu_cosmetics: { head: string | null; body: string | null; back: string | null; eyes: string | null };
          island_progress: Json;
          unlocked_biomes: string[];
          migration_processed: boolean;
          updated_at: string;
        };
        Insert: { user_id: string; cluu_mood?: CluuMood; cluu_cosmetics?: Json; island_progress?: Json; unlocked_biomes?: string[]; migration_processed?: boolean };
        Update: { cluu_mood?: CluuMood; cluu_cosmetics?: Json; island_progress?: Json; unlocked_biomes?: string[]; migration_processed?: boolean; updated_at?: string };
      };
      library_entries: {
        Row: { id: string; user_id: string; encounter_id: string; prompt_text: string; generated_response: string; grade: 'pass' | 'flair'; tags: string[]; created_at: string };
        Insert: { user_id: string; encounter_id: string; prompt_text: string; generated_response: string; grade: 'pass' | 'flair'; tags?: string[] };
        Update: { tags?: string[] };
      };
      cosmetic_catalogue: {
        Row: { id: string; slot: 'head' | 'body' | 'back' | 'eyes'; name: string; source: string; sprite_path: string; unlock_condition: Json };
        Insert: { id: string; slot: 'head' | 'body' | 'back' | 'eyes'; name: string; source: string; sprite_path: string; unlock_condition?: Json };
        Update: never;
      };
      user_cosmetics: {
        Row: { user_id: string; cosmetic_id: string; acquired_at: string; acquisition_source: string | null };
        Insert: { user_id: string; cosmetic_id: string; acquisition_source?: string | null };
        Update: never;
      };
      encounter_attempts: {
        Row: { id: string; user_id: string; encounter_id: string; prompt_hash: string; verdict: 'fail' | 'pass' | 'flair'; tokens_used: number | null; cached: boolean; created_at: string };
        Insert: { user_id: string; encounter_id: string; prompt_hash: string; verdict: 'fail' | 'pass' | 'flair'; tokens_used?: number | null; cached?: boolean };
        Update: never;
      };
    };
    Enums: { cluu_mood: CluuMood; library_grade: 'pass' | 'flair'; cosmetic_slot: 'head' | 'body' | 'back' | 'eyes'; encounter_verdict: 'fail' | 'pass' | 'flair' };
  };
}
```

2. Create `lib/supabase/client.ts`. Browser client for client components. Follows the Supabase App Router docs exactly:
```ts
// lib/supabase/client.ts
// Browser-side Supabase client. Use in Client Components only.
// Server paths use lib/supabase/server.ts with cookie binding.
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

3. Create `lib/supabase/server.ts`. Cookie-bound server client. Note the `import 'server-only'` guard — if this file leaks into a client bundle the build fails loudly:
```ts
// lib/supabase/server.ts
import 'server-only';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // RSC read-only contexts: setAll is a no-op; middleware keeps cookies fresh.
          }
        },
      },
    },
  );
}
```

4. Create `lib/supabase/middleware.ts`. Session refresh helper. MUST call `getUser()` per D-17:
```ts
// lib/supabase/middleware.ts
// Session refresh helper — runs on every matched request via middleware.ts.
// Pattern from https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // D-17: always getUser(), never getSession() on the server
  await supabase.auth.getUser();

  return supabaseResponse;
}
```

5. Create `middleware.ts` at repo root. Note: Next 16 renamed middleware to proxy.ts but middleware.ts still works and matches Supabase docs. Keep `middleware.ts` for now:
```ts
// middleware.ts
// Runs on every matched request to refresh the Supabase session cookie.
// AUTH-04: session persistence across browser refresh.
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; grep -q "getUser" lib/supabase/middleware.ts &amp;&amp; ! grep -q "getSession" lib/supabase/server.ts &amp;&amp; ! grep -q "getSession" lib/supabase/middleware.ts &amp;&amp; grep -q "import 'server-only'" lib/supabase/server.ts</automated>
  </verify>

  <acceptance_criteria>
    - `lib/supabase/client.ts` exports `createClient` using `createBrowserClient` from `@supabase/ssr`
    - `lib/supabase/server.ts` starts with `import 'server-only'` (prevents client bundling)
    - `lib/supabase/server.ts` exports `createServerClient` and uses `cookies()` from `next/headers`
    - `lib/supabase/middleware.ts` calls `supabase.auth.getUser()` — NOT `getSession()` (per D-17)
    - No file in `lib/supabase/` contains the string `getSession` (grep: `! grep -r "getSession" lib/supabase/`)
    - `middleware.ts` at repo root imports from `@/lib/supabase/middleware` and exports `middleware` + `config`
    - `pnpm typecheck` exits 0
  </acceptance_criteria>

  <done>Supabase SSR clients wired per official App Router guide. Middleware refreshes session on every request. `getUser()` used everywhere server-side.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Magic-link signin page, callback route, signout action, + RLS negative test</name>
  <files>app/auth/signin/page.tsx, app/auth/signin/SignInForm.tsx, app/auth/callback/route.ts, app/auth/actions.ts, supabase/tests/rls-negative.test.ts, package.json</files>

  <read_first>
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-04, D-05, D-06, D-18
    - .planning/research/STACK.md — "Integration gotchas §2" (Supabase magic-link + anonymous migration) and §3 (cookie handling)
    - lib/supabase/server.ts + lib/supabase/client.ts (Task 2) — import surface the page uses
    - supabase/migrations/*.sql (Task 1) — what tables RLS protects
    - https://supabase.com/docs/guides/auth/auth-anonymous — anonymous sign-ins
  </read_first>

  <behavior>
    Sign-in page:
    - Test 1: Renders a form with an email input and a submit button
    - Test 2: On submit with valid email, `signInWithOtp` is called with that email and `emailRedirectTo` pointing at `/auth/callback`

    Callback route:
    - Test 3: GET `/auth/callback?code=abc` calls `exchangeCodeForSession` with that code
    - Test 4: On success, redirects to `/play`
    - Test 5: On failure (no code), redirects to `/auth/signin?error=missing_code`

    RLS negative test (the PERS-02 ship gate):
    - Test 6: Create user A via service role, insert `player_state` row for A, then attempt to read A's `player_state` while authenticated as a different user B — expect 0 rows returned (RLS blocks the read)
    - Test 7: User B attempting to UPDATE user A's player_state fails (0 rows affected or policy error)
  </behavior>

  <action>
1. Create `app/auth/signin/page.tsx` (Server Component — reads user first, redirects to /play if already authed):
```tsx
// app/auth/signin/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { SignInForm } from './SignInForm';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Already signed in with email -> go play
  if (user && !user.is_anonymous) redirect('/play');

  const params = await searchParams;
  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '2rem', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '1rem' }}>Save your island</h1>
      <p style={{ marginBottom: '1.5rem', color: '#555' }}>
        Enter your email. We'll send you a magic link — no password needed.
      </p>
      <SignInForm />
      {params.error && <p style={{ color: 'crimson', marginTop: '1rem' }}>Something went wrong. Try again.</p>}
      {params.sent && <p style={{ color: 'green', marginTop: '1rem' }}>Check your email for the magic link.</p>}
    </main>
  );
}
```

2. Create `app/auth/signin/SignInForm.tsx` (Client Component — calls Supabase browser client). Per D-04, if the user has an existing anonymous session, `updateUser({ email })` upgrades in place. Otherwise `signInWithOtp` creates a new session:
```tsx
// app/auth/signin/SignInForm.tsx
'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    // D-04: if we have an anonymous session, upgrade it in-place via updateUser.
    // Otherwise send a fresh magic link via signInWithOtp.
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = user?.is_anonymous
      ? await supabase.auth.updateUser({ email })
      : await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });

    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (sent) return <p>Check your email. The link takes you back here.</p>;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ padding: '0.75rem', fontSize: '1rem', border: '1px solid #ccc', borderRadius: 6 }}
      />
      <button
        type="submit"
        disabled={loading}
        style={{ padding: '0.75rem', fontSize: '1rem', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
      >
        {loading ? 'Sending…' : 'Send magic link'}
      </button>
      {error && <p style={{ color: 'crimson', fontSize: '0.875rem' }}>{error}</p>}
    </form>
  );
}
```

3. Create `app/auth/callback/route.ts`. Exchanges the magic-link code for a session cookie:
```ts
// app/auth/callback/route.ts
// Magic-link callback. Supabase redirects here after the user clicks the email link.
// See https://supabase.com/docs/guides/auth/server-side/nextjs
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/play';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/signin?error=missing_code`);
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth/signin?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
```

4. Create `app/auth/actions.ts`. Sign-out Server Action (used by the persistent settings affordance in Plan 07 per D-06):
```ts
// app/auth/actions.ts
'use server';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/');
}
```

5. Install test dependencies for the RLS negative test (real @supabase/supabase-js client, no mocks — this is an integration test):
```bash
pnpm add -D dotenv@^16
```

6. Create `supabase/tests/rls-negative.test.ts`. This test requires a RUNNING Supabase instance (local `supabase start` or a dedicated test project). Uses the service-role key to create two users, then verifies RLS blocks cross-user reads. D-18 / PERS-02 ship gate:
```ts
// supabase/tests/rls-negative.test.ts
// PERS-02 ship gate: RLS keyed to auth.uid() prevents cross-user reads.
// Requires:
//   - A Supabase project with migrations applied (supabase db reset)
//   - SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY in env
//
// Run with: pnpm test supabase/tests/rls-negative.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Skip this test when env is missing (CI without Supabase credentials)
const canRun = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);
const testFn = canRun ? it : it.skip;

describe('RLS negative test — cross-user isolation', () => {
  let admin: SupabaseClient;
  let userAId: string;
  let userBId: string;
  let userBClient: SupabaseClient;

  beforeAll(async () => {
    if (!canRun) return;
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user A and B via admin API
    const { data: a, error: aErr } = await admin.auth.admin.createUser({
      email: `rls-test-a-${Date.now()}@test.local`,
      email_confirm: true,
    });
    if (aErr) throw aErr;
    userAId = a.user!.id;

    const { data: b, error: bErr } = await admin.auth.admin.createUser({
      email: `rls-test-b-${Date.now()}@test.local`,
      email_confirm: true,
      password: 'password-b-test',
    });
    if (bErr) throw bErr;
    userBId = b.user!.id;

    // Seed user A's player_state with a distinguishing marker
    const { error: seedErr } = await admin
      .from('player_state')
      .upsert({ user_id: userAId, cluu_mood: 'stoked', island_progress: { marker: 'userA_secret' } });
    if (seedErr) throw seedErr;

    // Sign in as user B with anon key (RLS enforced)
    userBClient = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signInErr } = await userBClient.auth.signInWithPassword({
      email: b.user!.email!,
      password: 'password-b-test',
    });
    if (signInErr) throw signInErr;
  });

  afterAll(async () => {
    if (!canRun) return;
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  });

  testFn('user B cannot read user A player_state (RLS blocks select)', async () => {
    const { data, error } = await userBClient
      .from('player_state')
      .select('*')
      .eq('user_id', userAId);

    // RLS returns no rows (not an error — just filters them out)
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  testFn('user B cannot update user A player_state (RLS blocks update)', async () => {
    const { data, error } = await userBClient
      .from('player_state')
      .update({ cluu_mood: 'blue' })
      .eq('user_id', userAId)
      .select();

    // Either error or empty data — both prove the update was blocked
    expect(data ?? []).toEqual([]);
  });

  testFn('user B cannot insert a player_state row for user A', async () => {
    const { error } = await userBClient
      .from('player_state')
      .insert({ user_id: userAId });

    // RLS violates the with-check policy
    expect(error).not.toBeNull();
  });
});
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test supabase/tests/rls-negative.test.ts</automated>
  </verify>

  <acceptance_criteria>
    - `app/auth/signin/page.tsx` is a Server Component that calls `supabase.auth.getUser()` (D-17)
    - `app/auth/signin/SignInForm.tsx` has `'use client'` and calls BOTH `signInWithOtp` AND `updateUser` paths (D-04 anonymous upgrade branch)
    - `app/auth/callback/route.ts` calls `exchangeCodeForSession` and redirects to `/play` on success
    - `app/auth/actions.ts` exports `signOut` (used by Plan 07 for D-06 persistent sign-out affordance)
    - `supabase/tests/rls-negative.test.ts` exists and contains at least 3 `testFn` assertions
    - Test file imports `@supabase/supabase-js` directly (integration test, not mocked)
    - When Supabase env is available, `pnpm test supabase/tests/rls-negative.test.ts` exits 0 with 3 passing tests; when env is missing, tests skip gracefully
    - No file uses `getSession` on server paths (grep: `! grep -rn "getSession" app/auth/ lib/supabase/`)
  </acceptance_criteria>

  <done>Magic-link flow wired end-to-end. PERS-02 RLS negative test green (or gracefully skipped when env is missing). Sign-out action ready for Plan 07 consumption.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Supabase Auth | User-submitted email for magic-link; untrusted |
| Browser → Supabase Postgres | Reads/writes flow through PostgREST, bounded by RLS keyed to `auth.uid()` |
| Supabase Auth → magic-link email | Supabase default SMTP (D-05); branded sender deferred to Phase 5 |
| Server Action / Route Handler → Postgres | Uses cookie-bound user session; RLS applies |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Spoofing | Anonymous sign-in endpoint | mitigate | Anonymous users ARE real auth users — abuse rate-limit deferred to Phase 2 (`x-forwarded-for` + Upstash on grading gateway per STACK.md §2). Phase 1 accepts the risk; no grading calls yet to abuse. |
| T-01-02 | Tampering | Client submits `user_id` to read others' rows | mitigate | RLS policies on every table use `auth.uid() = user_id` — negative test in Task 3 proves this (PERS-02 ship gate) |
| T-01-03 | Repudiation | User denies signing in | accept | Supabase auth logs retain 30 days (POPIA-bounded) — sufficient audit trail for Phase 1 |
| T-01-04 | Information Disclosure | `getSession()` in RSC trusts forged cookies | mitigate | Codebase-wide ban: server paths call `getUser()` only; enforced in Task 2 + Task 3 acceptance criteria (no `getSession` string anywhere in `lib/supabase/` or `app/auth/`) |
| T-01-05 | Information Disclosure | Service-role key leaks to client | mitigate | Service-role key only used in `supabase/tests/rls-negative.test.ts`; never imported from `app/` or `lib/`. `.env.local` gitignored. |
| T-01-06 | Denial of Service | Magic-link flood at one email | accept | Supabase default rate-limits OTP sends per email; Phase 5 launch hardening adds own-SMTP with its own controls |
| T-01-07 | Elevation of Privilege | Anonymous user upgrades to authed and inherits someone else's data | mitigate | D-04 pattern: `updateUser({ email })` upgrades same `user_id` in place — no row merge, no cross-account data grant |
</threat_model>

<verification>
Phase-level checks this plan must clear:
1. Fresh `supabase db reset` applies both migrations clean
2. `pnpm typecheck` + `pnpm lint` + `pnpm build` all green
3. Manually: visit `/auth/signin`, enter email, receive magic link, click it, land on `/play` (Plan 04 will render the canvas — for now a 404 is acceptable)
4. Manually: refresh browser at `/play` after sign-in — session persists (AUTH-04 proof)
5. `pnpm test supabase/tests/rls-negative.test.ts` exits 0 with 3 passing tests (PERS-02 ship gate)
6. `grep -r "getSession" lib/supabase/ app/auth/` returns 0 matches (D-17 enforcement)
</verification>

<success_criteria>
- AUTH-02: magic link sends, callback exchanges, session persists
- AUTH-04: middleware refreshes session cookie on every request
- PERS-02: RLS enforced on every table; negative test green
- D-04: Supabase anonymous sign-ins enabled; `updateUser({ email })` branch wired
- D-17: no `getSession()` calls anywhere server-side
- D-18: every table has `enable row level security` + `auth.uid()` policy
- All migrations applied cleanly, schema matches design doc §9
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-02-SUMMARY.md` with:
- Supabase project URL and project ref (for the team)
- Migration filenames + applied timestamps
- RLS negative test output (3/3 pass)
- Magic-link flow confirmed working on localhost
- Known issues / deviations (should be none)
</output>
