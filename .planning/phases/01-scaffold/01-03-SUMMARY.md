---
phase: 01-scaffold
plan: 03
subsystem: state-migration
tags: [zustand, store-factory, nextjs-16, localstorage, idempotency, pitfall-4, api-route, zod, vitest]

# Dependency graph
requires:
  - phase: 01-scaffold
    provides: Next 16.2.4 + React 19.2 + Vitest 4.1 + pnpm workspaces + biome + server-only alias stub (from 01-01/01-02)
  - phase: 01-scaffold
    provides: Supabase server client + Database type + player_state.migration_processed flag (from 01-02)
provides:
  - Zustand Store Factory (createGameStore) + StoreProvider — per-request instance, no singleton
  - localStorage persistence on key 'cluu-game-v1' with anchor explicitly excluded from persisted partial
  - Server-side applyAnonymousMigration() — reads migration_processed flag, short-circuits double-invoke
  - POST /api/migrate-anonymous route (runtime=nodejs) with zod validation + 401/400/500 error shapes
  - Pitfall 4 (BLOCKER) absorbed with proven idempotency — 4/4 unit tests + 5/5 route tests green
  - Vitest alias stub for 'server-only' so server-side modules test cleanly
affects: [01-04-phaser-mount, 01-05-anchor-cluu, 01-07-signout-persistence, 02-walking-skeleton, 03-meadow-persistence]

# Tech tracking
tech-stack:
  added:
    - "zustand@5.0.12"
  patterns:
    - "Store Factory + <StoreProvider> (D-15) — createGameStore is a function, not a top-level create()"
    - "persist middleware with partialize excluding anchor (Pattern 4: anchor position never syncs)"
    - "migrationIdempotencyKey field generated on first init via crypto.randomUUID()"
    - "Server-side merge via applyAnonymousMigration — client never writes directly to library_entries / user_cosmetics (Pitfall 4 prevention #1)"
    - "player_state.migration_processed flag as the idempotency key (Pitfall 4 prevention #2)"
    - "Route handlers default to runtime='nodejs' on Vercel Fluid Compute (D-22)"
    - "supabase.auth.getUser() only; cached-session helper forbidden and grep-gated (D-17)"

key-files:
  created:
    - state/types.ts
    - state/gameStore.ts
    - state/StoreProvider.tsx
    - state/gameStore.test.ts
    - lib/migrate/idempotency.ts
    - lib/migrate/idempotency.test.ts
    - app/api/migrate-anonymous/route.ts
    - app/api/migrate-anonymous/route.test.ts
    - tests/stubs/server-only.ts
  modified:
    - app/layout.tsx (wrap children in <StoreProvider>)
    - package.json (add zustand@5.0.12)
    - pnpm-lock.yaml
    - vitest.config.ts (alias 'server-only' -> tests/stubs/server-only.ts)

key-decisions:
  - "Re-declared CluuMood in state/types.ts rather than importing from lib/supabase/types.ts — keeps client bundles from pulling the server-side Database contract."
  - "Cast island_progress / cluu_cosmetics through Json at the Supabase .update() call — Json's recursive union is stricter than Record<string, unknown>; runtime shape is already validated by zod at the route boundary."
  - "Vitest can't resolve Next's virtual 'server-only' package; aliased to tests/stubs/server-only.ts (re-exports empty). Build-time guard still enforced by Next.js at pnpm build."
  - "partialize excludes migrationIdempotencyKey as well — wait, it does NOT, it IS persisted: confirmed in code so the same key survives refresh and is sent with the migration payload for true idempotency across page reloads."

patterns-established:
  - "D-15 Store Factory enforcement — any future store (e.g. EncounterStore in Phase 2) must follow the same createXStore() + useRef pattern, never a top-level create()."
  - "Idempotency contract shape: MigrationPayload + MigrationResult with discriminated union on 'processed'. Plan 07's client will branch on result.processed to decide whether to clear localStorage."
  - "tests/stubs/ directory pattern for Vitest-only shims of Next runtime-only packages."

requirements-completed:
  - AUTH-01
  - AUTH-03

# Metrics
duration: ~10min
completed: 2026-04-21
---

# Phase 01 Plan 03: Zustand + Anonymous Migration Summary

**Zustand Store Factory (D-15) + idempotent POST /api/migrate-anonymous landing cleanly: 8 store tests + 4 idempotency tests + 5 route tests all green, Pitfall 4 BLOCKER absorbed with double-invoke proven a no-op.**

## Performance

- **Duration:** ~10 min (first commit `c55780d`, last commit `6398302`)
- **Started:** 2026-04-21T02:55Z
- **Completed:** 2026-04-21T03:05Z
- **Tasks:** 2
- **Files created:** 9
- **Files modified:** 4

## Accomplishments

- Zustand pinned at 5.0.12 (STACK.md). `state/gameStore.ts` exports `createGameStore(initState?)` — a Store Factory, not a top-level `create()` singleton. Each call returns an independent `StoreApi<GameStore>`, proven by Test 1 of the suite.
- `state/StoreProvider.tsx` is a `'use client'` React Context provider that uses `useRef` to create the store once per mount, so both SSR and browser hydration get their own instance without leaking across concurrent requests (STACK.md Integration gotchas §7).
- Persist middleware writes to `localStorage` under key `cluu-game-v1` (D-15 exact wording). `partialize` excludes the `anchor` field (Pattern 4: "anchor position never syncs"), verified by Test 7 which sets an anchor then asserts it is absent from the serialized blob.
- `migrationIdempotencyKey` is auto-generated on first init via `crypto.randomUUID()` (with a jsdom polyfill in `vitest.setup.ts`). It is included in the persisted partial so it survives refresh, keeping idempotency stable across browser sessions.
- `app/layout.tsx` now wraps children in `<StoreProvider>`.
- `lib/migrate/idempotency.ts::applyAnonymousMigration(supabase, userId, payload)` is the single source of truth for anon→authed merges. Flow: read `player_state.migration_processed` → if true, return `{ processed: false, reason: 'already_migrated' }` → else update `player_state` (merge fields + flip flag) → insert `library_entries` → upsert `user_cosmetics` with `ignoreDuplicates` on `(user_id, cosmetic_id)`. Pitfall 4 prevention #1 (server-side merge) + #2 (idempotency flag) both absorbed.
- `app/api/migrate-anonymous/route.ts` — Node runtime (D-22), zod-validated body with `MigrationSchema`, authed via `supabase.auth.getUser()` only (D-17 gate still empty). Returns 401 on missing user, 400 on invalid JSON / invalid body, 500 with `Error.message` only on server-side throws (T-03-04 mitigation), 200 with the `MigrationResult` on success.
- `lib/migrate/idempotency.test.ts` (4 cases) proves on an in-memory fake Supabase that double-invoke does NOT duplicate library rows or cosmetic rows, and that an empty payload still flips the flag. This is the Pitfall 4 BLOCKER gate.
- `app/api/migrate-anonymous/route.test.ts` (5 cases) exercises the full handler with a mocked server client: 200 on first call, 401 when `authed=false`, 400 on non-JSON, 400 on missing fields, 200 + `processed=false` on second call (end-to-end idempotency).

## Task Commits

1. **Task 1 — Zustand Store Factory + StoreProvider + persist to localStorage + 8 tests** — `c55780d` (feat)
2. **Task 2 — Idempotent /api/migrate-anonymous + 4 idempotency tests + 5 route tests** — `6398302` (feat)

## Test Counts

| Suite | File | Passing |
|---|---|---|
| Store Factory | `state/gameStore.test.ts` | 8 / 8 |
| Idempotency (Pitfall 4) | `lib/migrate/idempotency.test.ts` | 4 / 4 |
| Route handler | `app/api/migrate-anonymous/route.test.ts` | 5 / 5 |
| **Total added** | | **17 / 17** |

Full suite after this plan: `Test Files 4 passed | 1 skipped (5)`, `Tests 20 passed | 4 skipped (24)`. The 4 skipped tests are `tests/rls-negative.test.ts` (Plan 02, guarded by `describe.skipIf(!hasCreds)` — local Supabase stack not running during this executor run).

## Grep Gates

- `grep -rn 'getSession' lib/ app/ proxy.ts` → 0 matches (D-17 preserved)
- `grep -E "^const.*= create\(" state/gameStore.ts` → 0 matches (no top-level singleton)
- `grep -n 'getSession' app/api/migrate-anonymous/route.ts` → 0 matches
- `grep -i 'idempot' lib/migrate/idempotency.test.ts` → multiple matches (test naming confirmed)
- `grep -n "runtime = 'nodejs'" app/api/migrate-anonymous/route.ts` → 1 match on line 13 (D-22)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `server-only` module cannot be resolved by Vitest**
- **Found during:** Task 2 test run
- **Issue:** `lib/migrate/idempotency.ts` starts with `import 'server-only'` per acceptance criteria. Vitest's Vite bundler cannot resolve it because the package is virtualised by Next.js at build time; both idempotency and route tests failed with `Failed to resolve import "server-only"`.
- **Fix:** Added a one-line no-op stub at `tests/stubs/server-only.ts` (exports `{}`) and aliased `'server-only' -> tests/stubs/server-only.ts` in `vitest.config.ts`. Build-time guard still fires at `pnpm build` (unchanged).
- **Files modified:** `tests/stubs/server-only.ts` (new), `vitest.config.ts`
- **Commit:** `6398302`

**2. [Rule 1 - Bug] `Record<string, unknown>` not assignable to `Json`**
- **Found during:** Task 2 typecheck
- **Issue:** Plan's `MigrationPayload.anonymousState.island_progress: Record<string, unknown>` does not structurally satisfy the recursive `Json` type in `lib/supabase/types.ts` (line 7) — `unknown` isn't assignable to `Json`. TSC failed with `Type 'Record<string, unknown>' is not assignable to type 'Json | undefined'`.
- **Fix:** Added a narrow cast-through-unknown at the single Supabase `.update()` boundary: `payload.anonymousState.island_progress as unknown as Json` (same for `cluu_cosmetics`). The zod schema already validates the shape at the HTTP boundary, so the cast is provably safe.
- **Files modified:** `lib/migrate/idempotency.ts`
- **Commit:** `6398302`

### Zod schema deviation from plan text

The plan showed `z.record(z.unknown())` for `island_progress`. Zod 3.23+ requires two args (`z.record(keySchema, valueSchema)`) for the `record` overload when the value type is not `any` — used `z.record(z.string(), z.unknown())`. Runtime behaviour is identical.

## Known Issues

- **Pre-existing lint warnings (out of scope):** Biome reports 6 `noNonNullAssertion` warnings in `lib/supabase/{server,proxy}.ts` (Plan 02 files). Not touched per the "do not modify files outside files_modified" hard rule. Logged for a future hardening plan.
- **`deferred-items.md` not created** — no deferred work from this plan.

## Requirements Closed

| ID | Description | Evidence |
|---|---|---|
| AUTH-01 | Anonymous player state persists locally | `state/gameStore.test.ts` Tests 6+7 confirm persist-to-`cluu-game-v1` + anchor exclusion |
| AUTH-03 | Authed signup migrates anonymous state without data loss | `lib/migrate/idempotency.test.ts` (4/4) + `app/api/migrate-anonymous/route.test.ts` (5/5); end-to-end idempotency test proves second POST is a no-op |

## Threat Register Coverage

All T-03-0[1..6] items from the plan's threat model are active mitigations in code:

- **T-03-01** (client crafts foreign `user_id`): route never reads `user_id` from body; uses `user.id` from `auth.getUser()` only.
- **T-03-02** (client sets `migration_processed=false`): field is not in `MigrationSchema`; server reads only the DB value.
- **T-03-04** (payload echoed in 500s): catch block returns `{ error, message: Error.message }` — never `body`.
- **T-03-05** (DoS repeated migrate POSTs): second call short-circuits before any DB write (one SELECT only).
- **T-03-06** (getSession leak): `grep -n 'getSession' app/api/migrate-anonymous/route.ts` returns 0.

**T-03-03** (repudiation) and **T-03-07** (unbounded JSON memory) are marked `accept` in the plan — no code-level mitigation required in Phase 1.

## Follow-ups for Future Plans

- **Plan 01-07 (signout-persistence):** wire the client-side call from the magic-link success hook. Use the persisted `migrationIdempotencyKey` as the `Idempotency-Key` header if/when we add request-level rate limits.
- **Plan 06 (consent-analytics):** add Sentry/PostHog wrappers around the route handler's try/catch so 500 paths get observed in production.
- **Phase 2 walking skeleton:** consumers of `useGameStore` should import the selector pattern (single-field selectors) to avoid re-renders as the store grows.

## Self-Check: PASSED

**Files created:**
- `state/types.ts` FOUND
- `state/gameStore.ts` FOUND
- `state/StoreProvider.tsx` FOUND
- `state/gameStore.test.ts` FOUND
- `lib/migrate/idempotency.ts` FOUND
- `lib/migrate/idempotency.test.ts` FOUND
- `app/api/migrate-anonymous/route.ts` FOUND
- `app/api/migrate-anonymous/route.test.ts` FOUND
- `tests/stubs/server-only.ts` FOUND

**Commits:**
- `c55780d` FOUND (Task 1 feat)
- `6398302` FOUND (Task 2 feat)

**Verification chain:** `pnpm typecheck` ✓  `pnpm test` ✓ (20 passed, 4 skipped) `pnpm build` ✓  `pnpm lint` — 6 pre-existing warnings in Plan 02 files only.
