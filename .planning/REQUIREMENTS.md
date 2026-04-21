# Requirements: Cluu

**Defined:** 2026-04-20
**Core Value:** The Library export is the tether between game and real life — every great prompt a player writes becomes a real tool they can use in Cursor, Claude Code, Cowork.

## v1 Requirements

Requirements for initial release. Each maps to exactly one roadmap phase. REQ-IDs follow `[CATEGORY]-[NUMBER]`.

### Auth

- [x] **AUTH-01**: User can play anonymously without signing in (state persisted to localStorage)
- [x] **AUTH-02**: User can sign in via Supabase magic-link email
- [x] **AUTH-03**: Anonymous player's state (encounters, library entries, cosmetics) migrates into their account on signup without data loss
- [x] **AUTH-04**: User session persists across browser refresh via Supabase SSR cookies
- [ ] **AUTH-05**: User can sign out from any screen
- [ ] **AUTH-06**: User can request deletion of their account and all associated data (POPIA right-to-deletion)

### World

- [x] **WORLD-01**: Player loads `cluu.game` and sees their island within 3 seconds on broadband
- [x] **WORLD-02**: Player moves an invisible anchor via touch (tap-to-move) on mobile
- [x] **WORLD-03**: Player moves the anchor via keyboard (WASD + arrow keys) on desktop
- [x] **WORLD-04**: Camera follows the anchor smoothly across tile-based scenes
- [ ] **WORLD-05**: Starter Meadow biome is unlocked immediately; Village, Workshop, Tide Pools, and Library unlock in order after prior biome's arc completes
- [ ] **WORLD-06**: Player can pause the game and resume without losing progress
- [ ] **WORLD-07**: Visible encounter markers indicate interactable objects (withered plant, broken chime, waiting NPC, workbench, tide pool)

### Cluu

- [x] **CLUU-01**: Cluu follows the player anchor like a pet (never directly controlled)
- [ ] **CLUU-02**: Cluu renders with four passive moods — Stoked, Content, Sleepy, Blue
- [ ] **CLUU-03**: Cluu renders with two in-encounter states — Curious (on fail), Sparkling (on flair)
- [ ] **CLUU-04**: Cluu mood decays passively with absence (Stoked → Content next day → Sleepy at 3 days → Blue at 7 days)
- [ ] **CLUU-05**: Cluu mood recovers at least one step on every return visit
- [ ] **CLUU-06**: Cluu's mood never affects progression, unlocks, or saved content
- [ ] **CLUU-07**: Cluu renders equipped cosmetics in four slots — head, body pattern, back accessory, eye style
- [ ] **CLUU-08**: Player can change Cluu's equipped cosmetics via a Wardrobe UI

### Encounter

- [ ] **ENC-01**: Every encounter is authored as a `.logic.md` file with YAML front-matter (id, biome, mechanic, difficulty, reward, grading config)
- [ ] **ENC-02**: LOGIC.md compiler (`@logic-md/core`) parses `.logic.md` into a generation prompt + grading assertions + reward messaging
- [ ] **ENC-03**: Player taps/clicks an encounter object to open a description pane with a prompt textarea
- [ ] **ENC-04**: Player's prompt is sanitized server-side (max 500 chars, XML-like tags stripped) before any LLM call
- [ ] **ENC-05**: Generation call runs Claude Sonnet 4.6 at moderate temperature and produces in-world flavour text
- [ ] **ENC-06**: Grading call runs Claude Haiku 4.5 at low temperature with structured outputs and returns per-assertion pass/fail + overall verdict (fail / pass / flair)
- [ ] **ENC-07**: Encounter resolves with visual reward on pass/flair and "try again" messaging on fail; Cluu state updates accordingly
- [ ] **ENC-08**: Flair verdicts trigger a Save-to-Library offer
- [ ] **ENC-09**: Player can dispute a grading verdict via a lightweight in-game flag; dispute is logged for author review
- [ ] **ENC-10**: Every shipped encounter passes ≥95% human/Haiku grading agreement on a 50-prompt test suite (ship gate)

### Content

- [ ] **CONT-01**: Starter Meadow ships with 5–7 Describe encounters
- [ ] **CONT-02**: Neighbour Village ships with 6–8 Request encounters
- [ ] **CONT-03**: Sorting Workshop ships with 6–8 Contract encounters
- [ ] **CONT-04**: Tide Pools ships with 6–8 Tool encounters *(scope-flex — first cut if schedule slips; defer to v1.1)*
- [ ] **CONT-05**: Library biome ships with 4–6 capstone meta-encounters
- [ ] **CONT-06**: Each encounter's visual reward and sprite assets exist before it is added to a biome

### Library

- [ ] **LIB-01**: Flair-rated prompts save to a per-user persistent Library on player confirm
- [ ] **LIB-02**: Each Library entry stores prompt text, generated response, encounter id, verdict, date, and auto-derived tags
- [ ] **LIB-03**: Player views their Library in-game as a book Cluu carries AND on a web `/library` route
- [ ] **LIB-04**: Library exports to a single Markdown file, grouped by biome / mechanic, Obsidian-ready
- [ ] **LIB-05**: Library exports to JSON (one array of entry objects) for scripting
- [ ] **LIB-06**: Library exports a 1200×630 PNG share card per entry (via `next/og`) containing Cluu, prompt, island name, tags, and watermark
- [ ] **LIB-07**: PNG share cards render safely — prompts are length-capped and profanity-filtered before baking into the image

### Cosmetics

- [ ] **COS-01**: ≥15 free cosmetics ship in v1, spread across all four slots
- [ ] **COS-02**: Cosmetic unlocks are granted as rewards on specific encounter completions
- [ ] **COS-03**: Cosmetic ownership is permanent — once earned, it never regresses

### Engine

- [ ] **ENG-01**: Grading Gateway is a single server route; all Anthropic calls flow through it
- [ ] **ENG-02**: Per-user rate limit of 20 encounter attempts per day enforced via Upstash Redis
- [ ] **ENG-03**: Identical `sha256(encounterId + normalizedPrompt)` attempts hit a 7-day cache rather than re-grading
- [ ] **ENG-04**: Grader system prompt explicitly ignores meta-instructions inside user input (prompt-injection hardening)
- [ ] **ENG-05**: Cost per encounter attempt is logged with `{encounterId, verdict, tokensUsed, cached}` tags
- [ ] **ENG-06**: A budget kill-switch halts Anthropic calls when daily spend exceeds a configured ceiling

### Persist

- [ ] **PERS-01**: Player state (mood, unlocked biomes, progress, cosmetics, library) persists in Supabase Postgres
- [x] **PERS-02**: Every Supabase table uses Row-Level Security keyed to `auth.uid()`
- [ ] **PERS-03**: Client writes are debounced (~5s) and retry on transient failure; anchor position never syncs
- [ ] **PERS-04**: Cosmetic and Library grants are idempotent — double-save returns no-op

### Ops

- [ ] **OPS-01**: PostHog tracks UX events (encounter_triggered, library_exported, share_card_shared) with no raw prompts unless user opts in
- [ ] **OPS-02**: Sentry captures client + server errors with biome + encounterId tags
- [ ] **OPS-03**: User can toggle raw-prompt logging opt-in from Settings (POPIA default: OFF)
- [ ] **OPS-04**: Magic-link authentication works on iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari

### Performance

- [ ] **PERF-01**: Game sustains 60fps on iPhone SE 2020 in the Meadow biome during an encounter
- [ ] **PERF-02**: Game runs smoothly on a 5-year-old Android device
- [ ] **PERF-03**: Initial bundle is <2MB (Phaser lazy-loaded off the landing page)
- [ ] **PERF-04**: First-contentful-paint on landing is <1.5s on 4G

### Onboarding

- [ ] **ONB-01**: First-time player reaches and completes their first encounter within 5 minutes without reading any instructions
- [ ] **ONB-02**: Onboarding success rate ≥70% measured via PostHog funnel (first-session first-encounter completion)

### A11y

- [ ] **A11Y-01**: Respect `prefers-reduced-motion` — disable nonessential tweens, replace animated sprites with static poses
- [ ] **A11Y-02**: Provide colour-blind-safe signal pairings for mood states (shape + colour, not colour alone)
- [ ] **A11Y-03**: Keyboard-only navigation works for all UI overlays (Encounter Panel, Library, Wardrobe, Settings)
- [ ] **A11Y-04**: Game respects audio on/off preference; SFX have visual equivalents for key events (pass/fail)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Social

- **SOC-01**: Multiplayer or co-op island visits
- **SOC-02**: Player-to-player prompt sharing within the game

### Payments (v1.1)

- **PAY-01**: Paid cosmetic packs with Stripe/Paddle checkout
- **PAY-02**: "Founders' pack" ($5 unlimited attempts + exclusive hats)
- **PAY-03**: Receipt and tax-invoice flow for POPIA/SARS

### Native (v1.2)

- **NAT-01**: Capacitor wrap for iOS
- **NAT-02**: Capacitor wrap for Android
- **NAT-03**: App Store and Play Store listings with compliant privacy policy

### Community Authoring (v1.3)

- **COMM-01**: Player-authored `.logic.md` encounters
- **COMM-02**: Shareable custom island links
- **COMM-03**: Moderation and reporting for community content

### Localisation (v1.1)

- **LOC-01**: Second language after demand signal
- **LOC-02**: Right-to-left layout support (if Arabic/Hebrew targeted)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Leaderboards, streaks, social-proof metrics | Deliberately excluded forever — mood system is relational, not punitive (design doc §14) |
| Push notifications from Cluu | Absence is absence; return is return (design doc §7) |
| OAuth login (Google, GitHub, Apple) | Every auth option is surface area; magic link covers 99% of audience (design doc §8) |
| Voice input | Touch + keyboard sufficient for v1 audience (design doc §14) |
| Steam version | Browser-first is the distribution bet (design doc §14) |
| Player-generated island themes | v2 — needs authoring tooling + moderation first (design doc §14) |
| Unity or Godot | Overkill for 2D cozy; complicates browser-native distribution (design doc §8) |
| Pure HTML/Canvas without Phaser | Phaser solves animation, physics, scene management (design doc §8) |
| Firebase | Supabase is better POPIA story + Postgres + already familiar (design doc §8) |
| WebGL renderer (vs Canvas) | Simpler debugging; fine for 2D sprite art at this scale (design doc §8) |
| Real-time chat between players | High complexity, not core to Cluu's value |
| Video content | Storage/bandwidth cost |

## Traceability

All 71 v1 requirements mapped to exactly one phase. Populated by roadmapper 2026-04-20.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Pending |
| AUTH-06 | Phase 4 | Pending |
| WORLD-01 | Phase 1 | Complete |
| WORLD-02 | Phase 1 | Complete |
| WORLD-03 | Phase 1 | Complete |
| WORLD-04 | Phase 1 | Complete |
| WORLD-05 | Phase 4 | Pending |
| WORLD-06 | Phase 3 | Pending |
| WORLD-07 | Phase 3 | Pending |
| CLUU-01 | Phase 1 | Complete |
| CLUU-02 | Phase 3 | Pending |
| CLUU-03 | Phase 3 | Pending |
| CLUU-04 | Phase 3 | Pending |
| CLUU-05 | Phase 3 | Pending |
| CLUU-06 | Phase 3 | Pending |
| CLUU-07 | Phase 3 | Pending |
| CLUU-08 | Phase 3 | Pending |
| ENC-01 | Phase 2 | Pending |
| ENC-02 | Phase 2 | Pending |
| ENC-03 | Phase 2 | Pending |
| ENC-04 | Phase 2 | Pending |
| ENC-05 | Phase 2 | Pending |
| ENC-06 | Phase 2 | Pending |
| ENC-07 | Phase 2 | Pending |
| ENC-08 | Phase 2 | Pending |
| ENC-09 | Phase 2 | Pending |
| ENC-10 | Phase 2 | Pending |
| CONT-01 | Phase 3 | Pending |
| CONT-02 | Phase 4 | Pending |
| CONT-03 | Phase 4 | Pending |
| CONT-04 | Phase 4 | Pending (scope-flex) |
| CONT-05 | Phase 4 | Pending |
| CONT-06 | Phase 3 | Pending |
| LIB-01 | Phase 3 | Pending |
| LIB-02 | Phase 3 | Pending |
| LIB-03 | Phase 3 | Pending |
| LIB-04 | Phase 3 | Pending |
| LIB-05 | Phase 4 | Pending |
| LIB-06 | Phase 4 | Pending |
| LIB-07 | Phase 4 | Pending |
| COS-01 | Phase 3 | Pending |
| COS-02 | Phase 3 | Pending |
| COS-03 | Phase 3 | Pending |
| ENG-01 | Phase 2 | Pending |
| ENG-02 | Phase 2 | Pending |
| ENG-03 | Phase 2 | Pending |
| ENG-04 | Phase 2 | Pending |
| ENG-05 | Phase 2 | Pending |
| ENG-06 | Phase 5 | Pending |
| PERS-01 | Phase 3 | Pending |
| PERS-02 | Phase 1 | Complete |
| PERS-03 | Phase 3 | Pending |
| PERS-04 | Phase 3 | Pending |
| OPS-01 | Phase 3 | Pending |
| OPS-02 | Phase 2 | Pending |
| OPS-03 | Phase 4 | Pending |
| OPS-04 | Phase 1 | Pending |
| PERF-01 | Phase 5 | Pending |
| PERF-02 | Phase 5 | Pending |
| PERF-03 | Phase 5 | Pending |
| PERF-04 | Phase 5 | Pending |
| ONB-01 | Phase 5 | Pending |
| ONB-02 | Phase 5 | Pending |
| A11Y-01 | Phase 3 | Pending |
| A11Y-02 | Phase 3 | Pending |
| A11Y-03 | Phase 3 | Pending |
| A11Y-04 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 71 total *(prior header of "59" was incorrect — enumerated count is 71)*
- Mapped to phases: 71 ✓
- Unmapped: 0 ✓

**Per-phase counts:**
- Phase 1 (Scaffold): 12 requirements
- Phase 2 (Walking Skeleton): 16 requirements
- Phase 3 (Meadow + Persistence + Library MD): 26 requirements
- Phase 4 (Remaining Biomes + Share Cards): 10 requirements
- Phase 5 (Launch Hardening): 7 requirements

---
*Requirements defined: 2026-04-20*
*Last updated: 2026-04-20 — traceability populated by roadmapper, all 71 v1 requirements mapped to exactly one phase*
