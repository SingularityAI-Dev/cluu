---
phase: 01-scaffold
plan: 02
subsystem: auth
tags: [supabase, ssr, postgres, rls, magic-link, proxy, nextjs-16, zod]

# Dependency graph
requires:
  - phase: 01-scaffold
    provides: Next 16.2.4 + React 19.2 + Vitest 4.1 + pnpm workspaces + biome + vercel.json (from Plan 01-01)
provides:
  - Supabase Postgres schema (5 data-model tables + encounter_attempts audit table)
  - Row-level security on every user-data table, keyed to auth.uid() = user_id
  - Browser + server + proxy-helper Supabase clients (lib/supabase/{client,server,proxy}.ts)
  - Root proxy.ts (D-25) with D-26 mutable-response cookie-sync pattern
  - signIn / signOut Server Actions + /auth/signin page + /auth/callback GET handler
  - Negative RLS test (PERS-02 ship gate) — 4/4 green against local Supabase
  - player_state.migration_processed idempotency flag ready for Plan 03
affects: [01-03-zustand-migration, 01-04-phaser-mount, 01-05-anchor-cluu, 01-07-signout-persistence, 02-walking-skeleton, 03-meadow-persistence]

# Tech tracking
tech-stack:
  added:
    - "@supabase/ssr@0.10.2"
    - "@supabase/supabase-js@2.104.0"
    - "zod@3.25.76"
    - "supabase@2.93.0 (CLI devDep)"
  patterns:
    - "Next 16 proxy.ts (NOT middleware.ts) — D-25"
    - "Mutable NextResponse.next({ request }) + explicit cookie.set on both request + response — D-26"
    - "lib/supabase/proxy.ts / createProxyClient (NOT middleware / createMiddlewareClient) — D-27"
    - "Every server-side auth read uses supabase.auth.getUser (D-17); the cached-session helper is forbidden and grep-gated"
    - "Trigger-backed table initialization: on_auth_user_created creates public.users + public.player_state rows on every auth.users insert (covers anon + magic-link signups uniformly)"
    - "Database type carries Relationships/Views/Functions so postgrest-js GenericSchema constraint resolves (hand-written until Phase 2 runs gen types)"

key-files:
  created:
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
  modified:
    - package.json (added @supabase/ssr, @supabase/supabase-js, zod, supabase CLI)
    - pnpm-lock.yaml
    - supabase/config.toml (enable_anonymous_sign_ins = true; site_url/redirect for /auth/callback; auth.email.double_confirm_changes = false for dev)
    - vitest.config.ts (include tests/**/*.{test,spec}.{ts,tsx}; testTimeout 15s)
    - .env.example (dashboard-location comments for the three Supabase vars)

key-decisions:
  - "Hand-wrote Database type rather than running supabase gen types — covers exact shape we need, avoids introducing generator flakiness at Phase 1; Phase 2 may regenerate."
  - "Added Update: Record<string, never> (not never) on user_cosmetics + encounter_attempts so postgrest-js's update<Row> overloads type-check for the negative-RLS test flows."
  - "Stopped the local Supabase stack at end of executor run to free Docker resources — user restarts on demand via pnpm exec supabase start before running the RLS test."

patterns-established:
  - "D-25/D-26/D-27 file naming is load-bearing — every downstream plan must reference proxy.ts / createProxyClient, never middleware.ts / createMiddlewareClient. Grep-gated by acceptance criteria."
  - "D-17 enforcement — getSession is forbidden in lib/, app/, and proxy.ts; server paths re-validate via auth.getUser. Comment prose was reworded to the-cached-session-helper so grep -rn 'getSession' lib/ app/ proxy.ts returns zero matches."
  - "RLS tests use describe.skipIf(!hasCreds) so CI on clean clones stays green until Phase 5 provisions a Supabase-capable runner."

requirements-completed:
  - AUTH-02
  - AUTH-04
  - PERS-02

# Metrics
duration: 36min
completed: 2026-04-21
---

# Phase 01 Plan 02: Supabase Auth Summary

**Supabase schema + RLS + magic-link flow + Next 16 proxy.ts (D-25/D-26/D-27) landing cleanly: 6 tables with 11 auth.uid()-keyed RLS policies, browser + server + proxy clients, and a 4/4-passing negative-RLS Vitest proving PERS-02.**

## Performance

- **Duration:** ~36 min (first commit 04:11:34, last commit 04:47:36, both UTC+02:00)
- **Started:** 2026-04-21T02:12:00Z (04:12:00 UTC+02:00)
- **Completed:** 2026-04-21T02:47:36Z (04:47:36 UTC+02:00)
- **Tasks:** 3 (+ 1 grep-gate comment tightening)
- **Files created:** 11
- **Files modified:** 5

## Accomplishments

- Six Postgres tables (public.users, public.player_state, public.library_entries, public.cosmetic_catalogue, public.user_cosmetics, public.encounter_attempts) with triggers auto-creating public.users + public.player_state rows on every auth.users insert — covers anonymous + magic-link signups identically.
- Row-level security enabled on all six tables; 11 policies keyed to auth.uid() = user_id (or auth.uid() = id for public.users).
- Three Supabase client helpers: browser (lib/supabase/client.ts), cookie-bound server (lib/supabase/server.ts, 'server-only' + getUser-only D-17), and proxy helper (lib/supabase/proxy.ts, D-27 createProxyClient with D-26 request + response cookie dual-write).
- Root proxy.ts (D-25) uses mutable NextResponse.next({ request }) and calls supabase.auth.getUser() to refresh the cookie on every matched request; Next 16 recognises and mounts it (build output: "ƒ Proxy (Middleware)").
- Magic-link flow: app/auth/signin page → signIn Server Action (zod-validated email + signInWithOtp with x-forwarded-host origin) → /auth/callback GET handler (exchangeCodeForSession + redirect to /play).
- signOut Server Action exported from app/auth/actions.ts ready for Plan 07 SettingsMenu import.
- Negative RLS test (tests/rls-negative.test.ts): 4 assertions — positive read, cross-user read (empty), cross-user update (zero rows + service-role verification of unchanged data), cross-user insert (policy violation). 4/4 passing against local Supabase stack. PERS-02 ship gate met.

## Task Commits

1. **Task 1 — Supabase SDK install, schema migrations, RLS policies, types file** — `e9eae8a` (feat)
2. **Task 2 — Supabase clients + root proxy.ts with D-26 cookie sync + magic-link flow** — `328ee4a` (feat)
3. **Task 3 — Negative RLS test (PERS-02 ship gate)** — `8a7ad55` (feat)
4. **Comment tightening so `getSession` grep gate is empty** — `1a4daf7` (chore)

## Migration SHAs (for future regen reference)

| File | First-10-lines SHA-256 | Full-file SHA-256 |
|---|---|---|
| `supabase/migrations/20260420000001_init_schema.sql` | `b4478d94…68b41bc6` | `9540ae6e…760bafb7` |
| `supabase/migrations/20260420000002_rls_policies.sql` | `fcf1c895…74b8d0ce` | `3bef25df…7049d7a7f` |

## Files Created/Modified

### Created
- `supabase/migrations/20260420000001_init_schema.sql` — 5 data-model tables + encounter_attempts audit; 5 enum types; 2 security-definer trigger functions.
- `supabase/migrations/20260420000002_rls_policies.sql` — RLS ENABLE on 6 tables; 11 policies keyed to auth.uid().
- `lib/supabase/types.ts` — hand-written Database type (Row/Insert/Update/Relationships per table + Views/Functions placeholders for postgrest-js constraint).
- `lib/supabase/client.ts` — `createBrowserClient` wrapper (Client Components only).
- `lib/supabase/server.ts` — cookie-bound `createServerClient` (`import 'server-only'`; setAll try/catch for Server Component callers).
- `lib/supabase/proxy.ts` — D-27 `createProxyClient`; setAll writes to both request.cookies and response.cookies for D-26 cookie-sync.
- `proxy.ts` (root) — D-25 `async function proxy`; mutable `NextResponse.next({ request })`; calls `supabase.auth.getUser()`; matcher skips static assets + image types.
- `app/auth/signin/page.tsx` — minimal magic-link form; `action={signIn}`.
- `app/auth/actions.ts` — `signIn(formData)` (zod email validation, `signInWithOtp`, x-forwarded-host origin) + `signOut()`.
- `app/auth/callback/route.ts` — GET handler that runs `exchangeCodeForSession` and redirects to `/play` (`runtime = 'nodejs'`).
- `tests/rls-negative.test.ts` — 4 test cases gated by `describe.skipIf(!hasCreds)`.

### Modified
- `package.json` — added `@supabase/ssr@^0.10.2`, `@supabase/supabase-js@^2.103.3`, `zod@^3.23.0` as deps; `supabase@2.93.0` as devDep.
- `pnpm-lock.yaml` — resolved lockfile.
- `supabase/config.toml` — `enable_anonymous_sign_ins = true`; `site_url = "http://localhost:3000"`; `additional_redirect_urls = ["http://localhost:3000/auth/callback"]`; `auth.email.double_confirm_changes = false` for dev.
- `vitest.config.ts` — `include` covers colocated `*.test.ts` AND `tests/**/*.{test,spec}.{ts,tsx}`; `testTimeout: 15_000`.
- `.env.example` — dashboard-location comments on the three Supabase env vars.

## Green chain

- `pnpm install` — 12 + 22 new packages; workspace-root flag (`-w`) used explicitly because repo uses pnpm workspaces.
- `pnpm typecheck` — 0 errors.
- `pnpm build` — Next 16.2.4 with Turbopack compiled in ~1.9s; Proxy (Middleware) line confirms proxy.ts is discovered; `/auth/callback` (ƒ), `/auth/signin` (○), `/` (○), `/_not-found` (○) all compile.
- `pnpm lint` — Biome warned 6 times on `process.env.FOO!` non-null assertions in the three Supabase client files (these are verbatim from the plan's interfaces block; no errors; exit 0).
- `pnpm test` (no env) — 3 baseline passed, 4 RLS tests skipped — CI-safe on clean clone.
- `pnpm test tests/rls-negative.test.ts` (with local-stack env) — 4/4 passed in 1.09s.
- `pnpm exec supabase db reset --local` — both migrations applied cleanly.

## D-25/D-26/D-27 + D-17 gate outputs

```
$ ls proxy.ts lib/supabase/proxy.ts
lib/supabase/proxy.ts
proxy.ts

$ ls middleware.ts lib/supabase/middleware.ts 2>/dev/null
(no files)

$ grep -rn "getSession" lib/ app/ proxy.ts
(no matches — exit 1)

$ grep -rn "createMiddlewareClient" lib/ app/ proxy.ts
(no matches — exit 1)

$ grep -c 'enable row level security' supabase/migrations/20260420000002_rls_policies.sql
6

$ grep -cE 'auth\.uid\(\)\s*=\s*user_id' supabase/migrations/20260420000002_rls_policies.sql
11
```

## Supabase project status

- **Remote project:** `https://xiccqasycfzodfgbcawh.supabase.co` (linked via `supabase link` prior to Plan 02). Anon key prefix: `sb_publishable_gjtuVFF…` (value in `.env.local`, gitignored; user plans to rotate post-launch).
- **Dashboard config TODO for the user:** run through the `user_setup` checklist — enable anonymous sign-ins, confirm magic-link email is enabled, add `http://localhost:3000/auth/callback` + the Vercel preview/prod URLs to the Authentication > URL Configuration redirect list. Migrations need to be applied remotely via `pnpm exec supabase db push` when the user is ready.
- **`SUPABASE_SERVICE_ROLE_KEY`** is NOT yet captured in `.env.local` — tests skip cleanly without it. The user pastes it when they want to run the RLS negative test against the remote project (not needed for local-stack runs, which use the `sb_secret_…` from `supabase status`).
- **Local stack:** started via `pnpm exec supabase start` (Docker-backed), migrations applied via `supabase db reset --local`, RLS test passed 4/4, stack stopped at executor end (`supabase stop --no-backup`) to free resources.

## Dev loop for re-running the RLS test

```
pnpm exec supabase start
# copy keys from `pnpm exec supabase status`:
#   Publishable → NEXT_PUBLIC_SUPABASE_ANON_KEY
#   Secret      → SUPABASE_SERVICE_ROLE_KEY
#   Project URL → NEXT_PUBLIC_SUPABASE_URL (http://127.0.0.1:54321)
# export them for this shell (do NOT persist to .env.local — that holds remote keys)
pnpm test tests/rls-negative.test.ts
```

## Decisions Made

1. **Hand-rolled Database type** — rather than generate via `supabase gen types typescript --local`, the plan calls out that Phase 2 may regenerate. I extended the minimal type with `Relationships: []`, `Views`, `Functions` fields because supabase-js 2.104's `GenericSchema`/`GenericTable` constraints collapse every mutation signature to `never` without them. This is the reason the negative RLS test initially failed typecheck; fix was inline (not a deviation, just fidelity to the live postgrest-js 2.104 type constraint).
2. **`Record<string, never>` instead of `never` on immutable-table `Update` slots** (`user_cosmetics`, `encounter_attempts`) — the plan snippet used `Update: never` which collapses `client.from(...).update(...)` overloads. `Record<string, never>` keeps the "no allowed fields" semantics without breaking the generic.
3. **Used `const response` instead of `let response`** in proxy.ts — the plan snippet used `let`, and its comment even rationalises "response MUST be mutable". In practice `response.cookies.set(...)` mutates the instance; `response` itself is never re-assigned. `const` is correct, and my comment now says "`response` MUST be the same instance passed into createProxyClient" rather than "must be declared with let". Functionally identical; Biome-friendly.
4. **Stripped `getSession` from proxy.ts teaching comments** after grep showed the `<output>` verification step demanded `grep -rn "getSession" lib/ app/ proxy.ts` return empty. Reworded to "the cached-session read helper". Extra `chore(01-02)` commit (`1a4daf7`).
5. **Stopped local Supabase stack at executor exit.** The dev loop for re-running the RLS test is documented above; user restarts on demand.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `Database` type collapsed `Update`/`Insert` to `never`**
- **Found during:** Task 3 (typecheck of `tests/rls-negative.test.ts` after initial write).
- **Issue:** postgrest-js 2.104's `GenericTable` constraint requires `Relationships: GenericRelationship[]`, and `GenericSchema` requires `Views` + `Functions` keys. The plan's snippet omitted all three. Without them, the type checker collapses every table's `Update`/`Insert` to `never`, breaking four type assertions in the test file.
- **Fix:** Added `Relationships: []` to every table, `Views: Record<string, never>` and `Functions: Record<string, never>` at schema level, and switched `Update: never` → `Update: Record<string, never>` on `user_cosmetics` + `encounter_attempts` so their update signatures still type-check.
- **Files modified:** `lib/supabase/types.ts`.
- **Verification:** `pnpm typecheck` exit 0; `pnpm test tests/rls-negative.test.ts` with local env → 4/4 pass.
- **Committed in:** `8a7ad55` (Task 3 commit — same changeset as the test file itself).

**2. [Rule 3 — Blocking] `pnpm add` refused on workspace root without `-w`**
- **Found during:** Task 1 (first `pnpm add @supabase/ssr …`).
- **Issue:** Repo has `pnpm-workspace.yaml`; pnpm 9.15.0 requires `-w` / `--workspace-root` to accept root-level adds.
- **Fix:** Re-ran with `-w`. No config changes needed.
- **Files modified:** none (pnpm behaviour, not a code change).
- **Verification:** `@supabase/ssr`, `@supabase/supabase-js`, `zod` appear in root `package.json` dependencies; `supabase` appears under devDependencies.
- **Committed in:** `e9eae8a` (Task 1 commit).

**3. [Rule 1 — Bug] Comment prose tripped D-17 grep gate**
- **Found during:** Final `<output>` verification step — `grep -rn "getSession" lib/ app/ proxy.ts`.
- **Issue:** Two comments in `proxy.ts` contained literal `getSession` ("NEVER getSession()" / "getSession would only read the cookie locally") as teaching prose. The plan's `<output>` section requires the grep to return zero matches; the teaching prose broke that.
- **Fix:** Reworded both comments to "the cached-session read helper". The earlier (narrower) acceptance-criteria grep `! grep -q 'supabase.auth.getSession' proxy.ts` was already passing, but the wider plan-level `<output>` grep wasn't.
- **Files modified:** `proxy.ts` (2 comment lines).
- **Verification:** `grep -rn "getSession" lib/ app/ proxy.ts` → no output, exit 1.
- **Committed in:** `1a4daf7` (dedicated `chore` commit to keep Task 2's history readable).

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking).
**Impact on plan:** All fixes were necessary to satisfy the plan's own acceptance criteria and verification gates; no scope creep. Task-level intent unchanged.

## Issues Encountered

- The Supabase `2.93.0` CLI postinstall logs a "Failed to create bin" WARN during `pnpm add -D supabase`, then immediately downloads the correct binary. Non-blocking; `pnpm exec supabase --help` works.
- Default `pnpm test` (no env) shows the RLS test suite as "skipped" — intentional (`describe.skipIf(!hasCreds)`), documented in the test header.

## User Setup Required

The plan's `user_setup` block lists five dashboard tasks. Status:

| Task | Status |
|---|---|
| Supabase project created | ✅ Done — `xiccqasycfzodfgbcawh.supabase.co` |
| Anonymous sign-ins enabled | ⚠️ User action needed — verify in Authentication > Providers (local config.toml has it enabled; remote project defaults to disabled on new projects) |
| Magic-link email enabled | ⚠️ User action needed — verify in Authentication > Providers > Email |
| Site URL + redirect URLs configured | ⚠️ User action needed — add `http://localhost:3000/auth/callback` + preview/prod URLs |
| Supabase CLI installed + linked | ✅ Done (CLI in devDeps; `supabase link` already run by user) |
| `SUPABASE_SERVICE_ROLE_KEY` added to `.env.local` | ⚠️ Deferred — not needed for local-stack runs; paste when running negative-RLS test against remote |
| Migrations applied to remote | ⚠️ User action needed — `pnpm exec supabase db push` when ready |

## Next Plan Readiness

Plan 01-03 (Zustand store factory + anonymous-user migration flow) is unblocked:

- `lib/supabase/server.ts` exports `createServerClient` (Plan 03 builds `/api/migrate-anonymous` on top of this).
- `player_state.migration_processed` column exists with `default false` — Plan 03's idempotency flag.
- `lib/supabase/types.ts` exports `Database`, `CluuMood`, `Json`, etc.
- `proxy.ts` at repo root refreshes the cookie on every request, so the Zustand store can rely on a fresh user on SSR + RSC paths.

Plan 01-07 (sign-out + persistence) is unblocked:

- `app/auth/actions.ts` exports `signOut` for the SettingsMenu.
- Anonymous sign-ins enabled (locally; remote dashboard task flagged).

No pending blockers. If the user wants to prove the magic-link end-to-end flow manually, start `supabase start`, run `pnpm dev`, submit an email at `/auth/signin`, open Mailpit at http://127.0.0.1:54324, click the link, and land on `/play` — the proxy will refresh the cookie on every subsequent request.

## Self-Check: PASSED

- Created files exist (11): ✅ all present.
- Modified files have the expected edits: ✅ verified via grep gates above.
- Commits exist (4): `e9eae8a` ✅, `328ee4a` ✅, `8a7ad55` ✅, `1a4daf7` ✅.
- Acceptance grep gates (Tasks 1/2/3): ✅ all pass including the wider `<output>` grep for `getSession`.
- RLS test: 4/4 green against local stack; skipped cleanly without env vars.
- `pnpm typecheck` + `pnpm build` + `pnpm lint` + `pnpm test`: all exit 0.

---
*Phase: 01-scaffold*
*Completed: 2026-04-21*
