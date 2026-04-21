---
phase: 01-scaffold
plan: 05
subsystem: game
tags: [phaser, phaser-3.90, game-entities, input, arcade-physics, container-compositing, seek-behavior, tdd]

# Dependency graph
requires:
  - phase: 01-scaffold
    provides: "Plan 01-04 — Phaser 3 mount at /play, BootScene/MeadowScene/UIScene scaffold, EventBus, namespace Phaser import pattern, GameClient Pitfall-5 lifecycle guard"
provides:
  - PlayerAnchor (invisible, physics-enabled cursor the player drives)
  - Cluu companion (4-layer sprite Container with setMood/setEquipped API)
  - InputSystem (touch tap-to-move + WASD + arrow keys)
  - follow.ts pure-function seek behavior with 24px stop radius
  - camera follow with setLerp(0.1, 0.1) bounded to scene dimensions
  - 5 placeholder Cluu slot sprites (48x48 PNGs, base + 4 transparent)
  - extended Phaser stub in GameClient.test.tsx covering Container/Sprite/Physics/Keyboard
affects: [phase-02-walking-skeleton, phase-03-persistence-library, phase-04-biomes-shares]

# Tech tracking
tech-stack:
  added: []  # no new deps; used phaser 3.90 + vitest 4.1 already pinned in Plan 01
  patterns:
    - "Anchor-follows-pet locomotion: invisible PlayerAnchor drives camera; Cluu seeks anchor via constant-speed behavior (D-11)"
    - "4-layer sprite compositing via Phaser.GameObjects.Container with back/base/bodyPattern/head/eyes z-order (D-13)"
    - "No-op-but-real API surface (setMood, setEquipped) so Phase 3 cosmetic work is a texture swap, not a refactor (D-14)"
    - "Pure-function seek (systems/follow.ts) is trivially testable without a Phaser runtime"
    - "Vitest phaser mock via vi.mock('phaser', ...) with minimal Container/Sprite shape for class-extends lookup"
    - "Field rename this.inputSystem (not this.input) to avoid shadowing Phaser.Scene.input (the InputPlugin)"

key-files:
  created:
    - game/entities/PlayerAnchor.ts
    - game/entities/Cluu.ts
    - game/entities/Cluu.test.ts
    - game/systems/input.ts
    - game/systems/follow.ts
    - public/sprites/cluu_base.png
    - public/sprites/cluu_body_pattern.png
    - public/sprites/cluu_head.png
    - public/sprites/cluu_eyes.png
    - public/sprites/cluu_back.png
  modified:
    - game/scenes/BootScene.ts (preload 5 Cluu slot textures)
    - game/scenes/MeadowScene.ts (spawn anchor + Cluu, wire input, camera follow)
    - app/play/GameClient.test.tsx (extend Phaser stub for class-extends coverage)

key-decisions:
  - "D-11 literal: STOP_RADIUS=24 exported from follow.ts so the constant is code-addressable and grep-checkable"
  - "D-12 literal: setLerp(0.1, 0.1) called explicitly AFTER startFollow(...0.1, 0.1) so both the literal pattern match and the configured value are unambiguous"
  - "D-13 z-order decided: back (0) < base (1) < bodyPattern (2) < head (3) < eyes (4). Eyes render on top of head so a translucent hat never occludes the Cluu's gaze"
  - "D-14 default mood 'content' per CONTEXT.md specifics — the player has just arrived; neither stoked nor sleepy is earned yet"
  - "Anchor speed 220 px/s (tap seek), keyboard key-speed 260 px/s, Cluu speed 160 px/s — picked so Cluu visibly trails the anchor without feeling slow"
  - "Cluu physics body set to 40x40 inside the 48x48 sprite — slightly smaller collision box reads as 'soft cozy pet' vs 'rigid box'"
  - "PlayerAnchor reuses the grass texture as its invisible body (scaled to 8x8, setVisible(false)) — avoided loading a dedicated anchor texture"

patterns-established:
  - "Pure systems (systems/*.ts): computation functions with no Phaser dependency, import-safe from tests"
  - "Entity classes (entities/*.ts): Phaser-extending classes, own their body/physics setup"
  - "Scene classes (scenes/*.ts): orchestrate entities + systems, never own game logic themselves"
  - "Test pattern for Phaser-extending classes: vi.mock('phaser', ...) with class stubs; lazy-import the entity module AFTER the mock hoists"

requirements-completed: [WORLD-02, WORLD-03, WORLD-04, CLUU-01]

# Metrics
duration: 11min
completed: 2026-04-21
---

# Phase 1 Plan 5: PlayerAnchor + Cluu Summary

**Invisible anchor driven by tap/WASD with Cluu companion following via seek-behavior; 4-layer Container compositing pipeline ready for Phase 3 cosmetics, backed by 11 Vitest assertions.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-04-21T03:32:46Z
- **Completed:** 2026-04-21T03:43:30Z
- **Tasks:** 3 (1 non-TDD, 1 non-TDD, 1 TDD with explicit RED→GREEN commits)
- **Files created:** 10 (5 TS, 5 PNG)
- **Files modified:** 3 (BootScene.ts, MeadowScene.ts, GameClient.test.tsx)

## Accomplishments

- **WORLD-02 closed** — pointerdown sets anchor target to `pointer.worldX/Y`; emits `player:anchor-moved` on the EventBus.
- **WORLD-03 closed** — WASD + arrow keys wired with diagonal normalization (`1/√2`) so eight-way motion stays constant-speed.
- **WORLD-04 closed** — `cameras.main.startFollow(anchor, true, 0.1, 0.1)` followed by a literal `setLerp(0.1, 0.1)` per D-12. Camera bounded to `0..worldW x 0..worldH`.
- **CLUU-01 closed** — Cluu is a `Phaser.GameObjects.Container` with 5 child sprites. Per-tick `cluu.follow(anchor.x, anchor.y)` calls `seekTarget`, which returns zero velocity inside the 24px radius — Cluu coasts to a stop instead of jittering.
- **D-13/D-14 pipeline shipped** — `setMood(mood)` / `setEquipped(slot, textureKey|null)` are real methods with real behavior. Phase 3 cosmetic unlocks will be a one-line texture swap.
- **Cluu 11 tests** — 6 for the Cluu API (container shape, z-order, setMood all moods, setEquipped targeting, null-reset, independent slot updates) + 5 for seekTarget (distance, stop radius, boundary, normalization, literal constant).

## Task Commits

Each task was committed atomically:

1. **Task 1: Placeholder sprites + BootScene preload** — `517fbe7` (feat)
2. **Task 2: PlayerAnchor + InputSystem + camera lerp** — `519f6c3` (feat)
3. **Task 3 RED: failing Cluu + seekTarget tests** — `4d2e768` (test)
4. **Task 3 GREEN: Cluu entity + follow.ts + scene wiring** — `1ba9084` (feat)
5. **Task 3 follow-up: Rule-3 auto-fix — Phaser stub extension + test-type tightening** — `4e72784` (fix)

_No REFACTOR commit — GREEN code was already at the cleanliness bar._

## Files Created/Modified

### Created
- `game/entities/PlayerAnchor.ts` — Physics.Arcade.Sprite, 220 px/s seek, invisible, world-bounds collision (68 LoC)
- `game/entities/Cluu.ts` — Container with 5 ordered child sprites; setMood/setEquipped; 160 px/s seek follow (88 LoC)
- `game/entities/Cluu.test.ts` — 11 Vitest tests, Phaser mocked via `vi.mock`, typed FakeScene helper (199 LoC)
- `game/systems/input.ts` — pointerdown + WASD/arrows with diagonal normalization; shutdown hook (71 LoC)
- `game/systems/follow.ts` — pure `seekTarget(from, to, speed)` with `STOP_RADIUS=24` constant export (23 LoC)
- `public/sprites/cluu_base.png` — 48×48 pastel-mustard circle (Phase 1 Content pose stand-in)
- `public/sprites/cluu_body_pattern.png` — 48×48 fully transparent placeholder
- `public/sprites/cluu_head.png` — 48×48 fully transparent placeholder
- `public/sprites/cluu_eyes.png` — 48×48 fully transparent placeholder
- `public/sprites/cluu_back.png` — 48×48 fully transparent placeholder

### Modified
- `game/scenes/BootScene.ts` — `+5 this.load.image(...)` calls for the Cluu slot textures
- `game/scenes/MeadowScene.ts` — wired anchor, input system, camera follow, Cluu spawn (48px SE of anchor), per-tick update wiring
- `app/play/GameClient.test.tsx` — extended Phaser stub: added `GameObjects.{Container,Sprite}`, `Physics.Arcade.{Sprite,Body}`, and `Input.Keyboard.KeyCodes` (W/A/S/D/UP/LEFT/DOWN/RIGHT)

## Decisions Made

- **Pure-function seek in systems/follow.ts**, not a Cluu-private method. The test suite imports it directly — no Phaser mock needed for the 5 seek tests. Trade-off accepted: one extra file vs. test simplicity win.
- **`this.inputSystem` field name** (not `this.input`) on MeadowScene — `Phaser.Scene.input` is the InputPlugin, shadowing it would silently break keyboard wiring.
- **Cluu spawns offset 48px SE of anchor** — so the follow behavior reads immediately when the scene boots, without the player having to move first.
- **PlayerAnchor reuses the grass texture as its invisible body** (scaled to 8px, `setVisible(false)`). A proper anchor sprite would add a dead asset and a dead load call in BootScene — skipped.
- **Cluu z-order: back < base < bodyPattern < head < eyes.** Rationale: eyes must render on top of head so a future hat cosmetic doesn't occlude the Cluu's gaze (which D-14's future mood-poses depend on).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Phaser stub in app/play/GameClient.test.tsx missing class shapes**

- **Found during:** Task 3 GREEN (running `pnpm test` after GREEN commit)
- **Issue:** After MeadowScene started importing Cluu (which extends `Phaser.GameObjects.Container`) and PlayerAnchor (which extends `Phaser.Physics.Arcade.Sprite`), the existing `GameClient.test.tsx` Phaser stub did not define those keys. Vite still evaluates the real `@/game` module graph even when `@/game` is mocked (as the comment in that file already noted for Phase 4), so the class-extends lookup at module-eval time threw an unhandled error after the lifecycle tests completed. Tests reported `Errors 1` with 65 passing.
- **Fix:** Extended the `PhaserStub` object in `GameClient.test.tsx` to include `GameObjects: { Container: FakeContainer, Sprite: FakeSprite }`, `Physics: { Arcade: { Sprite: FakeArcadeSprite, Body: class {} } }`, and `Input: { Keyboard: { KeyCodes: { W, A, S, D, UP, LEFT, DOWN, RIGHT: 0 } } }`.
- **Files modified:** `app/play/GameClient.test.tsx`
- **Verification:** `pnpm test` → `Tests 65 passed | 4 skipped (69), Errors 0`. Plan 06 had documented this artifact in `deferred-items.md` as out of their scope; Plan 05 closes it.
- **Committed in:** `4e72784` (fix(01-05): ...)

**2. [Rule 3 - Blocking] Biome 1.9 rejected bare `// biome-ignore` suppressions without reason**

- **Found during:** Task 3 GREEN (running `pnpm biome lint` on Plan 05 files)
- **Issue:** The plan's suggested test scaffolding used `// biome-ignore lint/suspicious/noExplicitAny` without the mandatory trailing reason. Biome 1.9 treats those as parse errors and still emits the `any` lint.
- **Fix:** Replaced `scene as any` with a typed `asPhaserScene(s: FakeScene): Phaser.Scene` helper (`return s as unknown as Phaser.Scene`). Also replaced `any[]` and `scene: any` on the FakeContainer with `unknown[]` and `unknown`. No biome suppressions needed.
- **Files modified:** `game/entities/Cluu.test.ts`
- **Verification:** `pnpm biome lint game/entities/Cluu.test.ts` → 0 errors, 0 warnings.
- **Committed in:** `4e72784` (fix(01-05): ...)

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking)
**Impact on plan:** Both fixes are purely plumbing (test environment cleanliness). Zero production-code scope creep. All D-11/D-12/D-13/D-14 behavior shipped exactly as specified.

## Issues Encountered

- **Parallel-plan collision on global checks.** Plans 01-06 and 01-07 ran concurrently. At the time I tried a full `pnpm typecheck` / `pnpm lint` / `pnpm build` at the end of Task 3, Plan 06's in-progress `ui/ConsentBanner.tsx` had an unclosed JSX `<section>` at line 78, which blocks both `tsc` and Biome parse. Plan 05's own files pass `pnpm biome lint <8 files>` cleanly and the `game/` module graph typechecks cleanly (`pnpm typecheck` passed at every commit point BEFORE Plan 06's files landed). Logged in `deferred-items.md` under "Plan 01-05 scope boundary" for 06 to resolve. This is a coordination artifact, not a Plan 05 regression.
- **`pnpm build` not re-run at end of plan** — same reason; pre-existing syntax error in a sibling plan's file would fail the build regardless. Plan 05's own build-correctness is covered by the green `pnpm test` + per-file lint + in-progress typechecks.
- **Pre-commit hook `gsd-validate-commit.sh` missing** — noted by the executor prompt; non-blocking warning; commits proceeded normally.

## Manual Observation Notes (for the plan's `<output>` section)

- **Cluu test count:** **11 tests** (6 Cluu API + 5 seekTarget). Exceeds the plan's ≥8 requirement.
- **Cluu-vs-anchor "pet trailing" behavior:** Cluu speed is 160 px/s vs anchor's 220 px/s — confirmed in code; Cluu will visibly lag behind during tap-and-hold or continuous keyboard motion, reaching the stop radius ~1–2 tile-widths behind the anchor.
- **FPS observation:** NOT measured in this plan — the scene was not manually launched in a browser due to (a) parallel plans in flight modifying `app/play/*` and (b) the pre-existing `ConsentBanner.tsx` build error. Plan 01-08 (cross-browser smoke) is the designated place for live-browser FPS baselining on desktop Chrome. Documented here as a **deferred observation** for Plan 08's smoke run: target is 60fps on iPhone SE 2020 per CLAUDE.md project constraints.
- **No deviations from D-11, D-12, D-13, D-14** — all four decisions shipped literally as specified (STOP_RADIUS=24, setLerp(0.1, 0.1), 5 child sprites in Container z-order, setMood + setEquipped API surface).

## Threat Flags

None. Plan 05 adds only client-local game-entity code. No new network endpoints, no new auth paths, no schema changes, no trust boundaries crossed. The threat model disposed T-05-01/02/03 as `accept` and this plan does not introduce surface requiring new mitigations.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Phase 1 remaining:** Plans 01-06 (consent + analytics) and 01-07 (sign-out + persistence) are running in parallel; 01-08 (cross-browser smoke) will absorb live-browser FPS + touch + keyboard verification for WORLD-02/03/04 + CLUU-01.
- **Phase 2 (walking skeleton encounter) is unblocked on the game-object side.** The anchor + Cluu + EventBus are ready for Phase 2's first encounter overlap detection (`anchor-overlap-with-encounter-object → bus.emit('encounter:enter', ...)` pattern). Phase 2 need only add an encounter sprite to the MeadowScene and wire a physics overlap — no refactor of Plan 05's entities required.
- **Phase 3 (cosmetics)** drops directly into `cluu.setEquipped(slot, key)`. No structural work needed — Phase 3 just authors new textures + seeds the catalogue.

## Self-Check: PASSED

Files verified to exist:
- FOUND: game/entities/PlayerAnchor.ts
- FOUND: game/entities/Cluu.ts
- FOUND: game/entities/Cluu.test.ts
- FOUND: game/systems/input.ts
- FOUND: game/systems/follow.ts
- FOUND: game/scenes/MeadowScene.ts (modified)
- FOUND: game/scenes/BootScene.ts (modified)
- FOUND: public/sprites/cluu_base.png (+ 4 sibling slots)
- FOUND: app/play/GameClient.test.tsx (modified)

Commits verified in `git log`:
- FOUND: 517fbe7 (Task 1 feat)
- FOUND: 519f6c3 (Task 2 feat)
- FOUND: 4d2e768 (Task 3 RED test)
- FOUND: 1ba9084 (Task 3 GREEN feat)
- FOUND: 4e72784 (Task 3 Rule-3 fix)

Test suite verified:
- `pnpm test` → 65 passed / 4 skipped / 0 errors
- `pnpm test game/entities/Cluu.test.ts` → 11 passed

Literal grep gates verified:
- `setLerp(0.1, 0.1)` present exactly once in `game/scenes/MeadowScene.ts`
- `extends Phaser.GameObjects.Container` present in `game/entities/Cluu.ts`
- `STOP_RADIUS = 24` present in `game/systems/follow.ts`

---
*Phase: 01-scaffold*
*Completed: 2026-04-21*
