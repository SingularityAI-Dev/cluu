---
phase: 01-scaffold
plan: 04
subsystem: scaffold/phaser-mount
tags: [phaser, nextjs, dynamic-import, strictmode, pitfall-5, world-01]
requires:
  - "@supabase/ssr server client (Plan 02)"
  - "reactStrictMode ON in next.config.ts (Plan 01)"
provides:
  - "game/index.ts createGame factory (ONLY React->Phaser entry)"
  - "game/bridge/EventBus.ts typed pub/sub (Pattern 2 singleton)"
  - "game/scenes/BootScene.ts, MeadowScene.ts, UIScene.ts"
  - "app/play route renders Phaser Canvas with grass"
  - "Pitfall 5 absorption proof (4 lifecycle tests)"
affects:
  - "Phase 01: Plan 05 adds anchor + Cluu sprite to MeadowScene.create"
  - "Phase 01: Plan 07 will subscribe Zustand to bus.on('player:anchor-moved') for persistence"
  - "Phase 02+: all future game logic goes through game/ dir; EventBus is the only React<->Phaser seam"
tech_stack:
  added:
    - "phaser 3.90.0 (exact) — already in deps from Plan 01-01"
    - "mitt 3.0.1 (dependency) — ~200B typed pub/sub for EventBus"
    - "@testing-library/react ^16.3.2 (devDep) — React 19 compatible RTL"
    - "@testing-library/jest-dom ^6.9.1 (devDep) — DOM matchers, auto-loaded by vitest.setup.ts"
  patterns:
    - "D-09 ssr:false dynamic import — owned by Client Component shim (Next 16 rule)"
    - "D-08 single Phaser.Game per mount — useRef guard + cancelled flag"
    - "D-07 multi-scene from day 1 — BootScene -> MeadowScene + launch UIScene"
    - "Pattern 2 EventBus singleton — typed mitt emitter with GameEvents map"
    - "Namespace import pattern for Phaser ESM: import * as Phaser from 'phaser'"
key_files:
  created:
    - "game/index.ts (createGame factory, 20 lines)"
    - "game/config.ts (Phaser config — Canvas, Arcade, 3 scenes, 25 lines)"
    - "game/bridge/EventBus.ts (typed mitt emitter, 20 lines)"
    - "game/scenes/BootScene.ts (preload + launch, 22 lines)"
    - "game/scenes/MeadowScene.ts (24x18 grass grid, 34 lines)"
    - "game/scenes/UIScene.ts (empty HUD scaffold, 14 lines)"
    - "app/play/page.tsx (Server Component reads user, 22 lines)"
    - "app/play/GameClientLoader.tsx (Client shim for ssr:false, 23 lines)"
    - "app/play/GameClient.tsx (the ONE Phaser mount, 49 lines)"
    - "app/play/CanvasSkeleton.tsx (loading placeholder, 22 lines)"
    - "app/play/GameClient.test.tsx (4 lifecycle assertions, 82 lines)"
    - "public/sprites/grass_32.png (32x32 pastel-green RGBA, 180 bytes — generated via Node zlib+CRC32)"
    - "public/sprites/.gitkeep"
  modified:
    - "package.json (added: mitt dep; @testing-library/react + jest-dom devDeps)"
    - "pnpm-lock.yaml"
decisions:
  - "Phaser namespace import (import * as Phaser) over default import — Phaser 3.90's ESM bundle has no default export; Next 16 Turbopack enforces ESM strictly"
  - "GameClientLoader.tsx added (outside plan's files_modified list) — Next 16 forbids next/dynamic({ ssr: false }) inside Server Components; a Client shim absorbs the rule while preserving D-09"
  - "Placeholder grass sprite generated on disk (Node zlib + manual CRC32 = 180B deterministic PNG) — not sourced; visual style deferred per CONTEXT.md 'Claude's Discretion'"
  - "Test file mocks both @/game AND phaser — Vite still evaluates the real module graph during transform, so stubbing phaser with the minimal {Scene, Game, CANVAS, Scale} shape prevents jsdom canvas probe crashes"
metrics:
  duration_min: 13
  completed_date: 2026-04-21
  tasks_total: 2
  tasks_completed: 2
  files_created: 13
  files_modified: 2
  commits:
    - "bca88f5 feat(01-04): scaffold game/ — Phaser Canvas config, 3 scenes, EventBus"
    - "c88d783 fix(01-04): switch to namespace imports for phaser ESM (Next 16 Turbopack)"
    - "51029cf feat(01-04): mount Phaser at /play with ssr:false + StrictMode-safe lifecycle"
---

# Phase 01 Plan 04: Phaser Mount Summary

Mount Phaser 3.90.0 at `/play` with `next/dynamic({ ssr: false })`, single-Game invariant enforced via `useRef` + cancelled-flag, three scenes (Boot -> Meadow -> UI) registered at construction; Pitfall 5 BLOCKER absorbed with 4 passing lifecycle tests.

## What Shipped

- **Phaser boots to a visible grass meadow at `/play`.** 24×18 grid of 32×32 pastel-green tiles fills the camera viewport (768×576). WORLD-01 satisfied structurally (3s-to-canvas target is a browser-only measurement, not unit-testable).
- **`game/` directory is the ONLY home for Phaser code.** Five files: `index.ts` (createGame factory), `config.ts` (Phaser.CANVAS + 3 scenes), `bridge/EventBus.ts` (typed mitt singleton), and three scene classes. Grep confirms no other file in the repo imports `phaser` or `@/game`.
- **`app/play/GameClient.tsx` is the ONLY consumer of `@/game`.** Dynamic import inside `useEffect` keeps Phaser out of the SSR path. `useRef` guards against StrictMode double-invoke creating two game instances. Cleanup calls `game.destroy(true, false)` on unmount.
- **Canvas renderer locked.** `type: Phaser.CANVAS` in `buildConfig` — not WebGL, not AUTO. Confirmed by grep acceptance criterion.
- **Three-scene architecture from day 1 (D-07).** BootScene preloads grass, starts MeadowScene, launches UIScene in parallel, and emits `bus.emit('game:ready', …)`. UIScene is empty Phase 1 and ready for Phase 3 HUD elements.
- **EventBus is Pattern-2 ready.** Typed `mitt<GameEvents>` singleton covers `game:ready`, `player:anchor-moved`, `cluu:mood`. Plan 05 will emit anchor events; Phase 3 will emit mood changes.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phaser ESM namespace import**
- **Found during:** Task 2 `pnpm build`
- **Issue:** Phaser 3.90.0's `dist/phaser.esm.js` exports only named bindings — no `export default`. Next 16 Turbopack enforces ESM strictly and failed with `Export default doesn't exist in target module`.
- **Fix:** Switched all 5 game/ files from `import Phaser from 'phaser'` to `import * as Phaser from 'phaser'`. TypeScript's `export = Phaser` declaration still types the namespace import correctly, so `Phaser.Scene`, `Phaser.CANVAS`, `Phaser.Game`, `Phaser.Scale`, `Phaser.Types.Core.GameConfig` all continue to resolve.
- **Files modified:** `game/index.ts`, `game/config.ts`, `game/scenes/BootScene.ts`, `game/scenes/MeadowScene.ts`, `game/scenes/UIScene.ts`
- **Commit:** `c88d783`

**2. [Rule 3 - Blocking] Next 16 forbids `ssr: false` in Server Components**
- **Found during:** Task 2 `pnpm build`
- **Issue:** Plan prescribed `next/dynamic({ ssr: false })` directly in `app/play/page.tsx` (a Server Component). Next 16 tightened RSC rules and now rejects this with `ssr: false is not allowed with next/dynamic in Server Components. Please move it into a Client Component.`
- **Fix:** Added `app/play/GameClientLoader.tsx` — a thin `'use client'` shim that holds the `next/dynamic({ ssr: false })` call. `page.tsx` stays a Server Component that reads the user and passes props to the loader. D-09 (Phaser never touches SSR) is preserved — the dynamic import still evaluates only on the browser.
- **Files modified:** `app/play/page.tsx` (reduced), `app/play/GameClientLoader.tsx` (new — **outside the plan's `files_modified` list**, documented here).
- **Commit:** `51029cf`

**3. [Rule 3 - Blocking] Test env: Phaser crashes on import under jsdom**
- **Found during:** Task 2 RED->GREEN test run
- **Issue:** Even with `vi.mock('@/game', …)`, Vite still evaluates the real `@/game` module graph during transforms. Phaser's `CanvasFeatures.checkInverseAlpha` runs at module top-level, calling `document.createElement('canvas').getContext('2d')` — which returns `null` in jsdom, crashing with `Cannot set properties of null (setting 'fillStyle')`. Vitest reports this as an unhandled rejection → ELIFECYCLE exit even though all 4 tests pass.
- **Fix:** Added `vi.mock('phaser', …)` providing a minimal stub `{ Scene: FakeScene, Game, CANVAS, AUTO, WEBGL, Scale }` — enough for the scene class extensions and config object references that Vite transforms. Tests pass cleanly, no unhandled rejections.
- **Files modified:** `app/play/GameClient.test.tsx`
- **Commit:** absorbed into `51029cf`

No architectural deviations (Rule 4). No bugs introduced that required Rule 1 fixes.

## Tests

- `app/play/GameClient.test.tsx` — **4 lifecycle assertions, all passing:**
  1. Single `createGame` call on mount (no StrictMode)
  2. `destroy()` called once on unmount
  3. StrictMode double-invoke: net-alive instances ≤ 0 after unmount
  4. Ref cleared post-unmount (destroy fires exactly once)
- Phaser is mocked with a minimal class stub; jsdom-unsafe canvas probe never runs.
- Full suite: **24 passed / 4 skipped / 28 total.** The 4 skipped are Plan 02 RLS negative tests that require a running local Supabase stack — skip status is expected per STATE.md decisions.

## Bundle Deltas

Next 16's Turbopack output does not print per-route First-Load-JS in its default table — numbers captured by measuring `.next/static/chunks` on disk:

| Chunk role | Raw | Gzipped |
|---|---|---|
| Phaser + game/ scenes (lazy, loaded only on `/play`) | 1.19 MB | **316 KB** |
| Next 16 runtime + framework shared | 228 KB | 71 KB |
| React 19 + RSC client | 196 KB | 49 KB |
| Small app chunks + turbopack shims | < 60 KB each | < 14 KB each |
| `/play` route entry (GameClientLoader + page stub) | 3.9 KB | 1.8 KB |

- **Landing `/` pays NO Phaser cost.** Served as prerendered static HTML (8 KB). `/play` is `ƒ (Dynamic)` — server renders cookie-bound user then the ssr:false loader swaps in the Phaser chunk client-side.
- **Bundle budget check:** Phase-1 initial-bundle target (<2MB) applies to the landing page — trivially met. The `/play` post-hydration chunk at ~316KB gzipped is within expected Phaser overhead per STACK.md "Phaser adds ~1MB gzipped" note (unminified Phaser bundle size; the Turbopack minified chunk is smaller). Phase 5 hardening can dig further into tree-shaking if the per-biome chunks grow; no action required now.

## Manual Smoke (deferred — requires `pnpm dev`)

The orchestrator's executor environment doesn't run `pnpm dev` to a browser, so these are pre-flighted but not empirically executed:

- Expected: navigate to `http://localhost:3000/play`, see 24×18 pastel-green grass within ~300ms of hydration (skeleton shows for ≤100ms while Phaser lazy-chunk loads).
- Expected: `pnpm dev` with React StrictMode ON — dev server boots without "Phaser.Game already initialized" errors. The useRef guard + cancelled flag prevents the double-invoke leak deterministically.
- Expected: DevTools Memory profiler across `/ <-> /play` bounces shows no monotonic heap growth. Pitfall 5 prevention #3 (`destroy(true)` on unmount) handles this.

## Known Issues / Handoff to Plan 05

- **MeadowScene.create is the anchor point for Plan 05.** Plan 05 will add `PlayerAnchor` sprite + Cluu sprite + tween/pathfinding. No plumbing changes needed — same file, just extend `create()`.
- **UIScene is empty.** Phase 3 will add mood badge, cosmetic indicators. Ready for extension — `active: false` in constructor means it only runs when BootScene `scene.launch('UIScene')` fires.
- **Zustand <-> Phaser integration is one-way so far.** Server props (`userId`, `isAnonymous`) reach `GameClient` but aren't yet piped into Phaser scenes. Plan 05 will close this loop: Phaser emits `player:anchor-moved` → Zustand subscribes → debounced Supabase write (Plan 07).
- **StrictMode double-invoke edge case observed.** When StrictMode double-mounts, React fires effect → cleanup → effect in rapid succession. The `cancelled` flag guards against a late-arriving `createGame` from the first effect's dynamic-import promise populating the ref AFTER the second effect's cleanup already ran. The useRef guard at the resolve callback (`if (gameRef.current) return;`) is the secondary defense. Tests assert net-alive ≤ 0 as the invariant.

## Requirements Closed

- **WORLD-01:** `/play` renders Phaser canvas (grass visible) within 3s on broadband — structural satisfaction via lazy chunk + skeleton fallback. End-to-end timing belongs to Plan 01-08 cross-browser smoke.

## Self-Check: PASSED

- Files created verified on disk:
  - `game/index.ts`, `game/config.ts`, `game/bridge/EventBus.ts`: FOUND
  - `game/scenes/BootScene.ts`, `MeadowScene.ts`, `UIScene.ts`: FOUND
  - `app/play/page.tsx`, `GameClient.tsx`, `GameClientLoader.tsx`, `CanvasSkeleton.tsx`, `GameClient.test.tsx`: FOUND
  - `public/sprites/grass_32.png` (180 bytes, valid PNG per `file(1)`): FOUND
- Commits verified in `git log`:
  - `bca88f5`: FOUND (Task 1)
  - `c88d783`: FOUND (Phaser ESM fix)
  - `51029cf`: FOUND (Task 2)
- Green chain: typecheck 0, test 24/28 (4 skipped = RLS expected), lint 0 (6 warnings all pre-existing outside scope), build 0.
