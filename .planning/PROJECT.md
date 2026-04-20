# Cluu

## What This Is

A cozy browser game that teaches prompting and Claude fluency through gameplay. The player walks their Cluu companion around a small island, solves described-into-existence encounters, and saves winning prompts to a real Library they keep forever. Built for curious students aged 15–22 by Single Source Studios as a solo project, and designed to dogfood LOGIC.md in a consumer product.

## Core Value

**The Library is the tether between game and real life.** Every great prompt a player writes in an encounter becomes a real, exportable tool they can use in Cursor, Claude Code, and Cowork. Without the Library, Cluu is a toy. With the Library, Cluu is a tool. If everything else ships and the Library export doesn't work, the project has failed.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. Derived from docs/cluu-v1-design.md. -->

- [ ] Player can open Cluu in a browser, be greeted by Cluu, and walk around an island with touch or keyboard
- [ ] Cluu visually follows a player-controlled anchor (pet-following, not direct avatar control) and shows four passive moods (Stoked/Content/Sleepy/Blue) plus two in-encounter states (Curious/Sparkling)
- [ ] Player progresses through 5 biomes gated in order: Starter Meadow → Neighbour Village → Sorting Workshop → Tide Pools → Library
- [ ] Each biome delivers 5–8 encounters (27–37 encounters total in v1) using one of the five mechanics: Describe, Request, Contract, Tool, or Library (meta)
- [ ] Every encounter is authored as a `.logic.md` file with a YAML front-matter contract consumed by the LOGIC.md grading engine
- [ ] Each encounter attempt runs two LLM calls — Claude Sonnet 4.6 generation + Claude Haiku 4.5 grading — returning a fail / pass / flair verdict with per-assertion breakdown
- [ ] Flair-rated attempts offer to save the prompt to the player's persistent Library with encounter id, reward, date, and auto-derived tags
- [ ] Library exports to three formats: Markdown (Obsidian-ready), JSON (scriptable), and 1200×630 PNG share card (via `@vercel/og`)
- [ ] Player authenticates via Supabase magic-link email; anonymous play is allowed and localStorage state migrates into the account on signup
- [ ] Player state (mood, cosmetics, island progress, unlocked biomes, library entries) persists in Supabase Postgres
- [ ] Cluu wears up to 4 cosmetic slots (head, body pattern, back accessory, eye style); ~15 free cosmetics ship in v1, awarded by encounter completion
- [ ] Runtime grading is rate-limited per user via Upstash Redis (20 encounter attempts/day free) and caches identical prompt hashes
- [ ] Player input is sanitized (max 500 chars, XML-like tags stripped) and the grader system prompt ignores meta-instructions from user input
- [ ] Game runs at 60fps on iPhone SE 2020 and smoothly on 5-year-old Android; initial bundle <2MB
- [ ] Project ships on Vercel at `cluu.game` (or `cluu.singlesource.co.za`) with PostHog analytics and Sentry error tracking
- [ ] Every new encounter passes ≥95% human/Haiku grading agreement against a 50-prompt test suite before release
- [ ] First 5 minutes of play feel magical: onboarding delivers first encounter completion without instructions

### Out of Scope

<!-- Explicit boundaries. Reasoning included to prevent re-adding. Sourced from design doc §14. -->

- Multiplayer or social-island features — v2 territory; v1 is a single-player cozy experience
- Paid cosmetic purchases — deferred to v1.1 once payment plumbing is designed properly
- Native iOS/Android apps — deferred to v1.2 via Capacitor wrap post-validation; browser-first is the distribution bet
- Community encounter authoring — v1.3; let the engine prove out on author-curated content first
- Voice input — v2; touch + keyboard covers v1 audience
- Localisation beyond English — v1.1 if demand materialises
- Steam version — v2 if browser wins
- Player-generated island themes — v2
- Leaderboards, streaks, social-proof metrics — **deliberately excluded forever**; the mood system is relational, not punitive
- OAuth login — magic-link email only in v1; every auth option is surface area
- Unity or Godot — overkill for 2D cozy and complicates browser-native distribution
- Pure HTML/Canvas without Phaser — Phaser solves animation, physics, and scene management we'd otherwise reinvent
- Firebase — Supabase is better for POPIA, better Postgres, and already familiar
- Notifications to the player from Cluu — absence is absence; return is return

## Context

- **Design doc** (locked spec): `docs/cluu-v1-design.md` (Draft 1, 2026-04-20). Supersedes all prior conversation fragments. If anything conflicts, the doc wins.
- **Studio**: Single Source Studios; solo build by Rainier Potgieter.
- **Strategic role**: Cluu is the flagship public demonstration of LOGIC.md in a consumer product. Screenshots and gameplay clips become marketing for both Cluu and LOGIC.md. Friction discovered while authoring `.logic.md` encounters feeds back as feature requests to the LOGIC.md tool — budget ~10% of build time for that loop.
- **Audience**: Curious students, 15–22. Aspiring builders (22–35) are a natural sequel, not v1 scope.
- **Session shape**: 12–25 minute sessions, 1–3 encounters per session. Designed for a bus ride, study break, or 20 minutes before bed.
- **Content volume**: 27–37 encounters across 5 biomes; full playthrough = 2–4 hours of content with replay of capstones.
- **Unit economics**: ~0.3–1 cent per encounter attempt; ~30–60 cents per full playthrough at current Anthropic pricing. Viable on free tier with rate limits; sustained by v1.1 cosmetic DLC.
- **Jurisdiction**: South African studio — POPIA compliance informs analytics (PostHog over Firebase/Google Analytics) and raw-prompt logging (opt-in only).
- **Solo motivational risk**: month-3 valley is a known hazard on 6-month solo builds. Mitigation anchors: weekly public build log, alpha tester group by week 8, early player responses.

## Constraints

- **Tech stack**: Next.js 14 App Router + Phaser.js 3.80+ (Canvas renderer) + Supabase (Auth + Postgres) + Vercel — locked per design doc §8. Deviations require explicit revision of the doc.
- **LLM providers**: Claude Sonnet 4.6 for generation, Claude Haiku 4.5 for grading, via Anthropic API. No alternative providers in v1.
- **Platform**: Browser-first (desktop + mobile web). Touch and keyboard input from day one. Native wrappers deferred to v1.2.
- **Input sanitization**: Max 500 chars on player prompts, XML-like tag stripping, grader system prompt must explicitly ignore meta-instructions from user input.
- **Rate limiting**: Per-user daily cap (20 encounter attempts) via Upstash Redis; identical-prompt cache required before hitting the model.
- **Performance**: 60fps on iPhone SE 2020; initial bundle <2MB.
- **Timeline**: 4–6 month target, 7–9 month realistic ceiling. If behind at month 3, drop Tide Pools (save for v1.1). Never cut the Library export.
- **Team**: Solo. Every line owned. No parallel human contributors in v1.
- **Privacy**: POPIA-compatible analytics; never log raw player prompts to analytics without explicit opt-in.
- **Grading reliability**: Each encounter must achieve ≥95% human/Haiku grading agreement over a 50-prompt test suite before it ships.
- **Business model**: Free core game in v1. No paid cosmetics until v1.1. A "founders' pack" ($5, unlimited attempts + 3 exclusive hats) is under consideration but not committed.
- **Monetisation guardrails**: No leaderboards, streaks, push notifications, or social-proof metrics — ever. The mood system is relational, not a retention lever.

## Key Decisions

<!-- Decisions that constrain future work. Pulled from design doc §1 locked constraints and §8 rejected options. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Browser-first via Next.js 14 + Phaser + Vercel | Known territory for the solo builder, Vercel-native SSR for landing/share cards, Phaser is mature for 2D cozy | — Pending |
| Every encounter is a `.logic.md` file (not hardcoded) | Content authorability (author 5 encounters in an evening), dogfoods LOGIC.md flagship, enables community authoring in v1.3 | — Pending |
| Two-call grading architecture (Sonnet generate + Haiku grade) | Narrative quality from Sonnet, cheap reliable structured grading from Haiku, cost stays viable | — Pending |
| Supabase over Firebase | Better POPIA story, Postgres we can query, already familiar to builder | — Pending |
| Magic-link email only auth (no passwords, no OAuth) | Every auth option is surface area; magic link ships faster and covers 99% of audience | — Pending |
| Phaser Canvas renderer (not WebGL) | Simpler debugging, fine for 2D sprite art at this scale | — Pending |
| Cluu is a companion, not an avatar | Player moves an invisible anchor that Cluu follows — preserves "with Cluu, not as Cluu" relationship | — Pending |
| Mood decays with absence but never affects progression | Progression, cosmetics, Library are permanent; mood is purely relational | — Pending |
| No notifications, ever | Absence is absence; return is return. Hard product boundary. | — Pending |
| Solo build, every line owned | Builder clarity and LOGIC.md-as-flagship narrative integrity | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions (and mark outcome ✓ Good / ⚠️ Revisit on prior decisions if evidence arrived)
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state (players, feedback, metrics)

---
*Last updated: 2026-04-20 after initialization*
