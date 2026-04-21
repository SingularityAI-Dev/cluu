# Roadmap: Cluu v1

## Overview

Cluu ships in five coarse phases that front-load integration risk and back-load content volume. Phase 1 proves the stack (Next.js 16 + Phaser 3.90 + Supabase) can walk Cluu on grass and persist state. Phase 2 is the walking-skeleton encounter — two LLM calls + LOGIC.md compilation + Phaser↔React seam on ONE plant — the single load-bearing deliverable: if this works, the rest is execution. Phase 3 proves the engine scales to biome-sized content and ships the Library Markdown export (Core Value) for weekly dogfooding. Phase 4 authors the remaining four biomes and lights up JSON + PNG share-card exports. Phase 5 hardens onboarding, performance, accessibility, and POPIA before public launch. The Library export is never cuttable. Tide Pools biome is the designated scope-flex lever if schedule slips at Phase 4 midpoint.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4, 5): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Scaffold** - Anonymous user loads /play, walks Cluu on grass, signs in with magic link, state persists
- [ ] **Phase 2: Walking Skeleton** - One encounter end-to-end: tap plant, write prompt, see streaming response, plant revives, verdict renders (project lives or dies here)
- [ ] **Phase 3: Meadow + Persistence + Library MD** - Meadow biome playable, mood + cosmetics render, Library Markdown export opens in Obsidian, first alpha
- [ ] **Phase 4: Remaining Biomes + Share Cards** - Village, Workshop, Tide Pools, Library-capstone biomes ship; JSON + PNG exports live; second alpha
- [ ] **Phase 5: Launch Hardening** - 60fps on iPhone SE 2020, <2MB bundle, onboarding redo, a11y audit, POPIA audit, public launch

## Phase Details

### Phase 1: Scaffold
**Goal**: Anonymous user loads `/play`, walks Cluu on grass, signs in with magic-link email, state persists across refresh. No encounters yet, nothing grading — just stack alignment proven.
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, WORLD-01, WORLD-02, WORLD-03, WORLD-04, CLUU-01, PERS-02, OPS-04
**Success Criteria** (what must be TRUE):
  1. Visitor can open `cluu.game` and start playing without signing in (anonymous state in localStorage)
  2. Visitor can move an anchor around a grass scene via touch on mobile and WASD/arrow-keys on desktop, with Cluu following like a pet
  3. Visitor can sign in via magic-link email on iOS Safari, Android Chrome, and desktop Chrome/Firefox/Safari, and their anonymous progress (cosmetics, localStorage state) transfers to their account without loss
  4. Signed-in user can refresh the browser and remain logged in; signing out works from any screen
  5. Every Supabase table has Row-Level Security keyed to `auth.uid()` verified by a negative test
**Plans**: TBD
**UI hint**: yes
**BLOCKER pitfalls absorbed**: Pitfall 4 (anon→authed migration via `/api/migrate-anonymous` idempotent route), Pitfall 5 (Phaser SSR + scene-leak guards, strict-mode on, single-page-game architecture), Pitfall 12 (PostHog consent-gate before any analytics load, privacy policy draft)
**Research flag**: Skip `/gsd-research-phase` — stack alignment follows official `phaserjs/template-nextjs` + Supabase App Router docs + Zustand Next.js guide; no novel integration work

### Phase 01.1: Visual style + Cluu feel (INSERTED)

**Goal:** Replace Phase 1 placeholder art with production visual identity. Ship design-doc §16 single-image style guide, `lib/design/tokens.ts` named palette + spacing + radii, production Cluu Content pose (chubby 4-legged creature, 48×48, Aseprite-authored) with idle animation (breath baseline + occasional blink + occasional head_turn), production Meadow grass tile using the locked D-09 green triad, Withered Sunflower before/after encounter sprites (unblocking Phase 2's Describe encounter), and a reusable encounter-object authoring spec so Phases 2–4 inherit the art-production contract.
**Requirements**: none (INSERTED art/quality phase — no REQ-IDs map here)
**Depends on:** Phase 1
**Plans:** 5 plans

Plans:
- [ ] 01.1-01-PLAN.md — Create lib/design/tokens.ts (named palette + spacing + radii + hexToInt)
- [ ] 01.1-02-PLAN.md — Write docs/encounter-object-authoring.md authoring spec
- [ ] 01.1-03-PLAN.md — Human-in-the-loop art delivery (Cluu spritesheet + meadow tile + Sunflower before/after + style guide)
- [ ] 01.1-04-PLAN.md — Wire production art into Phaser (BootScene Aseprite loader + Cluu idle animation + tokens consumed by config/MeadowScene)
- [ ] 01.1-05-PLAN.md — Palette-audit Vitest test + sprite-fixtures exit-gate test + verification sweep

### Phase 2: Walking Skeleton — The One Encounter
**Goal**: End-to-end encounter loop works on ONE plant — the Withered Sunflower. Player taps plant, writes a prompt, sees Sonnet response stream, plant revives visually, Haiku grades the prompt, verdict renders with per-assertion breakdown. Grading Gateway, LOGIC.md compiler, rate-limit, cache, EventBus, and dispute flow all prove out before any content volume.
**Depends on**: Phase 1
**Requirements**: ENC-01, ENC-02, ENC-03, ENC-04, ENC-05, ENC-06, ENC-07, ENC-08, ENC-09, ENC-10, ENG-01, ENG-02, ENG-03, ENG-04, ENG-05, OPS-02
**Success Criteria** (what must be TRUE):
  1. Player can tap the Withered Sunflower, type "a tall sunflower with a cracked stem just about to bloom", see the generated response stream in, watch the plant revive visually, and see a Flair verdict with per-assertion breakdown — within one browser session
  2. Every encounter attempt is server-authoritative: input is sanitized (500 chars, XML tags stripped), rate-limited via Upstash (20/day authed, 5/day anonymous), deduped via `sha256(encounterId+normalizedPrompt)` cache, and audited in Postgres with `{encounterId, verdict, tokensUsed, cached}` tags
  3. The Sunflower encounter passes the 50-prompt test suite at ≥48/50 human/Haiku agreement, and `npm run eval` runs in CI against a pinned Haiku snapshot (not the alias)
  4. A Fail verdict always includes a one-tap "dispute" button that auto-awards Pass and queues the prompt for review; every contract has a semantic-pass OR clause so poetic prompts are not false-rejected
  5. Flair verdict offers to save the prompt to a persistent Library; all client→Anthropic paths flow through `POST /api/encounter/attempt` on Node runtime (Anthropic key never touches the browser)
**Plans**: TBD
**UI hint**: yes
**BLOCKER pitfalls absorbed**: Pitfall 1 (pinned `claude-haiku-4-5-<snapshot>` in `.logic.md` front-matter + `npm run eval` CI gate), Pitfall 2 (dispute button + semantic-pass OR clause + ≥10 "unconventional wins" fixtures in the 50-prompt suite), Pitfall 3 (Sunflower contract tuned so any 3-word + 1-adjective prompt Passes on attempt 1; placeholder ghost-text "try: a bright yellow flower with three petals"; Cluu walks toward plant pre-tap as behavioral teaching), Pitfall 9 (pre-flight jailbreak classifier, tighter anonymous cap, per-IP limit)
**Research flag**: `/gsd-research-phase` candidate — Anthropic SDK streaming semantics on Vercel Fluid Compute Node runtime under real load; `@logic-md/core` API surface (studio-internal, expect churn); Haiku 4.5 structured-output edge cases for per-assertion grading JSON

### Phase 3: Meadow Content + Persistence Loop + Library MD Export
**Goal**: Prove the engine scales to biome-sized content. Ship 7 Meadow encounters, the full mood + cosmetic rendering system, Supabase persistence for all player state, and the Library Markdown export (Core Value). First alpha (5–10 friends) at phase end.
**Depends on**: Phase 2
**Requirements**: WORLD-06, WORLD-07, CLUU-02, CLUU-03, CLUU-04, CLUU-05, CLUU-06, CLUU-07, CLUU-08, CONT-01, CONT-06, LIB-01, LIB-02, LIB-03, LIB-04, COS-01, COS-02, COS-03, PERS-01, PERS-03, PERS-04, OPS-01, A11Y-01, A11Y-02, A11Y-03, A11Y-04
**Success Criteria** (what must be TRUE):
  1. Player can complete all 5–7 Meadow Describe encounters end-to-end, earn encounter-gated cosmetics that render across 4 Cluu slots (head / body / pattern / back / eyes), and change equipped cosmetics via the Wardrobe UI
  2. Cluu displays all four passive moods (Stoked / Content / Sleepy / Blue) with colour-blind-safe + shape-differentiated signals, plus Curious and Sparkling in-encounter states; mood decays with absence and recovers one step on every return but NEVER affects progression, unlocks, or saved content
  3. Player can save Flair-rated prompts to a persistent Library visible both in-game (as a book Cluu carries) and on the web `/library` route, and export the Library as a single Markdown file grouped by biome/mechanic that opens cleanly in Obsidian
  4. All player state (mood, progress, unlocked biomes, cosmetics, library) persists to Supabase Postgres via debounced Server Actions (anchor position never syncs); library and cosmetic grants are idempotent; the player can pause mid-encounter and resume without losing progress or prompt draft
  5. All HTML overlays (Encounter Panel, Library, Wardrobe, Settings) are fully keyboard-navigable, respect `prefers-reduced-motion`, and every SFX event has a visual equivalent; PostHog tracks UX events with NO raw prompts (POPIA default OFF)
**Plans**: TBD
**UI hint**: yes
**BLOCKER pitfalls absorbed**: Pitfall 10 (Library MD export snapshot tests with Unicode, Flair+Pass mix, 3/10 entry fixtures — committed expected outputs, CI fails on any diff; `*Exported from Cluu · v1*` header as versioned public API)
**MAJOR pitfalls absorbed**: Pitfall 8 (`/admin/logic` authoring tool + synthetic test-prompt generation via Sonnet — measure authoring velocity at week 5; if >4h/encounter, invest one day in tool before Phase 4), Pitfall 11 (reduced-motion toggle, aria-live verdicts, focus indicators, shape+icon+text mood signals)
**Research flag**: Skip `/gsd-research-phase` — patterns are proven from Phase 2; admin authoring tool is standard Next.js admin page work

### Phase 4: Remaining Biomes + Share Cards
**Goal**: Author the remaining four biomes (Village, Workshop, Tide Pools, Library-capstone) and ship JSON + PNG share-card exports. Longest phase — engine is proven, this is volume. Second alpha (20–50 testers) at midpoint with session-length telemetry.
**Depends on**: Phase 3
**Requirements**: WORLD-05, CONT-02, CONT-03, CONT-04, CONT-05, LIB-05, LIB-06, LIB-07, AUTH-06, OPS-03
**Success Criteria** (what must be TRUE):
  1. Player progresses through 5 biomes gated in order (Starter Meadow → Neighbour Village → Sorting Workshop → Tide Pools → Library) with each biome unlocked on completion of the prior biome's arc
  2. Village ships 6–8 Request encounters with NPC dialogue, Workshop ships 6–8 Contract encounters with JSON-shape grading, Tide Pools ships 6–8 Tool encounters with tool-inventory coupling *(scope-flex — first cut if schedule slips; defer to v1.1)*, and Library ships 4–6 capstone meta-encounters
  3. Player can export their Library as a JSON array (scriptable) and as 1200×630 PNG share cards via `next/og` containing Cluu, prompt, island name, tags, and watermark — with prompts length-capped + profanity-filtered + PII-scanned before baking
  4. Player can toggle raw-prompt logging opt-in from Settings (default OFF), request account deletion with full data cascade (POPIA right-to-deletion), and export their own data
  5. Share-card URLs are opaque signed UUIDs (never `?prompt=` query params), rate-limited per user, and a pre-flight Haiku moderation pass blocks abuse before image generation
**Plans**: TBD
**UI hint**: yes
**Scope-flex gate**: If behind schedule at Phase 4 midpoint, drop Tide Pools (CONT-04) to v1.1 per design doc §12 slippage budget. Remove biome entry from world map entirely — do NOT ship a "coming soon" placeholder. Meadow + Village + Workshop + Library-capstone is a shippable arc. Never cut Library export (LIB-01 through LIB-07), grading reliability (ENC-10), or the first-encounter-magic requirement (ONB-01).
**BLOCKER pitfalls absorbed**: Pitfall 10 (JSON + PNG export snapshot discipline extends MD discipline — schema decoupled from DB via dedicated mapper; weekly dogfood export-and-open-in-Obsidian ritual)
**MAJOR pitfalls absorbed**: Pitfall 6 (share-card opaque-UUID signed URLs, PII scan pre-card-gen, per-user share rate-limit, Haiku moderation pass), Pitfall 12 (right-to-deletion cascade endpoint, minors guard at sign-up, raw-prompt logging opt-in UI)
**Research flag**: `/gsd-research-phase` candidate — PII-detection library choice (lightweight pattern match vs Haiku safety classifier cost profile); `next/og` + Satori JSX/CSS rendering quirks at 1200×630 with custom fonts + sprite composition; Supabase Storage signed-URL patterns for share-card caching

### Phase 5: Launch Hardening
**Goal**: Make it feel like a product. Onboarding redo from alpha-1 session recordings, real-device iOS Safari pass, performance audit, accessibility audit, POPIA audit, budget kill-switch, public beta then public launch.
**Depends on**: Phase 4
**Requirements**: PERF-01, PERF-02, PERF-03, PERF-04, ONB-01, ONB-02, ENG-06
**Success Criteria** (what must be TRUE):
  1. Game sustains 60fps on a real iPhone SE 2020 during a Meadow encounter, runs smoothly on a 5-year-old Android device, ships with <2MB initial bundle (Phaser lazy-loaded off landing), and first-contentful-paint on landing is <1.5s on 4G
  2. A first-time player with no instructions reaches and completes their first encounter within 5 minutes, measured via PostHog funnel at ≥70% completion rate (ONB-02 ship gate)
  3. A global daily Anthropic spend kill-switch halts all grading calls when the configured ceiling is exceeded, with Sentry alerts firing at 50% of budget and weekly cron running the eval suite against `claude-haiku-4-5-latest` for snapshot-drift early warning
  4. Lighthouse accessibility score ≥90 and a VoiceOver playthrough completes the first encounter end-to-end; POPIA audit confirms consent fires before PostHog loads, `/account/delete` cascade works, minors flow is wired, and information officer is registered
  5. Playwright E2E smoke tests cover auth + first encounter + library export; public beta launched; public launch shipped at `cluu.game`
**Plans**: TBD
**UI hint**: yes
**BLOCKER pitfalls absorbed**: Pitfall 3 (onboarding REDO from alpha-1 session recordings — not a tweak pass; if <70% at alpha-1, first-5-min is rebuilt from scratch)
**MAJOR pitfalls absorbed**: Pitfall 7 (real-device iOS Safari tap-to-begin audio gate, visibility API for tab-switch audio recovery), Pitfall 9 (cost budget kill-switch + per-IP limit final tuning), Pitfall 11 (Lighthouse + VoiceOver audit, colour-contrast + focus-ring final pass), Pitfall 12 (full POPIA audit — consent, deletion, minors, information-officer registration, deliverability pass via own SMTP for magic links)
**Research flag**: `/gsd-research-phase` candidate — real-device iOS Safari audio context + visibility API patterns specific to Phaser 3.90; Lighthouse accessibility audit automation in CI; Vercel log drain configuration for POPIA IP pseudonymization

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 (decimal phases, if ever inserted, execute between their surrounding integers: e.g., 2 → 2.1 → 3)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Scaffold | 7/8 | In progress | - |
| 2. Walking Skeleton | 0/TBD | Not started | - |
| 3. Meadow + Persistence + Library MD | 0/TBD | Not started | - |
| 4. Remaining Biomes + Share Cards | 0/TBD | Not started | - |
| 5. Launch Hardening | 0/TBD | Not started | - |

---

## Scope Anchors (non-negotiable — do not re-litigate)

**Must-not-cut (project-failure-level if dropped):**
- **Library export (MD + JSON + PNG)** — Core Value per PROJECT.md: "if the Library export doesn't work, the project has failed." MD ships in Phase 3; JSON + PNG in Phase 4.
- **Walking-skeleton encounter in Phase 2** — single most important deliverable. If two-call grading + `.logic.md` compile + Phaser↔React seam fail here, nothing downstream matters.
- **≥95% human/Haiku grading agreement per encounter before release** (ENC-10) — ship gate per design doc §13 and PROJECT.md §Active. CI-enforced from Phase 2.

**Scope-flex lever (the cut, if schedule slips at Phase 4 midpoint):**
- **Tide Pools biome (CONT-04) → v1.1** — explicitly designated by design doc §12 slippage budget. Remove the biome entry from the world map; do not ship a "coming soon" placeholder.

**Stack amendment already recorded (do not re-surface):**
- **Next.js 14 → 16.2.x** — Next 14 hit EOL 2025-10-26. Amendment is locked in PROJECT.md constraints, STACK.md, and design doc footer.

---

## Requirement Coverage

All 71 v1 requirements mapped to exactly one phase. Zero orphans.

- Phase 1: 12 requirements (Auth + basic World + pet-follow + RLS + magic-link platforms)
- Phase 2: 16 requirements (Encounter loop + Engine + Sentry)
- Phase 3: 26 requirements (Mood + Cosmetics + Meadow content + Library MD + Persistence + PostHog + A11y)
- Phase 4: 10 requirements (Remaining biomes + JSON/PNG export + POPIA deletion + biome gating)
- Phase 5: 7 requirements (Performance + Onboarding + budget kill-switch)

Total: 12 + 16 + 26 + 10 + 7 = **71** ✓

*Note: REQUIREMENTS.md previously stated "59 total" — that number was stale. Actual count from the requirement list is 71. Traceability table in REQUIREMENTS.md is the source of truth.*

---

*Roadmap created: 2026-04-20*
*Granularity: coarse (5 phases)*
*Core Value: Library export is the tether between game and real life*
