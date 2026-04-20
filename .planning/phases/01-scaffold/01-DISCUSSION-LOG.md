# Phase 1: Scaffold - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 01-scaffold
**Mode:** auto (recommended defaults)
**Areas discussed:** Scaffold approach, Auth model, Phaser scene structure, World + input, Cluu rendering, State persistence, Deploy + ops, Testing

---

## Scaffold approach

| Option | Description | Selected |
|--------|-------------|----------|
| Fork `phaserjs/template-nextjs` | Start from Phaser's official template; upgrade Next to 16 and React to 19; inherit the EventBus bridge and `ssr:false` pattern from day 1. | ✓ (recommended) |
| `create-next-app` + hand-roll Phaser | Start clean with Next 16 App Router and build the Phaser mount + EventBus pattern from scratch. | |
| Nx/Turborepo monorepo | Set up a workspace with `apps/web` + `packages/game` + `packages/logic-md` as separate workspaces up front. | |

**Auto-selected:** Fork the official template. Reason: Pitfall 5 in PITFALLS.md specifically warns against SSR hydration bugs when hand-rolling Phaser in Next.js — the template is load-bearing infrastructure.

---

## Auth model (anonymous identity strategy)

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase anonymous sign-ins | Every first visit creates a real `auth.users` row; `player_state` keys on that user_id; magic-link signup calls `updateUser({email})` — no row migration. | ✓ (recommended) |
| Pure client-only localStorage | No server row until signup; on signup, copy localStorage state into a new row via `/api/migrate-anonymous`. | |
| Hybrid device-id | Assign a random device-id on first visit, server-side row keyed to device-id, migrate on signup. | |

**Auto-selected:** Supabase anonymous sign-ins. Reason: STACK.md §"Integration gotchas" explicitly prescribes this — it collapses Pitfall 4's "anonymous→authed migration" risk from a data-copy operation into a single field update.

---

## Phaser scene structure

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-scene from day 1 | BootScene → MeadowScene → UIScene in Phase 1; Village/Workshop/TidePools/Library scenes plug in later without refactor. | ✓ (recommended) |
| Single scene, split later | One Scene for everything; split into multi-scene when Phase 3 forces it. | |

**Auto-selected:** Multi-scene. Reason: ARCHITECTURE.md §"Recommended Project Structure" defines the scene graph; retrofit of a single-scene into multi-scene is exactly the work this phase is meant to prevent.

---

## World + input

| Option | Description | Selected |
|--------|-------------|----------|
| Hand-placed 32×32 tiles | Phase 1 ships one small scene with ~30 hand-placed tile sprites; no tilemap JSON. | ✓ (recommended) |
| Tiled JSON tilemap from day 1 | Author the meadow in Tiled, load via Phaser's Tilemap loader. | |
| Procedural tile layout | Generate the grass area procedurally from a seed. | |

**Auto-selected:** Hand-placed tiles. Reason: Tilemap authoring overhead isn't justified until Phase 3 when 5 biomes need to be authored. Procedural is over-engineering for a known-fixed meadow.

---

## Cluu rendering (cosmetic compositing foundation)

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-layer sprite (4 slots) | Cluu is a Phaser Container with base + body pattern + head + eyes + back as independent sprite layers from day 1, even though all slots are empty/null. | ✓ (recommended) |
| Single sprite in Phase 1, refactor in Phase 3 | Ship Cluu as one sprite; split into layers when cosmetics land. | |

**Auto-selected:** Multi-layer. Reason: The design doc §7.3 commits to 4 cosmetic slots; retrofitting a single-sprite Cluu into a layered one in Phase 3 would require rewriting every Cluu-rendering code path. Pay the architecture cost once, in Phase 1.

---

## State persistence

| Option | Description | Selected |
|--------|-------------|----------|
| Zustand Store Factory + Provider | Per STACK.md; avoids global singleton leaking across requests in App Router; persist middleware → localStorage. | ✓ (recommended) |
| Global Zustand singleton | Simpler but leaks state across requests — documented pitfall for App Router. | |
| Redux Toolkit + RTK Query | Heavier but more opinionated; unnecessary for Cluu's state shape. | |

**Auto-selected:** Store Factory + Provider. Reason: STACK.md §"Integration gotchas" specifies this exact pattern as the Next.js App Router-safe approach.

---

## Deploy + ops (domain + analytics gating)

| Option | Description | Selected |
|--------|-------------|----------|
| Preview URL first, cluu.game after DNS | Ship Phase 1 to `cluu-preview.vercel.app` if vanity domain isn't ready; PostHog behind consent gate; Sentry wired from day 1. | ✓ (recommended) |
| Block Phase 1 until cluu.game is DNS-ready | Wait on the vanity domain. | |
| Skip analytics + error tracking for Phase 1 | Wire PostHog + Sentry only when there's enough traffic to justify it. | |

**Auto-selected:** Preview URL first + consent-gated PostHog + Sentry. Reason: Success criteria don't require cluu.game; POPIA requires opt-in gating (Pitfall 12); Sentry wiring is cheap to do now and painful to add later after errors have been silent for weeks.

---

## Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest from Phase 1; Playwright deferred to Phase 5 | Unit tests for auth migration + Zustand store + sanitize placeholder. Manual browser smoke for cross-device. | ✓ (recommended) |
| Vitest + Playwright from Phase 1 | Wire E2E harness immediately. | |
| No tests in Phase 1 | Add testing when it becomes painful. | |

**Auto-selected:** Vitest now, Playwright in Phase 5. Reason: The tests Phase 1 needs (migration idempotency, store hydration) are unit-level. Playwright earns its keep in Phase 5 when there are full user journeys to cover.

---

## Claude's Discretion

- Exact tile art (final palette + sprite style) — deferred until a visual style guide exists
- Magic-link email copy polish — Phase 5 onboarding pass
- Loading skeleton style for Phaser canvas placeholder
- Anchor/Cluu sprite sizes beyond the 48×48 in design doc §13
- File naming conventions inside `game/` beyond the ARCHITECTURE.md directory layout

## Deferred Ideas

- Library UI + export → Phase 3 (MD) / Phase 4 (JSON + PNG)
- Encounter engine + grading gateway → Phase 2
- Mood system states + transitions → Phase 3 (Phase 1 ships sprite-swap API only)
- Cosmetic catalogue + Wardrobe UI → Phase 3
- Biome progression gates → Phase 4
- Pause + encounter markers → Phase 3
- Account deletion flow (AUTH-06) → Phase 4
- Branded SMTP (Resend) → Phase 5
- Playwright E2E suite → Phase 5
- Visual style guide + final tile art → separate deliverable per design doc §16
