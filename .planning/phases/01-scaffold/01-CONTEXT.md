# Phase 1: Scaffold - Context

**Gathered:** 2026-04-20 (auto mode — recommended defaults logged)
**Updated:** 2026-04-20 (interactive revision — proxy convention + Vitest 4 bump)
**Status:** Ready for planning — **Plans 01 + 02 need regeneration** (see footer)

<domain>
## Phase Boundary

Stack alignment proven end-to-end: anonymous user loads `cluu.game`, walks an invisible anchor across a grass scene with Cluu following like a pet, signs in via magic-link email, state persists across refresh, signs out from any screen. No encounters yet, no grading, no Anthropic calls. The deliverable is a skeleton that every subsequent phase inherits from.

Requirements covered: **AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, WORLD-01, WORLD-02, WORLD-03, WORLD-04, CLUU-01, PERS-02, OPS-04** (12 total).

BLOCKER pitfalls absorbed: Pitfall 4 (anon→authed migration), Pitfall 5 (Phaser SSR + scene-leak guards), Pitfall 12 (PostHog consent-gate + privacy policy draft).
</domain>

<decisions>
## Implementation Decisions

### Scaffold approach
- **D-01:** Fork `phaserjs/template-nextjs` as the starting point, then upgrade Next.js to **16.2.x** and React to **19.2.x**. Rationale: the official template has the Phaser↔React EventBus bridge + `next/dynamic ssr:false` pattern already working — hand-rolling this is the fastest way to burn Phase 1 on Phaser-SSR hydration bugs (Pitfall 5). [auto-selected: recommended]
- **D-02:** Use `pnpm` as the package manager; workspaces enabled from day 1 so `@logic-md/core` can be linked in Phase 2 via `workspace:*` without restructuring.
- **D-03:** Turbopack is the bundler (Next 16 default). Do not disable it.

### Auth model
- **D-04:** Use **Supabase anonymous sign-ins** on first visit. A real `auth.users` row exists from the first page load — Zustand and `player_state` keys on that user id. On magic-link signup, the existing anon user is upgraded via `supabase.auth.updateUser({ email })` — **no row migration, no data copy**. Rationale: per STACK.md, this reduces Phase 1 migration surface from "merge localStorage + server state" to "toggle an `is_anonymous` flag." [auto-selected: recommended; resolves Pitfall 4]
- **D-05:** Magic-link emails ship via Supabase's default SMTP for Phase 1. Branded sender (Resend) deferred to Phase 5 launch-hardening.
- **D-06:** Sign-out lives in a persistent settings affordance (top-right icon in the React overlay) reachable from every screen, including during encounter UI (Phase 2+).

### Phaser scene structure
- **D-07:** Multi-scene architecture from day 1: **BootScene** (preload + splash) → **MeadowScene** (gameplay) → **UIScene** (HUD overlay inside Phaser layer, separate from React overlay). Phase 2's encounter sprite lives in MeadowScene; Phase 3's Village/Workshop/TidePools/Library scenes plug into the same graph without refactoring. [auto-selected: recommended]
- **D-08:** Single `Phaser.Game` instance per page mount. Scene transitions via `scene.start()` / `scene.launch()`, not new Game instances. `game.destroy(true)` on React unmount (Pitfall 5 scene-leak guard).
- **D-09:** Phaser mounts via `next/dynamic` with `ssr: false` in `app/play/GameClient.tsx` — the single entry point from Next.js into Phaser. No other `app/` code imports from `game/`.

### World + input
- **D-10:** Meadow tiles are **32×32** hand-placed sprites for Phase 1 (one small scene, ~30 tiles). Tilemap JSON/Tiled format deferred to Phase 3 when biome count justifies the authoring tool.
- **D-11:** Player moves an invisible anchor via tap-to-move on touch, WASD + arrow keys on desktop. Cluu follows via simple seek-behavior — constant speed toward anchor, stops within 24px radius. Arcade Physics only for anchor/Cluu collision with world bounds.
- **D-12:** Camera follows the anchor with `setLerp(0.1, 0.1)` for soft follow, bounded by scene dimensions.

### Cluu rendering
- **D-13:** Cluu is composed of **4 independent sprite layers** rendered in a Phaser Container: base body → body pattern → head (hat) → eyes → back accessory. Each slot is an empty sprite in Phase 1 (all `null` cosmetics), but the compositing pipeline is in place. Phase 3 cosmetics swap the sprite texture in the matching slot. Retrofit from single-sprite to multi-layer in Phase 3 would be painful — pay the cost here. [auto-selected: recommended]
- **D-14:** Cluu mood sprites ship a single "Content" pose in Phase 1. Four passive moods (Stoked/Content/Sleepy/Blue) and two in-encounter states (Curious/Sparkling) are Phase 3 work — but the sprite-swap API exists in Phase 1 (`cluu.setMood('content')` is a no-op-but-real method).

### State persistence
- **D-15:** Zustand store uses the **Store Factory + `<StoreProvider>`** pattern per Next.js App Router guidance (STACK.md "Integration gotchas") — no global singleton. Persist middleware writes to `localStorage` under key `cluu-game-v1`.
- **D-16:** On auth state change from anonymous → authed, client reads localStorage + POSTs a single idempotent `/api/migrate-anonymous` Server Action that no-ops if the migration flag is already set on `player_state`. Write an integration test for this path in Phase 1, not Phase 3 (Pitfall 4).
- **D-17:** Supabase server-side access always calls `supabase.auth.getUser()` (never `getSession()`) in Server Components, Server Actions, the Next.js `proxy.ts` (see D-25), and Route Handlers.
- **D-18:** Row-Level Security is enabled on every table (`users`, `player_state`, `library_entries`, `cosmetic_catalogue`, `user_cosmetics`, `encounter_attempts`) with `user_id = auth.uid()` policies. A negative test confirms user A cannot read user B's `player_state` before Phase 1 exits.

### Deploy + ops
- **D-19:** Deploy to Vercel on branch push from day 1. Production domain `cluu.game` is wired after DNS is provisioned — Phase 1 can ship to `cluu-preview.vercel.app` if `cluu.game` isn't ready yet; success criteria don't require the vanity domain.
- **D-20:** PostHog is initialised behind a **cookie-consent gate** in `app/layout.tsx` — no analytics events fire until the user has opted in via a lightweight banner on first visit (Pitfall 12, POPIA). Banner copy: "We use PostHog to understand gameplay. Accept or decline — no dark patterns."
- **D-21:** Sentry is wired into `app/global-error.tsx` and the Next.js `proxy.ts` (see D-25) in Phase 1. Event volume will be near zero but the wiring is in place for Phase 2's grading-pipeline errors.
- **D-22:** Runtime target for all server entry points in Phase 1: **Node.js / Fluid Compute** (default). No Edge runtime anywhere yet; `next/og` doesn't ship until Phase 4.

### Next.js 16 middleware → proxy convention (revision added 2026-04-20)
- **D-25:** Use Next.js 16's `proxy.ts` file convention (**not** `middleware.ts`). The file lives at the project root as `proxy.ts` and exports a named `proxy` function (not `middleware`). Rationale: Next 16 deprecated the `middleware.ts` / `middleware` name pair and renamed them to `proxy.ts` / `proxy`. Supabase's official SSR documentation has been updated to match the new convention as of April 2026. The earlier note in this file that Supabase docs still used `middleware.ts` was factually outdated.
- **D-26:** Inside `proxy.ts`, the Supabase cookie-sync pattern MUST explicitly copy cookies from the incoming `request` to a **mutable** `NextResponse` object before returning. If you return the response without this sync, users hit a known sign-out-loop bug on the `proxy.ts` convention where the refreshed session cookie is set on a response the middleware discards. Pattern: `const response = NextResponse.next({ request }); supabase.auth.getUser(); // triggers refresh; response.cookies.set(...) for each refreshed cookie`.
- **D-27:** Rename `lib/supabase/middleware.ts` → `lib/supabase/proxy.ts` for internal consistency with the root-level `proxy.ts`. Any helper exported from this file is `createProxyClient` (not `createMiddlewareClient`). Update every import that referenced the old filename.

### Testing
- **D-23 (revised 2026-04-20):** Vitest is the unit test runner from day 1, pinned to **`vitest@^4.1`** (Vitest 4.1.4 is the current stable release on npm as of April 2026) and `@vitest/ui@^4.1`. The earlier auto-selected `^2.1.8` pin was two major versions behind. Vitest 4 requires Node ≥ 20 and Vite ≥ 6, both satisfied by the existing Node 24 pin. Migration surface to be aware of (none of Phase 1's three planned tests touch these, so this is a clean bump with no rewrites): V8 coverage now uses AST-based analysis — coverage numbers will differ from v2; the `workspace` config option was renamed to `projects`; the browser provider config accepts an object instead of a string. Phase 1 ships with tests for: (a) Zustand store factory hydration, (b) anonymous→authed migration action idempotency, (c) sanitize() placeholder (even though Phase 2 owns the real implementation).
- **D-24:** Playwright E2E is deferred to Phase 5. Phase 1 relies on manual smoke on iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari.

### Claude's Discretion
- Exact tile art direction (palette, sprite style) — no visual style guide has been finalised; a solid colour pastel grass tile is acceptable for Phase 1.
- Onboarding copy for the magic-link screen (kept minimal; full onboarding polish is Phase 5).
- Loading skeleton style for the Phaser `<canvas>` placeholder (100–300ms before Phaser hydrates).
- Exact anchor/Cluu sprite sizes beyond the 48×48 Cluu established in design doc §13.
- File naming conventions inside `game/` beyond the directory layout in ARCHITECTURE.md.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Locked spec
- `docs/cluu-v1-design.md` §1 (Locked constraints), §2 (Core loop), §7 (Cluu companion), §8 (Technical stack — as amended 2026-04-20), §9 (Data model)
- `docs/cluu-v1-design.md` "Amendments" table — Next.js 14 → 16.2.x and Phaser 3.80+ → 3.90.x

### Project-level
- `.planning/PROJECT.md` — Key Decisions table, Constraints, Core Value
- `.planning/REQUIREMENTS.md` — Full requirement list (the 12 mapped to Phase 1 and the rest to preview what's coming)

### Stack (pinned versions and install block)
- `.planning/research/STACK.md` — entire doc; specifically the "Critical deviations from design doc §8" table, the "Recommended Stack" table, the "Installation (copy-paste-ready)" block, and the "Integration gotchas" section (Phaser+Next, Supabase SSR, Zustand Store Factory)

### Architecture (load-bearing for Phase 1)
- `.planning/research/ARCHITECTURE.md` "Standard Architecture" → System Overview diagram
- `.planning/research/ARCHITECTURE.md` "Recommended Project Structure" → directory tree (`app/`, `game/`, `ui/`, `lib/`, `state/` layout)
- `.planning/research/ARCHITECTURE.md` "Architectural Patterns" → Pattern 1 (Phaser+`next/dynamic`), Pattern 2 (EventBus), Pattern 4 (Zustand↔Supabase reconciliation)
- `.planning/research/ARCHITECTURE.md` "Anti-Patterns to Avoid" → 1 (React-in-Phaser), 4 (per-frame sync), 5 (`getSession()` in RSC)

### Pitfalls (Phase 1 absorbs these)
- `.planning/research/PITFALLS.md` Pitfall 4 (anonymous→authed migration)
- `.planning/research/PITFALLS.md` Pitfall 5 (Phaser+Next App Router SSR + scene leaks)
- `.planning/research/PITFALLS.md` Pitfall 12 (POPIA consent + analytics gating)

### External templates + docs (read for patterns)
- `https://github.com/phaserjs/template-nextjs` — Phaser official Next.js template, source of the EventBus bridge
- `https://supabase.com/docs/guides/auth/auth-anonymous` — Supabase anonymous sign-ins + `updateUser({ email })` upgrade flow
- `https://supabase.com/docs/guides/auth/server-side/nextjs` — App Router auth middleware + cookie session refresh
- `https://zustand.docs.pmnd.rs/guides/nextjs` — Store Factory + Provider pattern for SSR-safe Zustand
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — this is the first phase and the repo contains only `docs/` and `assets/`. Every asset in Phase 1 is net-new.

### Established Patterns
- None yet. Phase 1 establishes the patterns that Phases 2–5 inherit:
  - `game/` quarantined from `app/`
  - `lib/` server-only utilities guarded by `import 'server-only'`
  - Zustand stores in `state/` with Store Factory pattern
  - `ui/` components for React DOM overlay (stacked above Phaser `<canvas>`)
  - EventBus (`game/bridge/EventBus.ts`) as the ONLY Phaser↔React seam

### Integration Points
- Next.js `app/layout.tsx` — root layout wraps StoreProvider + consent gate
- `proxy.ts` (Next.js 16 convention — see D-25/D-26) — Supabase session refresh runs on every matched request; exports a named `proxy` function; cookies synced explicitly to a mutable response (D-26 pattern)
- `lib/supabase/proxy.ts` (see D-27) — `createProxyClient` helper used by the root `proxy.ts`
- `app/play/GameClient.tsx` — Phaser mount point, `next/dynamic ssr:false`, the ONE import boundary between Next and Phaser
- `app/auth/callback/route.ts` — magic-link callback that completes the anonymous upgrade
- `supabase/migrations/*.sql` — schema + RLS policies; migration runs in CI and locally via `supabase db reset`
</code_context>

<specifics>
## Specific Ideas

- Follow the official Phaser Next.js template's file layout so future contributors (or the builder returning in 6 months) can pattern-match from public documentation.
- The magic-link email screen should feel like ~3 lines of copy + one input + one button. No marketing text, no branding flourishes. Phase 5 polishes it; Phase 1 makes it work.
- Cluu's default pose in Phase 1 should be "Content" — the middle mood — because the player has just arrived and we haven't earned "Stoked" or decayed to "Sleepy" yet.
- The PostHog consent banner must NOT be a dark-pattern ("Accept All" the only visible button with a greyed-out "Decline"). Equal-weight buttons, neutral copy.
</specifics>

<deferred>
## Deferred Ideas

- **Library UI + export (LIB-01..07)** — Phase 3 (in-game Library book + web `/library` route + MD export) and Phase 4 (JSON + PNG share cards)
- **Encounter engine + grading gateway (ENC-01..10, ENG-01..06)** — Phase 2 walking skeleton
- **Mood system states + transitions (CLUU-02..06)** — Phase 3; Phase 1 ships the sprite-swap API with a single "Content" pose
- **Cosmetic catalogue seed + Wardrobe UI (CLUU-07..08, COS-01..03)** — Phase 3; Phase 1 ships the 4-layer sprite compositing pipeline
- **Biome progression gates (WORLD-05)** — Phase 4
- **Pause + encounter markers (WORLD-06, WORLD-07)** — Phase 3
- **Account deletion flow (AUTH-06)** — Phase 4 (paired with POPIA data export)
- **Branded SMTP (Resend)** — Phase 5 launch hardening
- **Playwright E2E suite** — Phase 5
- **Visual style guide + final tile art** — tracked as a separate deliverable per design doc §16; Phase 1 ships with placeholder art
</deferred>

---

## Revision 1 — Plan regeneration required (2026-04-20)

Two decisions were added/revised after the initial auto run:

- **D-25/D-26/D-27** — Next.js 16 `proxy.ts` convention (rename, function export, cookie-sync bug workaround). Touches **Plan 01** (any `middleware.ts` scaffolding references) and **Plan 02** (file rename, function rename, cookie-sync pattern in `lib/supabase/proxy.ts`).
- **D-23 revised** — Vitest bumped from `^2.1.8` to `^4.1`. Touches **Plan 01** (install block, any `vitest.config.ts` shape if present).

**Action:** regenerate **Plans 01 and 02 only**. Plans 03–08 should be unaffected — confirm during review rather than asserting it. Suggested command: `/gsd:plan-phase 1 --reviews` (after producing a REVIEWS.md) OR re-run the planner manually on Plans 01/02 with the revised CONTEXT.md.

---

*Phase: 01-scaffold*
*Context gathered: 2026-04-20; revised 2026-04-20*
