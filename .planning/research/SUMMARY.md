# Project Research Summary

**Project:** Cluu v1
**Domain:** Browser 2D cozy game × LLM grading engine × exportable prompt library (greenfield solo build)
**Researched:** 2026-04-20
**Confidence:** HIGH (stack locked and verified; architecture follows documented patterns; pitfalls grounded in ecosystem postmortems)

## Executive Summary

Cluu is a Next.js App Router + Phaser 3.90 browser game with a server-authoritative LLM grading pipeline (Sonnet generate + Haiku grade) that persists through Supabase and exports the player's winning prompts as a real Library (Markdown / JSON / PNG). The locked design doc is strong, so this research is prescriptive about *ordering* rather than *inventing*: the walking-skeleton encounter in Phase 2 is the single load-bearing deliverable — if two-call grading + `.logic.md` compilation + Phaser↔React seam all work end-to-end on one encounter, the remaining 26–36 encounters and 4 biomes are execution. If any of those integrate badly, nothing downstream matters.

The recommended approach follows the five-phase coarse structure proposed in ARCHITECTURE.md §"Suggested Build Order": **Scaffold → Walking Skeleton → Meadow + Persistence → Remaining Biomes + Share Cards → Launch Hardening**. This ordering deliberately front-loads risk (grading gateway in Phase 2, not Phase 4) and back-loads content volume (bulk biome authoring in Phase 4, where throughput matters most and the engine is proven). Tide Pools biome is the designated scope-flex lever per design doc §12 slippage budget — if behind at the Phase 4 midpoint, drop it; ship Meadow + Village + Workshop + Library-capstone. The Library export is never cuttable; it is the Core Value.

The four BLOCKER-severity pitfalls concentrate in Phase 1–2: **Haiku model-version drift**, **creative-prompt false-rejects**, **first-5-minutes onboarding failure**, and **Library export regression**. Prevention requires pinning the Haiku snapshot (not the alias), shipping a dispute button + semantic-pass escape hatch from encounter #1, designing the first encounter to be almost-impossible-to-fail, and treating export format as a versioned public API with snapshot tests. The single most important amendment to the design doc has already been recorded: **Next.js 14 → 16.2.x (14 hit EOL 2025-10-26)**. The roadmapper should not revisit this.

## Key Findings

### Recommended Stack

The locked design doc §8 verifies cleanly with one mandatory amendment (Next.js 14 → 16 — EOL reason, already reflected in PROJECT.md and STACK.md). Everything else holds: Phaser Canvas, Supabase, Vercel Fluid Compute on Node (NOT Edge), Anthropic direct. One pattern-level prescription added: use the **Store Factory** pattern for Zustand to avoid SSR state leaks under App Router.

**Core technologies (pinned versions):**

| Layer | Technology | Version | Why |
|---|---|---|---|
| Framework | Next.js (App Router) | `16.2.4` | 14 is EOL 2025-10-26; 16 is Active LTS until ~2028; Turbopack stable default |
| UI | React | `19.2.x` | Pinned by Next 16 |
| Game engine | Phaser (Canvas renderer) | `3.90.0` | Current stable; Phaser 4 still RC7 — not production-ready |
| Language | TypeScript | `5.6.x+` | strict mode on |
| DB / Auth | Supabase (Postgres + Auth) | service | Magic-link, anonymous sign-in, RLS, POPIA-friendly |
| Supabase SSR | `@supabase/ssr` | `^0.10.2` | App Router cookie clients; never mix with deprecated `auth-helpers-nextjs` |
| LLM SDK | `@anthropic-ai/sdk` | `^0.90.0` | Generate: `claude-sonnet-4-6`; Grade: `claude-haiku-4-5` (pin dated snapshot in `.logic.md`) |
| Hosting | Vercel Fluid Compute | Node 24 LTS | `runtime: 'nodejs'` — NOT Edge; 300s streaming |
| Rate-limit / cache | `@upstash/redis` + `@upstash/ratelimit` | `^1.34` / `^2.0` | 20/day/user; prompt-hash cache; tighter cap for anonymous |
| Client state | Zustand | `^5.0.12` | Store Factory pattern (mandatory for App Router) |
| Validation | Zod | `^3.23` | Haiku JSON verdict, `.logic.md` front-matter, API bodies |
| Content parse | gray-matter | `^4.0.3` | YAML front-matter for `.logic.md` |
| Grading engine | `@logic-md/core` | `workspace:*` | Studio-internal; 10% build-time budget for dogfooding feedback |
| Share cards | `next/og` (bundled) | Next 16 | Do NOT install `@vercel/og` separately on Next 16 |
| Error tracking | `@sentry/nextjs` | `^10.48` | `beforeSend` scrubs raw prompts |
| Analytics | `@posthog/next` | latest | Consent-gated load (POPIA) |
| Dev tests | Vitest + Playwright | `^2` / later | Vitest for grader/compiler; Playwright added at Phase 5 |

Full install block, version-compat matrix, and integration gotchas (Phaser client-mount, Supabase anon→authed upgrade, streaming on Fluid, Zustand Store Factory) in `.planning/research/STACK.md`.

### Expected Features

FEATURES.md audits the locked scope against genre convention (cozy + educational + virtual pet) and surfaces **~13 missed table stakes** that should be treated as v1 requirements even though PROJECT.md does not yet list them. Locked Active requirements (from PROJECT.md, 17 items) are in-scope as-is; the additions below are research-surfaced gaps the roadmapper should fold into phase planning.

**Must have — locked scope (PROJECT.md §Active, already committed):**

- *Core loop:* walkable island, Cluu pet-follower, 4 passive moods + 2 in-encounter states, 5 gated biomes, 27–37 encounters across 5 mechanics
- *Grading pipeline:* `.logic.md` per encounter, two-call (Sonnet gen + Haiku grade), fail/pass/flair verdict with per-assertion breakdown
- *Library:* MD + JSON + 1200×630 PNG export (via `next/og`); Flair-gated save flow
- *Auth:* Supabase magic-link + anonymous play + in-place anon→authed upgrade via `updateUser({email})`
- *Safety / econ:* 500-char input cap, XML tag strip, meta-ignoring grader prompt, Upstash 20/day rate limit + prompt-hash cache, ≥95% human/Haiku agreement per encounter, 60fps on iPhone SE 2020, <2MB initial bundle
- *Launch:* Vercel at `cluu.game`, PostHog + Sentry, first 5 min magical

**Must have — research-surfaced additions (fold into v1 before phase freeze):**

- *Accessibility baseline:* reduced-motion toggle, color-blind-safe mood/verdict signals (shape+icon+text, never color alone), audio captions / visual SFX cues, keyboard-navigable HTML overlays
- *Mobile-web resilience:* pause/resume mid-encounter with prompt-draft persisted to localStorage, graceful API-failure UX (retry + preserve prompt), offline detection, rate-limit-exceeded UX (visible counter + "come back tomorrow")
- *POPIA UI surface:* account deletion + data export, explicit opt-in toggle for raw-prompt logging (default OFF), consent banner BEFORE PostHog loads, privacy policy page
- *Iteration support:* encounter replay (passed encounters re-attemptable for higher grade — required for meta-capstones), dispute button on Fail verdicts

**Defer (v1.1+):** paid cosmetic packs, localization, font-scale slider, cookie banner (if legal review confirms needed), founders' pack, Tide Pools content if cut.

**Permanently excluded (never v-anything):** leaderboards, streaks, social-proof metrics, notifications, progression-gated-on-mood, paid curriculum. These are load-bearing anti-features — mood system is deliberately decoupled from progression; there is no notification delivery subsystem.

Full feature matrix, dependency graph, and genre anti-pattern analysis in `.planning/research/FEATURES.md`.

### Architecture Approach

Three subsystems separated by sharp boundaries: **Phaser game canvas** (client-only, `ssr:false` dynamic import), **React UI overlay** (DOM elements stacked over the canvas — all text lives here for a11y), and **server-authoritative grading gateway** (`POST /api/encounter/attempt` on Node runtime). The Phaser↔React seam is a typed EventBus singleton (~6–8 events total). Zustand holds frame-accurate UI state (persist middleware for anonymous localStorage); debounced 5-second Server Actions reconcile only session-persistent slices (mood, progress, cosmetics) — anchor position is never synced.

**Major components:**

1. **Phaser Game (`game/`)** — quarantined from `app/`, one Scene per biome + UIScene, Canvas renderer (not WebGL), Arcade Physics, Cluu-follows-anchor pet AI
2. **React UI Overlay (`ui/`)** — `EncounterPanel`, `LibraryBook`, `Wardrobe`, `MoodBadge`, `SaveToLibraryOffer` — DOM, not Phaser sprites
3. **Grading Gateway (`app/api/encounter/attempt/route.ts`)** — THE choke point: auth guard → sanitize → rate-limit → prompt-hash cache lookup → LOGIC.md compile → Sonnet generate → Haiku grade (structured output) → persist audit row → cache → return verdict. Every encounter attempt goes through this; Anthropic key never touches the browser
4. **LOGIC.md Compiler (`lib/logic-md/`)** — pure function: `(contractPath, userPrompt) → {generationPrompt, gradingAssertions, rewardMessaging}`. `.logic.md` is versioned content in `/encounters/**`, not code
5. **Supabase (Auth + Postgres + RLS)** — `users`, `player_state`, `library_entries`, `cosmetic_catalogue`, `user_cosmetics`, `encounter_attempts`; `auth.uid() = user_id` on every policy; anonymous upgraded in-place via `updateUser({email})`
6. **Upstash Redis** — per-user daily counter (20/day authed, tighter for anonymous), prompt-hash cache (sha256(encounterId + normalizedPrompt), 7d TTL)

Critical integration rules (from ARCHITECTURE.md "Anti-Patterns to Avoid"): no React-in-Phaser, no client-side Anthropic calls, no hardcoded encounters, no per-frame Zustand→Supabase writes, no `getSession()` in Server Components (always `getUser()`), no Edge runtime for grading.

Full component responsibilities, data flow diagrams (encounter loop, anon→authed migration, session start, debounced writes), and directory structure in `.planning/research/ARCHITECTURE.md`.

### Critical Pitfalls — BLOCKER severity

Four pitfalls can kill the project. Each has an explicit phase assignment; the roadmapper should ensure each maps to concrete phase deliverables.

1. **Haiku model-version drift (Phase 1 setup + every phase gate)** — Pinning `claude-haiku-4-5-<snapshot>` in `.logic.md` front-matter is mandatory, NOT the alias. `npm run eval` regression harness must be built in Phase 1 week 3 (alongside the first encounter), CI-gated in Phase 2 onward, and run as a weekly cron against `-latest` in Phase 5. Prevention: every `.logic.md` ships with a `fixtures/<id>.json` of 50 (prompt, expected_verdict) pairs; CI fails if any drops below 48/50 agreement.

2. **Creative-prompt false-reject — the "I wrote something better than your rubric" failure (Phase 2 first encounter, ongoing)** — Rule-mechanical contracts systematically false-reject poetic prompts. Three mitigations must land in Phase 2 on encounter #1: (a) 50-prompt suite includes ≥10 "unconventional wins" fixtures, (b) every grading contract has a semantic-pass `OR` clause ("Pass if rules OR Haiku judges creative-fulfillment >0.8"), (c) every Fail verdict ships a "dispute" button that auto-passes + queues for review. Without this, every false-reject is a pedagogical lie and a retention-killer.

3. **First-5-minutes onboarding failure (Phase 2 first encounter + Phase 5 polish)** — PROJECT.md requires "first 5 min magical" but the aesthetic-minimalism rule ("no curriculum panels, no lesson numbers") conflicts with it. Design encounter #1 (Withered Sunflower) so any reasonable 3-word + 1-adjective prompt is guaranteed Pass (Flair reserved for attempt 2+). Placeholder text in the textarea ("try: a bright yellow flower with three petals") is the no-lecture tutorial. Cluu walks *toward* the plant pre-tap — behavioral teaching, not narration. Target: ≥70% first-encounter completion within 5 minutes at alpha-1 (end of Phase 3).

4. **Library export regression (Phase 3 MD launch, Phase 4 JSON/PNG, Phase 5 audit)** — PROJECT.md: *"if the Library export doesn't work, the project has failed."* Treat export format as a versioned public API from day one. Snapshot tests in `test/library-export.spec.ts` with fixtures (3 entries, 10 entries, Unicode, Flair+Pass mix) — expected outputs committed, CI fails on any diff. Export schema is decoupled from DB schema via a dedicated mapper function. Weekly dogfood: builder exports their own Library and opens in Obsidian.

Nine additional MAJOR-severity pitfalls (anon→authed migration corruption, Phaser scene leaks on App Router, share-card spam/PII vector, iOS Safari audio context loss, LOGIC.md authoring volume, jailbreak cost-loops, accessibility absence, POPIA broader surface, solo-builder decision fatigue) are catalogued with phase assignments in `.planning/research/PITFALLS.md`.

## Implications for Roadmap

### Proposed phase structure — 5 coarse phases (matches config `granularity=coarse`)

This structure is lifted **verbatim from ARCHITECTURE.md §"Suggested Build Order"** and validated against design doc §12 (24 weekly sprints compressed) and PITFALLS.md §"Pitfall-to-Phase Mapping". The roadmapper may adjust phase boundaries but the ordering is load-bearing: the walking-skeleton encounter must exist before content work begins.

### Phase 1: Scaffold — the skeleton has bones
**Rationale:** De-risks nothing novel — just proves stack alignment before any content or grading work.
**Delivers:** Anonymous user loads `/play`, walks Cluu on grass, signs in with magic link, state persists. No encounters yet. Nothing grading.
**Uses:** Next.js 16.2.4, Supabase (`@supabase/ssr` browser+server+middleware clients, magic-link + anonymous sign-in), Phaser 3.90 dynamically imported on `/play`, Zustand Store Factory with localStorage persist, all 5 Supabase tables + RLS policies.
**Implements:** Project structure quarantine (`game/` never imported from `app/`), single-page-game architecture decision, consent-before-analytics POPIA gate, style guide committed (Pitfall 13 pre-phase-0 deliverable).
**Addresses pitfalls:** 4 (anon→authed migration spec + idempotent `/api/migrate-anonymous`), 5 (Phaser SSR + scene-leak guards, React strict mode on), 12 (PostHog consent-gate, privacy policy draft).
**Exit gate:** Anonymous user loads `/play`, walks Cluu around on grass, signs in with magic link, state persists. No encounters yet. Nothing grading.

### Phase 2: Walking Skeleton — the one encounter (the project lives or dies here)
**Rationale:** This is the critical path. Two sequential LLM calls, rate-limit, cache, LOGIC.md compile, Phaser↔React EventBus, Zustand optimism, verdict animation — all must work together on one encounter before touching content volume. *If this phase works, the rest is execution. If it doesn't, nothing else matters.*
**Delivers:** Player taps the Withered Sunflower, writes a prompt, sees streaming response, plant revives visually, Flair verdict renders. Cost per attempt measured. 50-prompt test suite green at ≥48/50 agreement. `npm run eval` wired to CI.
**Uses:** `@anthropic-ai/sdk` (Sonnet 4.6 + Haiku 4.5 with pinned snapshot), `@logic-md/core`, Upstash Redis (rate-limit + cache), `lib/sanitize.ts`, EventBus (mitt), `POST /api/encounter/attempt` route handler on Node runtime.
**Implements:** Grading Gateway end-to-end; first `.logic.md` file (`encounters/meadow/withered_sunflower.logic.md`); regression harness (`scripts/grade-test.ts` + `fixtures/*.json`); dispute button on Fail; semantic-pass OR clause in contract; placeholder text + Cluu pre-tap gaze (onboarding foundation); pre-flight jailbreak classifier; anonymous tighter rate-limit cap (5/day).
**Addresses pitfalls:** 1 (pinned snapshot + eval harness), 2 (dispute button + semantic-pass + unconventional-wins fixtures), 3 (first-encounter guaranteed Pass on reasonable input, placeholder nudge), 9 (pre-flight classifier, anonymous cap, per-IP limit).
**Exit gate:** End-to-end: player taps plant, writes "a tall sunflower with cracked stem just about to bloom", sees the response stream, the plant revives visually, the verdict shows "Flair". Cost per attempt measured. Grading test suite green.

### Phase 3: Meadow Content + Persistence Loop — proving the engine scales
**Rationale:** Meadow is the content scale test. If authoring a new encounter takes >4 hours, the Phase 4 volume will crush the solo builder — fix authoring velocity here, not later. Library MD export ships here because it is P0 Core Value and should be dogfooded from week 4, not launch week.
**Delivers:** 7 Meadow encounters playable end-to-end, Library UI with Markdown export opening cleanly in Obsidian, mood + 4 cosmetic slots rendered, Wardrobe UI, first alpha (5–10 friends) at end of phase.
**Uses:** Supabase Server Actions (`updatePlayerState`, `savePromptToLibrary`, `equipCosmetic`) with debounced Zustand sync; Library MD generator + snapshot tests; `user_cosmetics` grant flow.
**Implements:** `/admin/logic` authoring tool (Pitfall 8 mitigation — built week 4, not week 5); synthetic test-prompt generation via Sonnet for 50-prompt suites; mood system (passive + in-encounter); cosmetic sprite layering; export-format versioning (`*Exported from Cluu · v1*` header).
**Addresses pitfalls:** 8 (admin authoring tool removes the velocity bottleneck), 10 (MD export snapshot tests from day one), 11 (reduced-motion toggle, aria-live verdicts, focus indicators on HTML overlays land here).
**Exit gate:** Meadow arc playable end-to-end. Library Markdown export opens cleanly in Obsidian. Mood transitions feel right. Can author a new encounter in ~4 hours.

### Phase 4: Remaining Biomes + Share Cards — content at scale
**Rationale:** Longest phase (~12 weeks). Engine is proven; this is volume. Share-card system ships here because PII/abuse surface requires engineering rigor that shouldn't land late.
**Delivers:** Village (6 Request encounters + NPC dialogue), Workshop (6 Contract encounters + JSON-shape grading), Tide Pools (6 Tool encounters + tool inventory), Library biome (4 capstone meta-encounters). Share cards live via `next/og` at `/og/card/[entryId]/route.tsx`. JSON + PNG Library exports. Second alpha (20–50 testers) at midpoint.
**Uses:** `next/og` (bundled with Next 16 — NO `@vercel/og` install); Supabase storage for cached PNG; Haiku pre-flight moderation pass on prompts before share-card generation.
**Implements:** Share-card opaque-UUID signed URLs (not `?prompt=` query params); PII scan pre-card-gen; per-user share rate-limit; account deletion + data export endpoints (POPIA); minors guard at sign-up.
**Addresses pitfalls:** 6 (share-card PII + spam defense), 10 (JSON + PNG export snapshot discipline extends MD discipline), 12 (right-to-deletion endpoint, minors flow).
**Scope-flex gate (design doc §12):** If behind at Phase 4 midpoint (week ~13 equivalent), **drop Tide Pools** to v1.1. Meadow + Village + Workshop + Library-capstone is a shippable arc. Never cut Library export, grading reliability, or the first-encounter-magic requirement.

### Phase 5: Launch Hardening — making it feel like a product
**Rationale:** Onboarding redo (not tweak), real-device iOS Safari pass, accessibility audit, cost-budget kill-switch, public beta. The design doc already earmarks this as 4 weeks.
**Delivers:** 60fps on iPhone SE 2020 verified on real devices; bundle <2MB initial; Lighthouse a11y ≥90; VoiceOver playthrough completes; `/account/delete` cascade + privacy policy live; weekly real-device test on the calendar; public launch.
**Uses:** `@next/bundle-analyzer`; Playwright E2E smoke tests (auth + first encounter + library export); weekly-cron GitHub Action running eval against `claude-haiku-4-5-latest`.
**Implements:** First-5-minutes redo based on alpha-1 session recordings; iOS Safari tap-to-begin audio gate + visibility API; global daily budget kill-switch (Sentry alert at 50%); POPIA audit (consent fires → PostHog loads, deletion works, minors flow, information-officer registered); deliverability pass (own SMTP for magic links).
**Addresses pitfalls:** 3 (onboarding redo from session recordings), 7 (real-device iOS Safari pass), 9 (cost budget kill-switch + per-IP limit final tuning), 11 (Lighthouse + VoiceOver audit), 12 (full POPIA audit).
**Exit gate:** All launch gates green. Public beta live.

### Phase ordering rationale

- **Why 5 phases, not 3 or 7:** `granularity=coarse` in planning config + design doc §12 already structures as 5 monthly phases. Compression to 3 would hide the Phase 2 critical-path risk; expansion to 7 would fragment the content work in Phase 4 unnecessarily.
- **Why Phase 2 is the walking skeleton, not Phase 3 or 4:** The grading gateway is novel integration work. Proving it on one encounter before authoring 26+ more is the highest-leverage risk reduction in the build. ARCHITECTURE.md phrases this as "build and prove this in Phase 2 before touching content."
- **Why Library MD export ships in Phase 3, not Phase 4:** Core Value. Every week the builder doesn't dogfood the export is a week the load-bearing promise could silently drift. Ship MD in Phase 3; JSON + PNG can land in Phase 4 with the share-card system.
- **Why Tide Pools is the cut lever (not another biome):** Design doc §12 names it explicitly. Narratively, it's the middle-of-the-arc biome; removing it preserves the Meadow→Village→Workshop progression curve and the Library capstone. Removing any other biome breaks either onboarding, a mechanic, or the endgame.

### Research flags

**Phases likely needing deeper research during planning (`/gsd-research-phase` candidates):**

- **Phase 2:** Anthropic SDK streaming semantics on Vercel Fluid Compute Node runtime under real load; `@logic-md/core` API surface (studio-internal, expect churn); Haiku 4.5 structured-output edge cases for per-assertion grading JSON. *Highest-leverage research phase — this is where architectural unknowns live.*
- **Phase 4:** PII-detection library choice (lightweight name/address/phone pattern match vs Haiku safety classifier cost profile); `next/og` + Satori JSX/CSS rendering quirks at 1200×630 with custom fonts + sprite composition; Supabase Storage signed-URL patterns for share-card caching.
- **Phase 5:** Real-device iOS Safari audio context + visibility API patterns specific to Phaser 3.90; Lighthouse accessibility audit automation in CI; Vercel log drain configuration for POPIA IP pseudonymization.

**Phases with well-documented patterns (skip research-phase):**

- **Phase 1:** Stack alignment follows the official `phaserjs/template-nextjs` pattern + Supabase App Router docs + Zustand's official Next.js guide. No novel integration work.
- **Phase 3:** Meadow content scale-up uses patterns already proven in Phase 2. The admin authoring tool is straightforward Next.js admin page work.

### Scope anchors for the roadmapper

**Must-not-cut (project-failure-level):**
- **Library export (MD + JSON + PNG)** — PROJECT.md Core Value: "if the Library export doesn't work, the project has failed"
- **Walking-skeleton encounter in Phase 2** — single most important deliverable per ARCHITECTURE.md
- **≥95% human/Haiku grading agreement per encounter before release** — ship gate per design doc §13 and PROJECT.md §Active

**Scope-flex lever (the cut, if schedule slips):**
- **Tide Pools biome → v1.1** — designated by design doc §12 slippage budget; remove biome entry from world map entirely if cut (don't ship a "coming soon" placeholder)

**Stack amendment already recorded (roadmapper should not re-surface):**
- **Next.js 14 → 16.2.x** — Next 14 hit EOL 2025-10-26. Amendment is in PROJECT.md constraints line 74, STACK.md §"Critical deviations from design doc §8", and design doc footer. Treat as locked.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against official docs (Next.js, Phaser, Anthropic, Supabase, Vercel, Upstash). Version-compat matrix in STACK.md cross-checked. One LOW-confidence item: `@logic-md/core` API stability (studio-internal; budgeted per design doc §13). |
| Features | HIGH on locked scope; MEDIUM on additions | 17 Active requirements from PROJECT.md are fidelity-verified. ~13 research-surfaced table stakes (accessibility, mobile-web resilience, POPIA UI surface) are extrapolated from genre conventions and 2025 web-accessibility baselines — confidence MEDIUM. Recommend the roadmapper fold them in rather than debate them. |
| Architecture | HIGH | Follows official `phaserjs/template-nextjs` + Supabase App Router + Zustand Next.js guides. Only novel boundary is LOGIC.md compiler placement, which ARCHITECTURE.md treats as a pure function (low risk). |
| Pitfalls | HIGH on ecosystem-documented failures; MEDIUM on project-specific extrapolations | Four BLOCKERs grounded in Anthropic docs, Supabase docs, Phaser GitHub issues, PROJECT.md Core Value. "First-5-minutes failure" (Pitfall 3) is MEDIUM — extrapolated from FTUE research, not a direct postmortem. "LOGIC.md authoring volume math" (Pitfall 8) is arithmetic on design doc targets — actual velocity unknown until Phase 3 data arrives. |

**Overall confidence:** HIGH. The design doc + stack + architecture + pitfalls triangulate cleanly. Remaining uncertainty is in content authoring velocity (Phase 3 data point) and `@logic-md/core` API churn (budgeted, not blocking).

### Gaps to address

- **LOGIC.md compiler API stability** — will almost certainly churn during Phase 2–3. Mitigation: treat `@logic-md/core` as workspace dependency; budget 10% of build time for feedback loop per design doc §13. Flag for `/gsd-research-phase` at start of Phase 2.
- **Content authoring velocity unknown until Phase 3** — If authoring a new Meadow encounter takes >4 hours after the admin tool lands, Phase 4 volume will crush the solo builder. Mitigation: measure explicitly in Phase 3 week 5; if >4h, invest one day in admin tool before entering Phase 4.
- **First-5-minutes metric unvalidated** — Pitfall 3 is the highest-stakes MEDIUM-confidence item. Mitigation: alpha-1 at end of Phase 3 measures first-encounter-completion-within-5-min as the north-star metric. If <70%, Phase 5 onboarding polish becomes a REDO, not a tweak.
- **Anthropic cost at scale** — ~0.3–1¢/attempt × unknown traffic. Mitigation: observability (`{encounterId, verdict, cached, tokens}` structured logs) from Phase 2; daily budget kill-switch in Phase 5.
- **iPhone SE 2020 + <2MB bundle headroom** — Phaser alone is ~1MB gzipped. Design-doc target of 2MB initial requires aggressive Turbopack tree-shaking + lazy-loaded biome atlases. Mitigation: `@next/bundle-analyzer` in Phase 5 perf pass; fallback to explicit Canvas renderer + atlas-pack-per-biome if iOS SE 60fps slips.

## Sources

### Primary (HIGH confidence — verified against official docs)
- Next.js 16 release notes + EOL schedule (nextjs.org, endoflife.date)
- Phaser 3.90 release announcement + official Next.js template (phaserjs/template-nextjs)
- Anthropic Claude Sonnet 4.6 + Haiku 4.5 announcements, model overview, prompt caching, structured outputs, model deprecation policy (platform.claude.com, anthropic.com)
- Supabase Auth (server-side Next.js, anonymous sign-ins, identity linking, SSR migration) (supabase.com/docs)
- Vercel Fluid Compute + Functions streaming docs
- Zustand Next.js setup guide (zustand.docs.pmnd.rs)
- Upstash ratelimit + redis SDKs
- `@sentry/nextjs` manual setup; PostHog Next.js App Router integration
- `docs/cluu-v1-design.md` (Draft 1, 2026-04-20, locked — amended for Next.js 16 / Phaser 3.90)
- `.planning/PROJECT.md` (Active requirements, Out of Scope reasoning, Constraints, Key Decisions)

### Secondary (MEDIUM confidence — community consensus, multiple sources agree)
- Phaser + Next.js integration tutorials (generalistprogrammer.com, 2025)
- Phaser GitHub issues #6829 (iOS audio), #3887 (pointerdown pause), #5456 (memory), #1355 (Safari CORS)
- LLM-as-judge research: Evidently AI guide, Eugene Yan evaluator essays, arXiv "LLMs Do Not Grade Essays Like Humans"
- POPIA cookie consent + WCAG 2.2 2025 baseline compliance
- Open Graph spoofing / share-card abuse patterns (ZeroFox, KnowBe4)
- Solo-dev burnout postmortems (Wayline, gamedeveloper.com Last Humble Bee postmortem)
- Cozy-game + FTUE research (HypeHype, Game Wisdom, HCPL Stardew genre analysis)

### Tertiary (LOW confidence — needs validation during build)
- `@logic-md/core` API — studio-internal; not independently verifiable; measure at Phase 2 start
- Phaser 3.90 bundle size under Turbopack tree-shaking — measure in Phase 1 week 1
- Content authoring velocity (4h per encounter target) — measure at Phase 3 week 5
- First-encounter-completion-within-5-min ≥70% target — measure at alpha-1 (end of Phase 3)

Detailed research files with full source lists:
- `.planning/research/STACK.md` — pinned versions, install block, integration gotchas
- `.planning/research/FEATURES.md` — table stakes / differentiators / anti-features, dependency graph
- `.planning/research/ARCHITECTURE.md` — component boundaries, data flow, 5-phase coarse build order with exit gates
- `.planning/research/PITFALLS.md` — 13 pitfalls with severity + phase mapping, technical debt patterns, "looks done but isn't" checklist

---
*Research completed: 2026-04-20*
*Ready for roadmap: yes*
