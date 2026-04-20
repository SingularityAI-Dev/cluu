---
phase: 01-scaffold
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - .env.example
  - supabase/config.toml
  - supabase/migrations/20260420000001_init_schema.sql
  - supabase/migrations/20260420000002_rls_policies.sql
  - lib/supabase/client.ts
  - lib/supabase/server.ts
  - lib/supabase/proxy.ts
  - lib/supabase/types.ts
  - proxy.ts
  - app/auth/signin/page.tsx
  - app/auth/actions.ts
  - app/auth/callback/route.ts
  - tests/rls-negative.test.ts
  - vitest.config.ts
autonomous: true
requirements:
  - AUTH-02
  - AUTH-04
  - PERS-02

user_setup:
  - service: supabase
    why: "Auth + Postgres + RLS. Magic-link + anonymous sign-ins + session cookie refresh (AUTH-02, AUTH-04, PERS-02, D-04, D-18)."
    env_vars:
      - name: NEXT_PUBLIC_SUPABASE_URL
        source: "Supabase Dashboard -> Project Settings -> API -> Project URL"
      - name: NEXT_PUBLIC_SUPABASE_ANON_KEY
        source: "Supabase Dashboard -> Project Settings -> API -> anon/public key"
      - name: SUPABASE_SERVICE_ROLE_KEY
        source: "Supabase Dashboard -> Project Settings -> API -> service_role key (SERVER-ONLY — never expose to client)"
    dashboard_config:
      - task: "Create the Supabase project (free tier is fine for Phase 1; Cape Town or EU region for POPIA latency)"
        location: "supabase.com/dashboard -> New Project"
      - task: "Enable anonymous sign-ins (D-04 — required so first-visit `supabase.auth.signInAnonymously()` works)"
        location: "Supabase Dashboard -> Authentication -> Providers -> Anonymous Sign-Ins -> Enable"
      - task: "Enable magic-link email provider (D-05 — Supabase's default SMTP is fine for Phase 1; Phase 5 migrates to Resend)"
        location: "Supabase Dashboard -> Authentication -> Providers -> Email -> ensure Magic Link is enabled"
      - task: "Configure the Site URL + Redirect URLs so magic-link callbacks land on `/auth/callback`"
        location: "Supabase Dashboard -> Authentication -> URL Configuration -> Site URL = <preview/prod URL>; Redirect URLs += `<url>/auth/callback`"
      - task: "Install and log in to the Supabase CLI locally so migrations can be applied (`pnpm dlx supabase login`). Required to run `supabase db push`."
        location: "local machine; credentials stored in `~/.supabase/`"

must_haves:
  truths:
    - "Every table has RLS ENABLED with policies keyed to `auth.uid()` (D-18, PERS-02)"
    - "A negative Vitest test proves user A cannot SELECT user B's `player_state` row (PERS-02 acceptance gate)"
    - "The root `proxy.ts` file exists at the repository root (Next 16 convention per D-25) — NOT `middleware.ts`"
    - "`proxy.ts` exports an `async function proxy(request: NextRequest)` — NOT `middleware` (D-25)"
    - "`lib/supabase/proxy.ts` exists (NOT `middleware.ts`) and exports `createProxyClient` (D-27) — NOT `createMiddlewareClient`"
    - "Inside `proxy.ts`, the cookie-sync pattern explicitly copies cookies from the incoming request to a mutable `NextResponse.next({ request })` response before returning (D-26 — prevents the known sign-out-loop bug)"
    - "`lib/supabase/server.ts` exports `createServerClient()` that calls `cookies()` from `next/headers` and is used by Server Components, Server Actions, and Route Handlers (D-17)"
    - "Every server-side auth read uses `supabase.auth.getUser()` — NEVER `getSession()` (D-17, ARCHITECTURE.md Anti-Pattern 5)"
    - "`lib/supabase/client.ts` exports `createClient()` using `createBrowserClient` from `@supabase/ssr` (browser-side only)"
    - "Magic-link flow: `app/auth/signin/page.tsx` collects email, `signIn(email)` Server Action triggers Supabase `signInWithOtp`, `app/auth/callback/route.ts` completes the exchange via `exchangeCodeForSession` and redirects to `/play`"
    - "`signIn` and `signOut` Server Actions live in `app/auth/actions.ts` (Plan 07 imports signOut; Plan 03 implicitly depends on server.ts)"
    - "Database schema covers the 5 tables from design doc section 9 + the `encounter_attempts` audit table — so Phase 2 grading is pure Anthropic work with zero schema surprises"
    - "`player_state` table includes a `migration_processed` boolean (default false) — Plan 03 uses this as the idempotency flag for `/api/migrate-anonymous`"
    - "Anonymous sign-ins enabled on the Supabase project (dashboard config documented in `user_setup`) — D-04 requires this"
    - "`.env.example` is expanded with the three Supabase env var names (URL, anon key, service role key) with comments pointing at the Supabase Dashboard"
  artifacts:
    - path: "supabase/migrations/20260420000001_init_schema.sql"
      provides: "Tables: player_state, library_entries, cosmetic_catalogue, user_cosmetics, encounter_attempts. `auth.users` is Supabase-managed — NOT a user-created table."
      contains: "create table public.player_state"
    - path: "supabase/migrations/20260420000002_rls_policies.sql"
      provides: "RLS ENABLE + policies on every user-data table (D-18, PERS-02)"
      contains: "enable row level security"
    - path: "lib/supabase/client.ts"
      provides: "Browser client — `createBrowserClient` from @supabase/ssr"
      exports: ["createClient"]
    - path: "lib/supabase/server.ts"
      provides: "Server client — cookie-bound `createServerClient` from @supabase/ssr; used by Server Components + Server Actions + Route Handlers"
      exports: ["createServerClient"]
    - path: "lib/supabase/proxy.ts"
      provides: "Helper `createProxyClient(request, response)` used by the root proxy.ts (D-27 — renamed from middleware.ts)"
      exports: ["createProxyClient"]
    - path: "lib/supabase/types.ts"
      provides: "Typed Database type so every client has row-level types for the 5 tables + encounter_attempts"
      exports: ["type Database", "type CluuMood", "type Json"]
    - path: "proxy.ts"
      provides: "Root Next 16 proxy — session refresh on every matched request (D-25); mutable response + cookie sync (D-26)"
      exports: ["proxy", "config"]
    - path: "app/auth/signin/page.tsx"
      provides: "Magic-link sign-in page — 3 lines of copy, one email input, one submit button (per CONTEXT.md specifics)"
    - path: "app/auth/actions.ts"
      provides: "`signIn(email)` + `signOut()` Server Actions (Plan 07 imports signOut)"
      exports: ["signIn", "signOut"]
    - path: "app/auth/callback/route.ts"
      provides: "Magic-link callback — `exchangeCodeForSession`, redirect to /play"
      exports: ["GET"]
    - path: "tests/rls-negative.test.ts"
      provides: "Vitest negative test: user A cannot read user B's player_state (PERS-02 ship gate)"
      contains: "cannot read another user"
  key_links:
    - from: "proxy.ts (root)"
      to: "createProxyClient(request, response)"
      via: "Next 16 proxy function calls createProxyClient then supabase.auth.getUser() to refresh"
      pattern: "createProxyClient"
    - from: "proxy.ts (root)"
      to: "NextResponse.next({ request })"
      via: "Mutable response that receives refreshed cookies before return (D-26)"
      pattern: "NextResponse\\.next\\(\\s*\\{\\s*request"
    - from: "lib/supabase/server.ts"
      to: "supabase.auth.getUser"
      via: "Server-side auth read — D-17 enforcement (never getSession)"
      pattern: "getUser"
    - from: "app/auth/callback/route.ts"
      to: "supabase.auth.exchangeCodeForSession"
      via: "Magic-link code -> session"
      pattern: "exchangeCodeForSession"
    - from: "supabase/migrations/20260420000002_rls_policies.sql"
      to: "auth.uid() = user_id"
      via: "Every user-data policy keyed on auth.uid()"
      pattern: "auth\\.uid\\(\\)\\s*=\\s*user_id"
---

<objective>
Land the Supabase foundation Phase 1 exists to prove: schema, RLS, browser + server clients, Next 16 `proxy.ts` with the D-26 cookie-sync pattern, magic-link sign-in flow, and a real negative-RLS test that short-circuits Phase 1 exit if user-isolation is broken.

**Critical factual correction vs the previous draft of this plan.** The previous draft advised naming the file `middleware.ts` "for compatibility with Supabase docs." That advice was wrong as of April 2026. This plan follows CONTEXT.md D-25/D-26/D-27:

- The file at the repo root is `proxy.ts` (NOT `middleware.ts`).
- The exported function is `proxy` (NOT `middleware`).
- The helper is `lib/supabase/proxy.ts` exporting `createProxyClient` (NOT `lib/supabase/middleware.ts` / `createMiddlewareClient`).
- Inside the `proxy` function, cookies MUST be explicitly synced from the incoming request to a **mutable** `NextResponse.next({ request })` response before returning. Without this sync, refreshed session cookies land on a response that is discarded — the known Next 16 sign-out-loop bug fires.

Requirements covered:
- **AUTH-02** — magic-link email sign-in (Supabase `signInWithOtp` + callback exchange)
- **AUTH-04** — session persists across refresh (proxy.ts refreshes cookies on every matched request)
- **PERS-02** — every user-data table has RLS keyed to `auth.uid()`, proven by the negative test

Out of scope (explicitly):
- AUTH-01 (anonymous sign-in on first visit) — Plan 07 calls `supabase.auth.signInAnonymously()` from the client shell. This plan ENABLES anonymous sign-ins on the project (dashboard config) and the schema/RLS works for anon users, but the client call site is Plan 07.
- AUTH-03 (migration on anon->authed) — Plan 03 builds `/api/migrate-anonymous`; Plan 07 wires the client trigger.
- AUTH-05 (sign-out from any screen) — Plan 07 renders the SettingsMenu. This plan ships the `signOut` Server Action that Plan 07 imports.

Schema scope: 5 tables from design doc section 9 (`player_state`, `library_entries`, `cosmetic_catalogue`, `user_cosmetics` — `auth.users` is Supabase-managed, not a user table) PLUS `encounter_attempts` audit table. The audit table schema lands here so Phase 2 can start grading work without a schema detour. Phase 2 WRITES to it; Phase 1 just defines it.

Purpose: three of Phase 1's twelve requirements close here. Downstream plans inherit a working server client + proxy; they don't touch Supabase wiring again.
Output: Supabase migrations applied locally, RLS negative test green, magic-link flow reachable end-to-end on localhost, `proxy.ts` + `lib/supabase/proxy.ts` land per D-25/D-26/D-27.
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@docs/cluu-v1-design.md

<interfaces>
<!-- Pinned versions from STACK.md. Plan 01 did NOT install these; this plan does. -->

```
@supabase/ssr@^0.10.2
@supabase/supabase-js@^2.103.3
zod@^3.23.0             # used in app/auth/actions.ts for email validation
```

<!-- From design doc section 9 — the 5 data-model tables. -->
<!-- `users` is NOT a user-created table — Supabase manages `auth.users`. -->
<!-- We store profile-ish columns (display_name, last_active_at) on `player_state` OR a separate `public.users` -->
<!-- — design doc shows a `users` table as a plan-of-record; we'll add a minimal `public.users` row mirrored from auth.users. -->

<!-- From CONTEXT.md D-25/D-26/D-27 — the Next 16 proxy convention. Copy verbatim. -->

```ts
// proxy.ts (root) — D-25: file is `proxy.ts`, function is `proxy`.
// D-26: cookie-sync pattern — mutable response + explicit copy.
import { NextResponse, type NextRequest } from 'next/server';
import { createProxyClient } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // Mutable response that will receive refreshed cookies (D-26).
  let response = NextResponse.next({ request });
  const supabase = createProxyClient(request, response);
  // Trigger session refresh. MAY set cookies on `response` via the writer passed to createProxyClient.
  await supabase.auth.getUser();   // D-17: getUser, NEVER getSession
  return response;
}

export const config = {
  matcher: [
    // Skip static assets and the favicon; run on everything else.
    '/((?!_next/static|_next/image|favicon.ico|sprites/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
```

<!-- From CONTEXT.md D-27 — `lib/supabase/proxy.ts` helper (renamed from middleware.ts). -->

```ts
// lib/supabase/proxy.ts — D-27: file is `proxy.ts`, helper is `createProxyClient`.
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from './types';

export function createProxyClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // D-26 cookie-sync: set on the request AND on the mutable response
          // so refreshed cookies land on the response being returned to the browser.
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
}
```

<!-- From STACK.md "Integration gotchas section 3" -->
- Use `@supabase/ssr`'s `createBrowserClient` in client components, `createServerClient` in server components, route handlers, and middleware/proxy.
- NEVER mix `@supabase/auth-helpers-nextjs` (deprecated) with `@supabase/ssr`.
- Middleware pattern: read cookies -> `supabase.auth.getUser()` -> refresh JWT -> pass through.
- Magic-link callback lands on `/auth/callback?code=...` — handle with `exchangeCodeForSession`.

<!-- From ARCHITECTURE.md Anti-Pattern 5 — D-17 enforcement -->
- Trusting `auth.getSession()` in Server Components/Actions/Route Handlers is WRONG.
- `getSession()` does not re-validate — an expired/forged cookie may appear valid.
- Always call `supabase.auth.getUser()` on the server.

<!-- From CONTEXT.md "specifics" — magic-link page copy -->
- 3 lines of copy + one input + one button. No marketing. Phase 5 polishes.

<!-- From design doc section 9 — exact columns for each table -->
```
player_state: user_id (fk), cluu_mood (enum), cluu_cosmetics (jsonb), island_progress (jsonb), unlocked_biomes (text[]), updated_at
library_entries: id (uuid), user_id (fk), encounter_id (text), prompt_text, generated_response, grade (enum), tags (text[]), created_at
cosmetic_catalogue: id (text), slot (enum), name, source (enum), sprite_path, unlock_condition (jsonb)
user_cosmetics: user_id (fk), cosmetic_id (fk), acquired_at, acquisition_source (text)
```
<!-- encounter_attempts audit table (Phase 2 uses, Phase 1 defines to avoid later schema migration): -->
```
encounter_attempts: id (uuid), user_id (fk), encounter_id (text), verdict (enum: pass|flair|fail), prompt_hash (text), tokens_used (int), cached (boolean), created_at
```
<!-- Plan 03 idempotency flag (added to player_state): -->
```
player_state.migration_processed boolean not null default false
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Supabase SDK install, schema migrations, RLS policies, types file</name>
  <files>package.json, .env.example, supabase/config.toml, supabase/migrations/20260420000001_init_schema.sql, supabase/migrations/20260420000002_rls_policies.sql, lib/supabase/types.ts</files>

  <read_first>
    - docs/cluu-v1-design.md section 9 (lines 266-307) — the exact columns for each of the 5 tables
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-18 (RLS on every table), D-04 (anon sign-ins + updateUser upgrade path)
    - .planning/research/STACK.md — "Integration gotchas section 3" (@supabase/ssr pinned versions)
    - .planning/research/ARCHITECTURE.md — "Cross-Cutting Concerns" RLS row ("user_id = auth.uid() on every read/write")
    - .planning/research/PITFALLS.md — Pitfall 4 (anon->authed migration; `migration_processed` flag is Plan 03's idempotency bit and must land on player_state here)
    - https://supabase.com/docs/guides/local-development/cli/getting-started — CLI init + migration workflow
    - https://supabase.com/docs/guides/auth/auth-anonymous — anonymous sign-ins (confirms D-04 flow)
  </read_first>

  <action>
1. **Install Supabase dependencies** (per STACK.md pinned versions):
```bash
cd /Users/rainierpotgieter/development/cluu
pnpm add @supabase/ssr@^0.10.2 @supabase/supabase-js@^2.103.3 zod@^3.23.0
pnpm add -D supabase
```

The `supabase` dev dep gives you the CLI via `pnpm exec supabase ...`.

2. **Initialize the local Supabase project** (generates `supabase/config.toml`):
```bash
pnpm exec supabase init
```

If this prompts about VSCode/IntelliJ — decline both for minimalism. The `supabase/` directory now contains `config.toml` and an empty `migrations/` directory.

3. **Edit `supabase/config.toml`** to enable anonymous sign-ins locally (mirrors the dashboard config in `user_setup`). Find the `[auth]` section and set:
```toml
[auth]
enabled = true
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
enable_anonymous_sign_ins = true     # D-04 — anonymous users are real auth.users rows
enable_confirmations = false         # magic link auto-confirms on first click in dev

[auth.email]
enable_signup = true
double_confirm_changes = false
enable_confirmations = false         # dev convenience; production relies on Supabase defaults
```

4. **Create `supabase/migrations/20260420000001_init_schema.sql`** — the 5 data-model tables + the `encounter_attempts` audit table + the `migration_processed` idempotency column on `player_state`. `auth.users` is Supabase-managed (do NOT redefine it). For the design doc's "users" table, we use a minimal `public.users` mirror that trigger-populates from `auth.users`:

```sql
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
```

5. **Create `supabase/migrations/20260420000002_rls_policies.sql`** — RLS on every table, `auth.uid() = user_id` policies (D-18, PERS-02):

```sql
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
```

6. **Create `lib/supabase/types.ts`** — typed `Database` interface matching the schema. This is a hand-written minimal version; Phase 2 can regenerate via `supabase gen types typescript` if needed:

```ts
// lib/supabase/types.ts
// Hand-written minimal Database type. Matches migrations 20260420000001 + 20260420000002.
// Phase 2 may regenerate via `pnpm exec supabase gen types typescript --local`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CluuMood = 'stoked' | 'content' | 'sleepy' | 'blue';
export type VerdictGrade = 'pass' | 'flair';
export type AttemptVerdict = 'pass' | 'flair' | 'fail';
export type CosmeticSlot = 'head' | 'body' | 'back' | 'eyes';
export type CosmeticSource = 'encounter_reward' | 'dlc_pack' | 'event';

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          last_active_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          last_active_at?: string;
        };
        Update: {
          email?: string | null;
          display_name?: string | null;
          last_active_at?: string;
        };
      };
      player_state: {
        Row: {
          user_id: string;
          cluu_mood: CluuMood;
          cluu_cosmetics: Json;
          island_progress: Json;
          unlocked_biomes: string[];
          migration_processed: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          cluu_mood?: CluuMood;
          cluu_cosmetics?: Json;
          island_progress?: Json;
          unlocked_biomes?: string[];
          migration_processed?: boolean;
          updated_at?: string;
        };
        Update: {
          cluu_mood?: CluuMood;
          cluu_cosmetics?: Json;
          island_progress?: Json;
          unlocked_biomes?: string[];
          migration_processed?: boolean;
          updated_at?: string;
        };
      };
      library_entries: {
        Row: {
          id: string;
          user_id: string;
          encounter_id: string;
          prompt_text: string;
          generated_response: string;
          grade: VerdictGrade;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          encounter_id: string;
          prompt_text: string;
          generated_response: string;
          grade: VerdictGrade;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          prompt_text?: string;
          generated_response?: string;
          grade?: VerdictGrade;
          tags?: string[];
        };
      };
      cosmetic_catalogue: {
        Row: {
          id: string;
          slot: CosmeticSlot;
          name: string;
          source: CosmeticSource;
          sprite_path: string;
          unlock_condition: Json;
        };
        Insert: {
          id: string;
          slot: CosmeticSlot;
          name: string;
          source: CosmeticSource;
          sprite_path: string;
          unlock_condition?: Json;
        };
        Update: Partial<{
          name: string;
          sprite_path: string;
          unlock_condition: Json;
        }>;
      };
      user_cosmetics: {
        Row: {
          user_id: string;
          cosmetic_id: string;
          acquired_at: string;
          acquisition_source: string | null;
        };
        Insert: {
          user_id: string;
          cosmetic_id: string;
          acquired_at?: string;
          acquisition_source?: string | null;
        };
        Update: never;
      };
      encounter_attempts: {
        Row: {
          id: string;
          user_id: string;
          encounter_id: string;
          verdict: AttemptVerdict;
          prompt_hash: string;
          tokens_used: number;
          cached: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          encounter_id: string;
          verdict: AttemptVerdict;
          prompt_hash: string;
          tokens_used?: number;
          cached?: boolean;
          created_at?: string;
        };
        Update: never;
      };
    };
    Enums: {
      cluu_mood: CluuMood;
      verdict_grade: VerdictGrade;
      attempt_verdict: AttemptVerdict;
      cosmetic_slot: CosmeticSlot;
      cosmetic_source: CosmeticSource;
    };
  };
};
```

7. **Expand `.env.example`** — replace the Supabase section from Plan 01 with real comments:

```env
# Supabase (Plan 02) — create the project in the dashboard first (see user_setup).
# Dashboard: Supabase -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
# SERVER-ONLY — never expose to the browser. Used by tests + Phase 2 grading gateway.
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

8. **Apply migrations locally** to verify they run cleanly:
```bash
pnpm exec supabase start          # starts local Postgres + auth
pnpm exec supabase db reset       # applies migrations from scratch
pnpm exec supabase status         # prints local URLs + keys
```

Copy the local `NEXT_PUBLIC_SUPABASE_URL`, anon key, and service role key from `supabase status` into `.env.local` (NOT committed). These power Task 3's RLS negative test.
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu && test -f supabase/config.toml && test -f supabase/migrations/20260420000001_init_schema.sql && test -f supabase/migrations/20260420000002_rls_policies.sql && test -f lib/supabase/types.ts && grep -q '@supabase/ssr' package.json && grep -q '@supabase/supabase-js' package.json && grep -q 'create table public.player_state' supabase/migrations/20260420000001_init_schema.sql && grep -q 'migration_processed boolean' supabase/migrations/20260420000001_init_schema.sql && grep -q 'enable row level security' supabase/migrations/20260420000002_rls_policies.sql && grep -qE 'auth\.uid\(\)\s*=\s*user_id' supabase/migrations/20260420000002_rls_policies.sql && grep -q 'enable_anonymous_sign_ins = true' supabase/config.toml && pnpm typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `@supabase/ssr`, `@supabase/supabase-js`, `zod` installed (grep in package.json)
    - `supabase/config.toml` has `enable_anonymous_sign_ins = true` (D-04)
    - `supabase/migrations/20260420000001_init_schema.sql` defines: `public.users`, `public.player_state`, `public.library_entries`, `public.cosmetic_catalogue`, `public.user_cosmetics`, `public.encounter_attempts` (six CREATE TABLE statements)
    - `public.player_state` has `migration_processed boolean not null default false` (Plan 03 idempotency flag)
    - `supabase/migrations/20260420000002_rls_policies.sql` contains `enable row level security` at least 6 times (one per table)
    - Every user-data policy uses `auth.uid() = user_id` (grep matches at least 10 occurrences for the 6 tables' SELECT/INSERT/UPDATE combinations)
    - `lib/supabase/types.ts` exports `Database`, `CluuMood`, `Json` types
    - `.env.example` has the three Supabase env var names with dashboard-location comments
    - `pnpm typecheck` exits 0 (types.ts compiles)
    - `pnpm exec supabase db reset` completes without error (migrations apply cleanly)
    - `grep -r "middleware.ts" supabase/ lib/supabase/` returns ZERO matches (D-27: proxy.ts, not middleware.ts)
  </acceptance_criteria>

  <done>Schema + RLS applied, idempotency flag on player_state ready for Plan 03, types file compiles. Supabase CLI local stack boots.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Supabase clients (browser, server, proxy helper) + root proxy.ts per D-25/D-26/D-27 + magic-link flow</name>
  <files>lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/proxy.ts, proxy.ts, app/auth/signin/page.tsx, app/auth/actions.ts, app/auth/callback/route.ts</files>

  <read_first>
    - https://supabase.com/docs/guides/auth/server-side/nextjs — official @supabase/ssr Next.js guide. Read LIVE — the executor is looking for any 2026 Q2 deltas in the cookie API shape.
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-25 (proxy.ts not middleware.ts), D-26 (cookie-sync pattern), D-27 (lib/supabase/proxy.ts not lib/supabase/middleware.ts), D-17 (getUser, not getSession)
    - .planning/research/ARCHITECTURE.md — "Anti-Pattern 5: Trusting auth.getSession() in Server Components" (lines ~608-613)
    - .planning/research/STACK.md — "Integration gotchas section 3" — @supabase/ssr pattern; never mix with auth-helpers-nextjs
    - .planning/research/PITFALLS.md — Pitfall 4 prevention (migration flow) — Plan 02 enables the flow by wiring the callback; Plan 03/07 close the loop
    - Interfaces block above — the exact proxy.ts + createProxyClient skeletons MUST be followed verbatim
  </read_first>

  <action>

**CRITICAL — D-25/D-26/D-27 FILE NAMING.** Every `proxy`/`createProxyClient` identifier below is non-negotiable. If the executor is tempted to rename any of these to `middleware`/`createMiddlewareClient` "for Supabase docs compatibility," STOP and re-read CONTEXT.md D-25/D-26/D-27. The Supabase docs have been updated to match Next 16's `proxy.ts` convention as of April 2026; the old guidance is factually stale.

1. **Create `lib/supabase/client.ts`** — browser client used by Client Components (Plan 07 consumes this):

```ts
// lib/supabase/client.ts
// Browser-side Supabase client. Used by Client Components only.
// Server paths use lib/supabase/server.ts; the proxy uses lib/supabase/proxy.ts.
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

2. **Create `lib/supabase/server.ts`** — cookie-bound server client for Server Components, Server Actions, and Route Handlers. Uses `next/headers` `cookies()` handle. D-17: server paths call `supabase.auth.getUser()`, NEVER `getSession()` (this file doesn't itself call getUser — consumers do — but the comment warns against the anti-pattern):

```ts
// lib/supabase/server.ts
// Server-side Supabase client. Used by Server Components, Server Actions, Route Handlers.
// D-17: every consumer MUST call supabase.auth.getUser() — NEVER getSession() (ARCHITECTURE Anti-Pattern 5).
import 'server-only';
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components cannot set cookies — but Server Actions and Route Handlers can.
          // Wrap in try/catch so Server Component callers don't crash (they just miss a refresh;
          // the proxy.ts refresh covers them on the next request).
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — ignore (proxy.ts handles refresh).
          }
        },
      },
    },
  );
}
```

3. **Create `lib/supabase/proxy.ts`** (D-27 — file renamed from `middleware.ts`, helper is `createProxyClient` not `createMiddlewareClient`):

```ts
// lib/supabase/proxy.ts
// D-27: renamed from lib/supabase/middleware.ts. Helper is createProxyClient (not createMiddlewareClient).
// Consumed by the root proxy.ts. The response parameter is the MUTABLE response returned from the proxy
// — cookies set via `response.cookies.set(...)` here land on the response the browser receives (D-26).
import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from './types';

export function createProxyClient(request: NextRequest, response: NextResponse) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // D-26 cookie-sync: set on the request AND on the mutable response.
          // If you skip the response write, refreshed cookies are lost and the known
          // Next 16 sign-out-loop bug fires.
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );
}
```

4. **Create the root `proxy.ts`** (D-25 — file is `proxy.ts`, function is `proxy`):

```ts
// proxy.ts (root)
// D-25: Next 16 file is proxy.ts (NOT middleware.ts). Function exported is `proxy` (NOT `middleware`).
// D-26: mutable response + explicit cookie sync prevents the known sign-out-loop bug.
// D-17: calls supabase.auth.getUser() — NEVER getSession().
//
// Sentry wiring for this proxy runs in Plan 06 via Sentry.captureRequestError / instrumentation.ts.
import { NextResponse, type NextRequest } from 'next/server';
import { createProxyClient } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  // Mutable response that will receive refreshed cookies (D-26 step 1).
  let response = NextResponse.next({ request });

  const supabase = createProxyClient(request, response);

  // Trigger the session refresh. createProxyClient's setAll callback writes refreshed
  // cookies to `response.cookies` — which is why `response` MUST be mutable and declared
  // with `let`, not const-returned from a helper (D-26 rationale).
  // D-17: getUser re-validates with the Supabase auth server; getSession would only read the cookie locally.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip static assets + the favicon; run on everything else (including /api/* and /auth/*).
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sprites/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
```

5. **Create `app/auth/signin/page.tsx`** — minimal magic-link page. 3 lines of copy + email input + submit button (CONTEXT.md "specifics"):

```tsx
// app/auth/signin/page.tsx
// AUTH-02: magic-link sign-in. Phase 5 polishes.
// Uses the signIn Server Action from app/auth/actions.ts.
import { signIn } from '../actions';

export default function SignInPage() {
  return (
    <main
      style={{
        maxWidth: 420,
        margin: '4rem auto',
        padding: '2rem 1.5rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: 0, marginBottom: '0.75rem' }}>Save your island</h1>
      <p style={{ margin: 0, marginBottom: '0.5rem', color: '#555' }}>
        Enter your email. We&apos;ll send you a link.
      </p>
      <p style={{ margin: 0, marginBottom: '1.5rem', color: '#777', fontSize: '0.85rem' }}>
        No password. Nothing else.
      </p>
      <form action={signIn} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          style={{
            padding: '0.75rem 0.875rem',
            fontSize: '1rem',
            borderRadius: 8,
            border: '1px solid #d9d6ce',
            background: '#fff',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.75rem 1rem',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: 8,
            border: 'none',
            background: '#2d6a4f',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Send link
        </button>
      </form>
    </main>
  );
}
```

6. **Create `app/auth/actions.ts`** — `signIn` + `signOut` Server Actions. Plan 07 imports `signOut` into the SettingsMenu:

```ts
// app/auth/actions.ts
// Server Actions for auth flows. Plan 07 imports signOut into the SettingsMenu.
// AUTH-02 (signIn): Supabase magic-link via signInWithOtp.
// AUTH-05 (signOut): clears session; Plan 07 wires the UI.
'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const EmailSchema = z.string().email().max(254);

export async function signIn(formData: FormData) {
  const rawEmail = formData.get('email');
  const parsed = EmailSchema.safeParse(rawEmail);
  if (!parsed.success) {
    // Minimal: bounce back to signin. Phase 5 adds a flash-error UI.
    redirect('/auth/signin?error=invalid_email');
  }

  const supabase = await createServerClient();
  const hdrs = await headers();
  const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') ?? 'http';
  const origin = `${proto}://${host}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect('/auth/signin?error=send_failed');
  }

  redirect('/auth/signin?sent=1');
}

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  redirect('/');
}
```

7. **Create `app/auth/callback/route.ts`** — magic-link callback. Runs `exchangeCodeForSession`, redirects to `/play`:

```ts
// app/auth/callback/route.ts
// AUTH-02 completion: magic-link redirect lands here with ?code=...
// We exchange the code for a session (which sets cookies via the server client)
// then redirect to /play.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/play';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/signin?error=no_code', url.origin));
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/auth/signin?error=exchange_failed', url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu && test -f lib/supabase/client.ts && test -f lib/supabase/server.ts && test -f lib/supabase/proxy.ts && test -f proxy.ts && test -f app/auth/signin/page.tsx && test -f app/auth/actions.ts && test -f app/auth/callback/route.ts && ! test -f middleware.ts && ! test -f lib/supabase/middleware.ts && grep -q 'export async function proxy' proxy.ts && ! grep -q 'export async function middleware' proxy.ts && grep -q 'createProxyClient' lib/supabase/proxy.ts && ! grep -q 'createMiddlewareClient' lib/supabase/proxy.ts && grep -qE 'NextResponse\.next\(\s*\{\s*request' proxy.ts && grep -q 'response.cookies.set' lib/supabase/proxy.ts && grep -q 'supabase.auth.getUser' proxy.ts && ! grep -q 'supabase.auth.getSession' proxy.ts && ! grep -q 'getSession' lib/supabase/server.ts && grep -q "import 'server-only'" lib/supabase/server.ts && grep -q 'exchangeCodeForSession' app/auth/callback/route.ts && grep -q 'signInWithOtp' app/auth/actions.ts && grep -q 'auth.signOut' app/auth/actions.ts && pnpm typecheck && pnpm build</automated>
  </verify>

  <acceptance_criteria>
    - `proxy.ts` exists at the REPOSITORY ROOT (not under `app/`, not under `lib/`) — D-25
    - `proxy.ts` exports `async function proxy(request: NextRequest)` — grep matches; `export async function middleware` is ABSENT: `! grep -q 'export async function middleware' proxy.ts`
    - `proxy.ts` uses `NextResponse.next({ request })` to create a mutable response BEFORE calling `createProxyClient` — grep: `grep -qE 'NextResponse\.next\(\s*\{\s*request' proxy.ts`
    - `proxy.ts` calls `supabase.auth.getUser()` AFTER client creation — D-17. `supabase.auth.getSession` MUST NOT appear: `! grep -q 'supabase.auth.getSession' proxy.ts`
    - `lib/supabase/proxy.ts` exists (NOT `lib/supabase/middleware.ts`) and exports `createProxyClient`: `grep -q 'export function createProxyClient' lib/supabase/proxy.ts`
    - `lib/supabase/proxy.ts` does NOT export `createMiddlewareClient`: `! grep -q 'createMiddlewareClient' lib/supabase/proxy.ts`
    - `lib/supabase/proxy.ts` `setAll` callback sets cookies on BOTH `request.cookies` AND `response.cookies` (D-26): `grep -q 'request.cookies.set' lib/supabase/proxy.ts && grep -q 'response.cookies.set' lib/supabase/proxy.ts`
    - NO file named `middleware.ts` exists anywhere in the repo: `! test -f middleware.ts && ! test -f lib/supabase/middleware.ts`
    - `lib/supabase/server.ts` starts with `import 'server-only'` and exports `createServerClient` (async)
    - `lib/supabase/server.ts` contains NO `getSession` reference: `! grep -q 'getSession' lib/supabase/server.ts`
    - `lib/supabase/client.ts` uses `createBrowserClient` from `@supabase/ssr`
    - `app/auth/actions.ts` exports `signIn` (uses `signInWithOtp`) AND `signOut` (uses `auth.signOut`). Both are `'use server'`.
    - `app/auth/callback/route.ts` exports `GET` and calls `exchangeCodeForSession`. Runtime is `nodejs`.
    - `app/auth/signin/page.tsx` renders a form with `action={signIn}` and a single email input
    - `pnpm typecheck` exits 0
    - `pnpm build` exits 0 (proves Next 16 sees proxy.ts correctly and the routes compile)
  </acceptance_criteria>

  <done>Supabase browser + server + proxy helpers land per D-25/D-26/D-27. Root `proxy.ts` uses the mutable-response cookie-sync pattern from D-26. Magic-link sign-in + callback flow is end-to-end on the server side. `signIn`/`signOut` Server Actions are ready for Plan 07 to import. Zero `middleware.ts` / `createMiddlewareClient` references anywhere.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Negative RLS test — user A cannot SELECT user B's player_state (PERS-02 ship gate)</name>
  <files>tests/rls-negative.test.ts, vitest.config.ts</files>

  <read_first>
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-18 (RLS on every table with a negative test before Phase 1 exits)
    - .planning/research/ARCHITECTURE.md — "Cross-Cutting Concerns" RLS row
    - supabase/migrations/20260420000002_rls_policies.sql (Task 1) — the exact policies we're testing against
    - lib/supabase/types.ts (Task 1) — typed Database for the service-role client
    - https://supabase.com/docs/reference/javascript/auth-signinwithpassword — used by the test to authenticate two isolated users via admin APIs
    - package.json — vitest config + scripts
  </read_first>

  <behavior>
    - Test 1: Create two distinct users (user_a, user_b) via the service-role admin client. Both get auto-created `player_state` rows (the trigger fires).
    - Test 2: Sign in as user_a via a fresh anon-key-bound client. SELECT from `player_state` — exactly ONE row is returned (their own). This is the positive sanity.
    - Test 3: Sign in as user_a. SELECT `player_state` with `user_id = <user_b.id>` — returns ZERO rows (not a 500, not user_b's data — RLS blocks it silently). This is the negative gate for PERS-02.
    - Test 4: Try to UPDATE user_b's `player_state` from user_a's session — the update affects ZERO rows (RLS `with check` blocks it).
    - Cleanup: delete both users via service-role at the end of the suite.
  </behavior>

  <action>

The RLS negative test needs a real running Postgres with the Supabase auth schema. We target the **local Supabase stack** (`pnpm exec supabase start` in Task 1). The test is skipped in CI until Phase 5 wires a CI-runnable stack; for Phase 1, running locally is sufficient to close PERS-02.

1. **Add a conditional to `vitest.config.ts`** — the negative RLS test lives in `tests/` (separate from unit tests colocated with source files). Update the existing `vitest.config.ts` (from Plan 01) to include `tests/**/*.test.ts`:

```ts
// vitest.config.ts — updated to include integration-style tests under tests/
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    testTimeout: 15_000,   // RLS test hits a local Postgres; 15s headroom
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

2. **Create `tests/rls-negative.test.ts`** — uses the service-role key to provision two users, then anon-key clients to verify RLS blocks cross-user reads/writes. Skipped via `describe.skipIf` when env vars are absent so the suite never fails on a clean clone:

```ts
// tests/rls-negative.test.ts
// PERS-02 ship gate: user A cannot read or mutate user B's player_state.
// Runs against the local Supabase stack (pnpm exec supabase start) in dev;
// Phase 5 may wire a CI-runnable stack. Skipped when env vars are absent.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCreds = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

type UserHandle = { id: string; email: string; password: string };

async function adminCreateUser(email: string, password: string): Promise<UserHandle> {
  const admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,    // skip email verification for the test
  });
  if (error) throw new Error(`admin.createUser failed: ${error.message}`);
  return { id: data.user!.id, email, password };
}

async function adminDeleteUser(id: string): Promise<void> {
  const admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.auth.admin.deleteUser(id);
}

async function signedInClient(user: UserHandle) {
  const client = createClient<Database>(SUPABASE_URL!, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`signIn failed for ${user.email}: ${error.message}`);
  return client;
}

describe.skipIf(!hasCreds)('RLS negative test — PERS-02 (D-18)', () => {
  let userA: UserHandle;
  let userB: UserHandle;

  beforeAll(async () => {
    const suffix = Date.now();
    userA = await adminCreateUser(`rls-a-${suffix}@example.test`, 'rls-test-pw-A-123!');
    userB = await adminCreateUser(`rls-b-${suffix}@example.test`, 'rls-test-pw-B-123!');
    // The trigger auto-creates public.player_state rows for both.
  });

  afterAll(async () => {
    // Cascade-deletes the public.player_state rows too.
    if (userA) await adminDeleteUser(userA.id).catch(() => {});
    if (userB) await adminDeleteUser(userB.id).catch(() => {});
  });

  it('user A can SELECT their own player_state (positive sanity)', async () => {
    const client = await signedInClient(userA);
    const { data, error } = await client.from('player_state').select('*');
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBe(1);
    expect(data![0].user_id).toBe(userA.id);
  });

  it('user A cannot read another user (user B) player_state row [PERS-02 NEGATIVE GATE]', async () => {
    const client = await signedInClient(userA);
    const { data, error } = await client
      .from('player_state')
      .select('*')
      .eq('user_id', userB.id);
    // RLS returns empty — NOT an error, NOT user B's data.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('user A cannot UPDATE user B player_state row (RLS with check blocks it)', async () => {
    const client = await signedInClient(userA);
    const { data, error } = await client
      .from('player_state')
      .update({ cluu_mood: 'stoked' })
      .eq('user_id', userB.id)
      .select();
    // No rows match the policy — update affects zero rows.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Verify user B's row was NOT mutated — read via service role.
    const admin = createClient<Database>(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: bState } = await admin
      .from('player_state')
      .select('cluu_mood')
      .eq('user_id', userB.id)
      .single();
    expect(bState?.cluu_mood).toBe('content');  // default, unchanged
  });

  it('user A cannot INSERT a library_entry as user B (RLS with check on user_id)', async () => {
    const client = await signedInClient(userA);
    const { error } = await client.from('library_entries').insert({
      user_id: userB.id,                         // attempted spoof
      encounter_id: 'meadow_test',
      prompt_text: 'should not land',
      generated_response: '...',
      grade: 'pass',
      tags: [],
    });
    // RLS rejects this insert with a policy violation.
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/row.?level security|policy|violates/);
  });
});
```

3. **Run the test** against the local Supabase stack started in Task 1:

```bash
# Assumes `pnpm exec supabase start` is running and .env.local has the local URL + keys.
cd /Users/rainierpotgieter/development/cluu
pnpm test tests/rls-negative.test.ts
```

4. **Document the dev loop** — add a note to the phase SUMMARY template so the human operator knows to start Supabase before running this test:

```
To run the RLS negative test locally:
  1. pnpm exec supabase start
  2. Copy `API URL`, `anon key`, `service_role key` from `pnpm exec supabase status` into .env.local
  3. pnpm test tests/rls-negative.test.ts
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu && test -f tests/rls-negative.test.ts && grep -q 'describe.skipIf' tests/rls-negative.test.ts && grep -q 'cannot read another user' tests/rls-negative.test.ts && grep -q 'PERS-02' tests/rls-negative.test.ts && pnpm typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `tests/rls-negative.test.ts` exists and contains `describe.skipIf(!hasCreds)` so the suite never fails on a clean clone without Supabase env vars
    - Test file contains at least 4 test cases: positive read, negative cross-user read, negative cross-user update, negative cross-user insert
    - Negative-read test name contains the phrase `cannot read another user` (grep matches)
    - Test file references `PERS-02` in a comment or describe block (REQ-ID traceability)
    - `vitest.config.ts` `include` array covers both colocated `*.test.ts` files AND `tests/**/*.test.ts`
    - `pnpm typecheck` exits 0
    - When local Supabase is running AND .env.local has the right keys, `pnpm test tests/rls-negative.test.ts` exits 0 with 4/4 passing (this is the PERS-02 ship-gate assertion — Phase 1 cannot exit without it)
  </acceptance_criteria>

  <done>Negative RLS test lands as a real Vitest test — NOT a TODO. User A's attempt to read, update, or insert-as user B returns zero rows or a policy violation. PERS-02 is verifiable on demand. Suite auto-skips when creds are absent so CI on a clean clone stays green until Phase 5 wires a CI Supabase stack.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser -> `proxy.ts` | Every request passes through; cookies are the only auth material |
| Browser -> Server Actions / Route Handlers | Same-origin; Next.js CSRF protection on Server Actions |
| Browser -> `app/auth/signin` -> Supabase (magic-link send) | User-submitted email; validated via zod; rate-limited by Supabase |
| Magic-link URL -> `/auth/callback` | The `?code=` param is the trust anchor; single-use and short-lived |
| Server -> Supabase (anon key) | Cookie-bound session defines the user; RLS is the ultimate authority |
| Server -> Supabase (service role key) | Server-only; NEVER exposed to the browser; used by tests + Phase 2 grading |
| Postgres RLS -> row access | THE load-bearing security boundary; tested by Task 3 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Spoofing | Client forges a Supabase session cookie | mitigate | Server reads cookies via `@supabase/ssr` + `supabase.auth.getUser()` which re-validates with Supabase (D-17). Forged cookies return null user. |
| T-02-02 | Tampering | Client attempts to INSERT a row with a spoofed user_id | mitigate | RLS `with check (auth.uid() = user_id)` on every user-scoped table. Negative test in Task 3 proves insert-as-other-user fails. |
| T-02-03 | Repudiation | User claims "I never sent a magic-link request" | accept | Supabase auth logs retain 30 days; `app/auth/actions.ts signIn` validates email with zod and the flow is observable in Supabase dashboard. |
| T-02-04 | Information Disclosure | `SUPABASE_SERVICE_ROLE_KEY` leaks to browser bundle | mitigate | `.env.example` annotates as server-only; `lib/supabase/server.ts` has `import 'server-only'`. Service role is only referenced from `tests/` (Node execution) and Phase 2 grading (server route). |
| T-02-05 | Information Disclosure | Magic-link email previewer (some email clients) fetches the callback URL, silently signs the user in | accept | `exchangeCodeForSession` is single-use — the first fetch consumes the code. Phase 1 accepts this; Phase 5 may add a "confirm sign-in" interstitial. |
| T-02-06 | Denial of Service | Attacker floods `/auth/signin` with magic-link requests | mitigate | Supabase rate-limits email sends (4/hr/email default). Phase 2's Upstash limiter can add an IP-based cap if abuse surfaces. |
| T-02-07 | Elevation of Privilege | `getSession()` accidentally used in a Server Component returns forged user | mitigate | D-17 enforcement via grep in acceptance criteria: `! grep -q 'getSession' lib/supabase/server.ts`. ARCHITECTURE Anti-Pattern 5 is load-bearing and tested across Plans 02, 03, 07. |
| T-02-08 | Elevation of Privilege | Next 16 `proxy.ts` sign-out-loop bug (refreshed cookie lost, user appears signed-out) | mitigate | D-26 cookie-sync pattern — mutable `NextResponse.next({ request })` + explicit `response.cookies.set(...)` in `createProxyClient`. Verified by acceptance criteria grep on both files. |
| T-02-09 | Tampering | Client tries to read cross-user rows by passing `user_id=<other>` in query | mitigate | Task 3's negative RLS test (PERS-02 ship gate) proves RLS returns empty results, not errors, not cross-user data. |
| T-02-10 | Information Disclosure | `encounter_attempts.prompt_hash` with user_id enables cross-user correlation | accept | Phase 1 defines the table but does not write to it. Phase 2 will write only the hash (not the raw prompt) unless user opts in (OPS-03, Phase 4). |
</threat_model>

<verification>
1. `pnpm install` + `pnpm typecheck` green
2. `pnpm build` green (proves Next 16 discovers `proxy.ts` + all routes compile)
3. `pnpm exec supabase db reset` applies migrations cleanly
4. `pnpm test tests/rls-negative.test.ts` exits 0 with 4/4 passing when local Supabase is running + `.env.local` keys set (PERS-02 gate)
5. Manual (D-25/D-26/D-27 proof): `ls proxy.ts lib/supabase/proxy.ts` returns both files; `ls middleware.ts lib/supabase/middleware.ts 2>/dev/null` returns NO files
6. Manual (D-17 proof): `grep -rn "getSession" lib/ app/api/ proxy.ts` returns ZERO matches
7. Manual (magic-link end-to-end, requires local Supabase): visit `http://localhost:3000/auth/signin`, submit a real email (use Inbucket at `http://localhost:54324` for the local stack), click the link, land on `/play`, observe `auth.users` row created + `public.player_state` row auto-created via trigger. Refresh `/play` — still signed in (proxy.ts refreshes the cookie).
8. Manual (anonymous sign-ins enabled): from the browser DevTools console on `/play`, call `window.supabase.auth.signInAnonymously()` — returns a real auth.users row with `is_anonymous: true`. (Plan 07 automates this on first visit.)
</verification>

<success_criteria>
- AUTH-02: magic-link flow reachable — /auth/signin -> email -> Supabase -> /auth/callback -> /play
- AUTH-04: session refreshed on every matched request by root `proxy.ts` with D-26 cookie sync
- PERS-02: RLS on every user-data table, proven by Task 3's negative test (4 tests, 4/4 pass)
- D-17: every server path uses `supabase.auth.getUser()`, NEVER `getSession()` — enforced by grep
- D-18: RLS ENABLED on `public.users`, `public.player_state`, `public.library_entries`, `public.cosmetic_catalogue`, `public.user_cosmetics`, `public.encounter_attempts`
- D-25: root file is `proxy.ts` and exports `proxy` — grep-verified
- D-26: mutable `NextResponse.next({ request })` + explicit cookie writes in `createProxyClient` — grep-verified on both files
- D-27: `lib/supabase/proxy.ts` exists (NOT middleware.ts), exports `createProxyClient` (NOT createMiddlewareClient) — grep-verified
- Plan 03 unblocked: `player_state.migration_processed` column exists; `lib/supabase/server.ts` exports `createServerClient`; `lib/supabase/types.ts` exports `Database`
- Plan 07 unblocked: `app/auth/actions.ts` exports `signOut` (+ `signIn`); anonymous sign-ins enabled on the Supabase project
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-02-SUMMARY.md` with:
- Migration SHAs (both files' first-10-lines hashes) for future regen reference
- Confirmation that RLS negative test runs 4/4 green against local Supabase (PERS-02 gate met)
- Confirmation that `middleware.ts` does NOT exist anywhere in the repo (D-25 file-naming gate met)
- `grep -rn "getSession" lib/ app/ proxy.ts` output (expect empty)
- `grep -rn "createMiddlewareClient" .` output (expect empty; D-27 helper-naming gate)
- Supabase project URL (local + remote preview), anon key prefix (not the full key), and confirmation that anonymous sign-ins + magic-link are enabled in the dashboard
- Known issues: none expected. If the CLI can't `supabase db reset` (e.g. Docker not running), document the manual path.
</output>
