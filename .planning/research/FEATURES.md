# Feature Research — Cluu

**Domain:** Cozy browser game × educational tool × prompt-library productivity artefact
**Researched:** 2026-04-20
**Confidence:** HIGH for locked-design fidelity; MEDIUM for table-stakes gaps (accessibility, mobile-web resilience) surfaced from genre research

---

## Orientation

Cluu is a deliberately hybrid product. Mapping its features requires three genre lenses:

| Lens | Inherits | Breaks |
|------|----------|--------|
| **Cozy game** (Stardew Valley, Animal Crossing, A Short Hike) | No timers, self-paced, no fail-state, persistent progression, daily-drop-in session shape | No real-time calendar, no notifications (cozy games usually nudge; Cluu never does), mood decays but never punishes |
| **Educational tool** (Duolingo, Scratch, puzzle-pedagogy games) | Hidden curriculum, immediate feedback, difficulty ramp, graded attempts | No streaks, no leaderboards, no XP bars visible outside an encounter, no "lessons" or "levels" terminology |
| **Virtual pet / companion** (Tamagotchi, Neko Atsume, Pokémon-Amie) | Mood system, wearable cosmetics, relationship bond, absence awareness | Companion never messages player, mood decay has zero gameplay consequence, companion is not an avatar |

The design's integrity depends on honoring all three *while* breaking specific conventions. The anti-features section is where this matters most.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or incomplete.

#### Core gameplay expected of any browser game

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Save state persists across sessions | Every cozy game, every browser game since 2010 | M | Design doc §8 specifies Supabase Postgres + localStorage for anonymous play — covered |
| Autosave (never "lose progress" warnings) | Cozy genre convention; users won't remember to save | S | Design doc implies via continuous Supabase write on state change — **not explicitly stated; add to requirements** |
| Session resumes where player left off | Return-to-game flow assumption | S | Depends on save state; partially covered |
| Pause / exit mid-encounter without losing prompt | Mobile interruption is constant (phone call, notification) | M | **NOT in design doc — recommend adding to v1** (see Missed Table Stakes §A) |
| Keyboard controls documented somewhere | WASD is standard but some users use arrow keys | S | Design doc §1 specifies "tap-to-move and WASD both supported" — document arrow-key fallback |
| Touch controls feel responsive on mobile | Mobile-web users bounce fast if laggy | M | Phaser handles unified input; virtual joystick design choice needed |
| Audio on/off toggle | Users play with sound off in public (bus, study break) | S | Design doc §12 week 6 mentions ambient audio and SFX; **mute toggle not explicitly specified — add** |
| Volume control (music vs SFX separated) | Genre convention; expected in cozy games | S | Often split as: music / ambient / UI / voice — v1 can ship with single master volume |
| Loading indicator during grading (2-call LLM latency is ~4–8s) | Users assume app is broken if nothing happens for >2s | S | Critical — Cluu's two-call architecture means noticeable wait; must animate during |
| Visible progress toward next encounter / biome | Player needs to know "am I getting somewhere?" | S | Design doc §9 has `island_progress` jsonb — rendering it is implied but not spec'd |
| Error recovery when API fails mid-encounter | Anthropic API can rate-limit, time out, or 500 | M | **NOT explicitly in design doc — recommend adding** (retry with friendly messaging, preserve prompt text) |
| Graceful offline/disconnect handling | Mobile web connections drop constantly | M | **NOT explicitly in design doc — recommend adding** (detect, inform, preserve state) |
| Settings menu exists and is discoverable | Universal expectation | S | Not mentioned in design doc — implicit |

#### Educational / LLM-interaction expected patterns

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Streaming response rendering during generation | Claude-user-facing apps all stream; non-streaming feels broken post-ChatGPT | M | Design doc §2 step 5 says "response streams in-world" — covered |
| Prompt character count visible | 500-char limit needs a visible counter | S | Design doc §constraints specifies 500 chars; counter implicit |
| Retry an encounter with a new prompt | Players expect iteration on LLM apps | S | Design doc implies via "2 attempts each" in §6.2 cost maths |
| Undo / edit prompt before submitting | Standard text-input affordance | S | Implicit in any text input |
| See previous attempt's result when retrying | Learning requires comparing attempts | M | **NOT explicit in design doc — recommend adding** (show last grade inline while composing next attempt) |
| Clear feedback on why an attempt failed | Educational games must explain failure | M | Design doc §6.1 shows "Fail: The plant stirs, but doesn't quite wake. Try describing it more." — covered, but needs per-assertion breakdown visible per §requirements line 28 |

#### Auth / account expected patterns

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Play without signing up first (anonymous) | Onboarding friction kills browser games | M | Design doc §8 specifies anonymous play with localStorage migration — covered |
| Account-state migration on signup (don't lose anonymous progress) | Critical expectation for "try then commit" flow | M | Design doc §requirements line 31 — covered |
| Sign in from any device and see same state | Base cloud-save expectation | S | Covered via Supabase |
| Sign out | Universal expectation | S | Implicit in Supabase Auth |
| Delete account / export data | POPIA / GDPR expectation | M | **NOT in design doc — required by POPIA; add to v1** |

#### Browser-specific expected patterns

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Works on Safari iOS (not just Chrome) | iPhone users are 50%+ of mobile web | M | Implicit in "browser-first" but Safari has quirks (audio autoplay, WebGL, storage) — test early |
| Responsive layout adapts to portrait/landscape | Phone rotation is reflexive | M | Phaser handles scaling; game-specific layout work needed |
| Viewport fits screen without zoom on first load | Mobile meta-viewport basics | S | Standard Next.js setup |
| Back button doesn't nuke progress | Browser back is an exit expectation, not an undo | M | Need history routing strategy; **not specified in design doc** |
| Share card link previews correctly on social | OG tags, Twitter cards — design doc §11 implies via `@vercel/og` | S | Covered |

---

### Differentiators (What Makes Cluu Specifically Cluu)

Features that set the product apart. Aligned with PROJECT.md Core Value: *"The Library is the tether between game and real life."*

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Library export to Markdown / JSON / PNG** | THE product differentiator. "With the Library, Cluu is a tool." Prompts leave the game and enter the player's real Claude Code / Cursor workflow. | L | §10 spec is detailed; PNG via `@vercel/og`; MD format is Obsidian-ready. **If this ships broken, the project has failed** (PROJECT.md Core Value). |
| **Every encounter is a `.logic.md` file** | Dogfoods LOGIC.md flagship in a consumer product. Enables authoring velocity (5 encounters/evening) and v1.3 community content. | L | §6, §requirements line 27. Single biggest technical commitment in the design. |
| **Two-call grading architecture (Sonnet generate + Haiku grade)** | Narrative quality + cheap reliable structured grading + sustainable unit economics (~0.3–1 cent/attempt). | M | §6.2. Differentiates Cluu from "one-shot LLM toy" games. |
| **Flair / Pass / Fail three-tier grading** | Top 25th percentile rating motivates iteration without punishing adequacy. Only Flair is Library-eligible — gatekeeps library quality. | M | §6.1 example shows per-assertion grading. Key for player agency over their Library. |
| **Cluu-as-companion framing (invisible anchor, not avatar)** | Preserves "with Cluu, not as Cluu" relationship. Subtle but foundational — Cluu is someone, not something the player is. | M | §7. Pet-following physics over direct avatar control. **This is the relational foundation the anti-features defend.** |
| **Mood decays with absence, never affects progression** | Cozy genre breaks from virtual-pet genre: no guilt mechanics. Library/biomes/cosmetics are permanent. Mood is purely relational. | S | §7.2. Directly rejects Tamagotchi-style retention-through-guilt. |
| **No notifications, ever** | Hard product boundary. "Absence is absence; return is return." | N/A | Anti-feature. See §Anti-Features. |
| **Hidden curriculum (no lesson numbers, no concept names shown)** | Players learn prompt engineering without knowing they are. "Specificity" never appears; "a tall sunflower with a cracked stem" just works better than "a flower". | M | §3.1, §5. Curriculum arc is invisible by design. |
| **Share card system (1200×630 Flair moments)** | Organic acquisition vector. Player pride in a great prompt → shareable artifact → new players arrive. | M | §11. `@vercel/og` runtime PNG generation. |
| **Meta-capstones in Library biome** | Endgame challenge that certifies mastery via prompt *reuse* / *abstraction* (write a prompt for a plant you can't see). This is the payoff of the hidden curriculum. | M | §4.5, §5. Differentiates from "flat content" educational games. |
| **Input sanitization + meta-instruction-ignoring grader prompt** | Serious prompt-injection defense in a product where player prompts are the input — uncommon rigor for a cozy game. | M | §13 risks, §requirements line 34. Security posture as a feature. |
| **Rate limiting via Upstash Redis + prompt-hash cache** | Keeps unit economics viable; identical prompts don't re-grade. Enables free-tier viability. | M | §requirements line 33. Infrastructure feature that unlocks business model. |

---

### Anti-Features (Explicitly Excluded, Reasoning Preserved Verbatim)

Features that seem good but break the design's integrity. Reasoning quoted from design doc §14 and PROJECT.md Out of Scope verbatim where possible.

| Feature | Why Requested / Surface Appeal | Why Problematic (design doc's reasoning, verbatim or close) | Alternative |
|---------|-------------------------------|-------------------------------------------------------------|-------------|
| **Leaderboards, streaks, social-proof metrics** | Retention lift, competitive engagement, "industry standard" | "**Deliberately excluded forever**; the mood system is relational, not punitive" (PROJECT.md §Out of Scope). "No leaderboards, streaks, push notifications, or social-proof metrics — ever. The mood system is relational, not a retention lever." (PROJECT.md §Constraints) | Mood system + Library-as-personal-trophy-case. Progression is felt, not ranked. |
| **Notifications / push / "Cluu misses you"** | Industry-standard re-engagement, especially for pet/companion games | "No notifications to the player from Cluu — **absence is absence; return is return**" (PROJECT.md §Out of Scope). "Cluu does not message the player." (§7.2) | Mood-recovers-on-return (§7.2): a single visit bumps mood back up at least one step. The warmth is in the return, not the nag. |
| **Mood-as-punishment (progression gated on mood)** | Standard virtual-pet retention mechanic (Tamagotchi) | "Mood never affects progression. Unlocked biomes, saved Library prompts, cosmetic ownership are permanent." (§7.2) "Mood decays with absence but never affects progression" (PROJECT.md §Key Decisions) | Mood is purely relational. Decay is visible; consequence is zero. |
| **Multiplayer / social islands / visiting other players** | Cozy-genre expectation (Animal Crossing island visits) | "v2 territory; v1 is a single-player cozy experience" (PROJECT.md §Out of Scope) | Single-player integrity in v1. Share cards provide social surface without multiplayer complexity. |
| **OAuth login (Google / Apple / GitHub)** | Convenience; lower auth friction | "Every auth option is surface area; magic-link email only in v1; magic-link ships faster and covers 99% of audience" (PROJECT.md §Out of Scope, §Key Decisions) | Magic-link email only. Anonymous play first. |
| **Paid cosmetics in v1** | Revenue from day one | "Deferred to v1.1 once payment plumbing is designed properly" (PROJECT.md §Out of Scope) | 15 free cosmetics via encounter rewards in v1. |
| **Community encounter authoring** | Content velocity, UGC flywheel | "v1.3; let the engine prove out on author-curated content first" (PROJECT.md §Out of Scope) | Curator-authored 27–37 encounters in v1. Engine proves out before opening it up. |
| **Voice input** | Accessibility, modernity | "v2; touch + keyboard covers v1 audience" (PROJECT.md §Out of Scope) | Text input with 500-char limit. |
| **Localisation beyond English** | Reach | "v1.1 if demand materialises" (PROJECT.md §Out of Scope) | English-only v1. Wait for demand signal. |
| **Native iOS / Android app** | Store presence, performance | "Deferred to v1.2 via Capacitor wrap post-validation; browser-first is the distribution bet" (PROJECT.md §Out of Scope) | Browser-first. Capacitor wrap post-validation. |
| **Curriculum panels / lesson numbers / concept names shown** | Explicit teaching, "learners want to know what they're learning" | "The learning is hidden inside the mechanics. No curriculum panels, no lesson numbers, no lectures." (§design doc preamble) | Hidden curriculum. Concept emerges from mechanic. |
| **Timer / daily reset / time-pressured events** | Retention driver (FOMO) | Implied by genre contract; cozy games reject timers. "No timer in the corner of the screen" is the cozy-genre anti-pattern. | Self-paced. Session length emergent (12–25 min target), never imposed. |
| **Difficulty settings / easy mode / tutorials you can skip** | Accessibility concern, usually | Risks fracturing the grading contract. A single contract graded at 95%+ human-agreement only works if the bar is singular. | Grading contract is the difficulty. Encounter variety provides ramp (difficulty 1 → capstones). |
| **Raw prompt logging to analytics by default** | Product telemetry | "POPIA-relevant: never log raw prompts to analytics without explicit opt-in" (§13) | Opt-in only. Default: metadata only (grade, encounter id, duration). |
| **Firebase** | Common default | "Supabase is better for POPIA, better Postgres, and already familiar" (PROJECT.md §Out of Scope) | Supabase. |
| **Unity / Godot** | Richer 2D tooling | "Overkill for 2D cozy, also means no browser-native distribution without WebGL export complications" (§8 rejected) | Phaser.js. |
| **Pure HTML/Canvas without Phaser** | "Simpler" | "Reinventing animation, physics, scene management. Phaser exists for exactly this." (§8 rejected) | Phaser.js. |
| **Passwords** | "Users expect passwords" | Magic-link email only in v1 — passwords are surface area + support burden | Magic-link email only. |
| **Pure WebGL rendering** | Performance | "Phaser Canvas (not WebGL) — simpler debugging, fine for 2D sprite art at this scale" (PROJECT.md §Key Decisions) | Phaser Canvas renderer. |
| **Alternative LLM providers** | Cost / redundancy | "Claude Sonnet 4.6 for generation, Claude Haiku 4.5 for grading, via Anthropic API. No alternative providers in v1." (PROJECT.md §Constraints) | Anthropic only. Tied to LOGIC.md narrative integrity. |

**A note on anti-feature reasoning.** These aren't just exclusions — several are inversions of genre defaults. Cozy games usually have calendar-driven events; Cluu doesn't. Virtual-pet games usually guilt you into return; Cluu explicitly doesn't. Educational games usually show you "Lesson 3 / 12"; Cluu hides that. Each inversion is load-bearing for the product's identity.

---

### Missed Table Stakes (Recommend for v1 or Defer Consciously)

These are standard expectations that the locked design doesn't explicitly address. Each is flagged as **ADD TO v1** or **REASONABLE TO DEFER** with reasoning.

#### §A — Accessibility

| Feature | Verdict | Reasoning |
|---------|---------|-----------|
| **Reduced-motion mode** (toggle that suppresses Cluu animations, screen tweens, sparkle effects) | **ADD TO v1** | Modern web-accessibility expectation; `prefers-reduced-motion` CSS media query is one line. Cluu's sparkle/tween states (§7.1) will trigger motion sensitivity without this. Non-negotiable given the 15–22 audience includes vestibular-sensitive players. Low implementation cost, high inclusion value. |
| **Colour-blind considerations** (don't rely on colour alone for mood or pass/fail signals) | **ADD TO v1** | The four moods (Stoked/Content/Sleepy/Blue) risk colour-coding. Pass/Flair/Fail will instinctively reach for green/gold/red. Mitigation: pair every colour signal with shape, iconography, or text. Low cost if designed in from week 1; expensive to retrofit. |
| **Captions / on-screen text for audio cues** | **ADD TO v1** | Design doc §12 week 6 plans ambient audio + SFX for pass/fail. Players with hearing impairment, players in quiet environments (library, bus), and players with audio off by default all need the feedback. Show a brief visual chime for pass-SFX etc. Low cost. |
| **Minimum text size / UI zoom** | **DEFER TO v1.1** | Phaser Canvas + Next.js supports browser zoom natively. Dedicated font-scale slider is nice-to-have; browser-zoom covers the 80%. |
| **Screen-reader support for Library UI** | **REASONABLE TO DEFER** | Library is an HTML list outside the Phaser canvas — standard semantic HTML gets us most of the way. Full SR support for the canvas game layer is v2 territory given solo build constraints. Export formats (MD, JSON) are inherently SR-friendly. |
| **Keyboard-only navigation for non-game UI** | **ADD TO v1** | Settings, auth flow, Library UI all outside Phaser — should be keyboard-navigable by default with Next.js + semantic HTML. Low marginal cost; costs more to fix later. |

#### §B — Resilience & Mobile-Web Quirks

| Feature | Verdict | Reasoning |
|---------|---------|-----------|
| **Pause/resume mid-encounter without losing the in-progress prompt** | **ADD TO v1** | Mobile sessions are interrupted constantly (phone call, app switch, tab background). Losing 2 minutes of prompt drafting = player bounce. Persist draft prompt to localStorage on every keystroke. Low cost. |
| **Graceful API failure handling** (retry, preserve prompt, friendly error) | **ADD TO v1** | Anthropic API will 500, rate-limit, and time out. A raw error = broken-game perception. Design doc §13 flags rate-limit risk but not user-facing resilience. Standard pattern: retry-with-backoff, keep prompt text on failure, explain "network hiccup — try again." |
| **Offline/disconnect detection and handling** | **ADD TO v1** | Mobile connections drop; users switch between wifi and cellular. Detect via `navigator.onLine` + fetch errors; show "waiting for connection" banner; resume when back. Prevent sending prompts into the void. |
| **Focus-loss handling** (tab backgrounded mid-encounter) | **ADD TO v1** | Phaser pauses by default on `visibilitychange`; ensure grading in flight isn't lost. Low cost, standard pattern. |
| **Rate-limit exceeded UX** (user hits 20/day) | **ADD TO v1** | Design doc §requirements line 33 defines the limit but not the UX. Silent failure at attempt 21 is a dark pattern. Show remaining-attempts counter; inform clearly when hit; suggest "come back tomorrow" (which also aligns with mood-decay + cozy-session-shape). |
| **Works on Safari iOS audio autoplay constraints** | **ADD TO v1** | iOS Safari blocks audio until user gesture. First tap unlocks audio context. Standard Phaser pattern, but easy to forget. |
| **localStorage quota exceeded handling** | **DEFER TO v1.1** | Realistic for Cluu's data size (a few KB) — unlikely to hit 5MB quota in normal play. Worth logging to Sentry but not engineering against in v1. |
| **First-load performance (initial bundle <2MB)** | Already in design doc §requirements line 36 — covered | — |

#### §C — Account & Privacy (POPIA / GDPR-adjacent)

| Feature | Verdict | Reasoning |
|---------|---------|-----------|
| **Delete account + delete all data** | **ADD TO v1** | POPIA requirement for South African studio. Also required by modern user expectation. Simple Supabase cascade-delete flow. |
| **Export my data (distinct from Library export)** | **ADD TO v1** | POPIA/GDPR right of access. Convenient: re-uses Library JSON export infrastructure — extend to dump player_state too. |
| **Clear privacy policy link** | **ADD TO v1** | Required; link from landing + settings. |
| **Explicit opt-in for raw prompt logging to analytics** | Already in design doc §13 — covered, but surface as UI | Design doc covers the *policy*; the *UI* (toggle in settings, default off) needs building. **Add a "Share my prompts to improve Cluu" toggle, default OFF**. |
| **Cookie / storage consent** (if any) | **DEFER TO v1.1** | PostHog + Supabase use essential storage only (no ad tracking). Likely exempt from cookie-banner requirements under POPIA for strictly-necessary storage. Verify with legal before launch; don't build a banner that isn't needed. |

#### §D — Onboarding & First-Run

| Feature | Verdict | Reasoning |
|---------|---------|-----------|
| **First 5 minutes must feel magical** | Already in design doc §requirements line 39 — covered | — |
| **Tutorial that doesn't feel like a tutorial** | **IMPLICIT in design doc** | The "hidden curriculum" principle extends here. Design doc §12 week 22 budgets onboarding polish. Recommend: first encounter (Withered Sunflower) *is* the tutorial, with light contextual nudges, never a modal tutorial. Tag as "onboarding design principle" for phase planning. |
| **Post-first-encounter celebration** | **ADD TO v1** | Moment of first-pass is the emotional hook — Cluu sparkling, reward visible, "save to Library?" prompted. Design doc §7.1 covers the sparkle state; the ceremonial framing of the first-ever save is worth explicit design. |

#### §E — In-Game Conveniences

| Feature | Verdict | Reasoning |
|---------|---------|-----------|
| **Cosmetic wardrobe UI (swap hats/patterns)** | Already in design doc §12 week 7 — covered | — |
| **Mini-map or biome overview** | **REASONABLE TO DEFER** | Biomes are small by design. A minimap risks feeling bureaucratic in a cozy game. Defer; add only if playtesters ask. |
| **Review past attempts for an encounter** | **ADD TO v1** | Once a player saves to Library, they should be able to replay the encounter with the same prompt (or a new one). Design doc says Library is read-only UI; recommend light "jump to this encounter" from Library entry. Supports learning via iteration. |
| **Encounter replay (solve again with different prompt)** | **ADD TO v1** | Meta-capstones depend on this (§4.5). But also: a player who got Pass might want to try for Flair later. Explicit replay is low cost once engine exists. |
| **Sound effect on Library save (the "permanent" feeling)** | **ADD TO v1** | The Library save is the emotional climax of an encounter. It deserves a distinct SFX + animation — the book closing, a gold flourish. Low cost; huge feel impact. Tag as "Library feel polish." |

---

## Feature Dependencies

```
Anonymous play (localStorage)
    └──enables──> No-friction first-5-minutes experience
                       │
Magic-link auth
    └──required-for──> Account-state migration
                              └──required-for──> Cross-device Library access
                                                     │
Supabase Postgres save-state
    └──required-for──> Persistent cosmetics
    └──required-for──> Library entries persist
                              └──required-for──> Library export (MD / JSON / PNG)
                                                     └──required-for──> Share cards
                                                     └──required-for──> Core Value delivery
                                                     
LOGIC.md compiler
    └──required-for──> All encounters
                              └──required-for──> Grading verdicts (fail/pass/flair)
                                                     └──required-for──> Flair gate on Library save
                                                     
Two-call grading (Sonnet + Haiku)
    └──required-for──> All encounter attempts
    └──enables──> Cost viability via Haiku grading
                              
Upstash rate limiting + prompt-hash cache
    └──required-for──> Unit-economics viability at scale
                              
Input sanitization + meta-ignoring grader prompt
    └──required-for──> Prompt-injection resistance
                              └──required-for──> Safe public launch
                              
Cluu mood system
    └──depends-on──> Save-state timestamps (last_active_at)
    └──conflicts-with──> [Notifications] ← deliberately never implemented
    └──conflicts-with──> [Progression-gated-on-mood] ← deliberately never implemented
    
Reduced-motion toggle          \
Colour-blind considerations     }──required-for──> Accessibility baseline (ADD TO v1)
Audio captions                 /
    
Graceful API-failure UX
    └──required-for──> Any production launch (LLM APIs fail; this isn't optional)
    
Account deletion + data export
    └──required-for──> POPIA compliance for SA studio
```

### Dependency Notes

- **Library export depends on save-state which depends on auth-OR-anonymous.** The full chain (anonymous → play → Flair → save → sign up → migrate → export) must work end-to-end. Breaking any link = Library doesn't ship = project has failed (PROJECT.md Core Value).
- **LOGIC.md compiler is the single point of failure for all gameplay.** §6 flags this; ordering-wise it must be stable before encounter authoring begins.
- **Two-call grading enables content velocity.** Once Sonnet + Haiku wiring is proven on encounter #1 (week 3), the engine supports authoring 5 encounters/evening. Don't block content work on engine polish.
- **Mood system is relational, not functional.** It depends on save-state timestamps, but nothing depends on mood output. It is a purely aesthetic subsystem. This is intentional and must be preserved.
- **Rate limiting + cache are infrastructure features that unlock the business model.** Without them, a viral moment could burn the Anthropic budget. They must ship before launch, not after.
- **Anti-feature conflicts are permanent constraints, not "not yet" items.** Progression-gated-on-mood and notifications are architecturally excluded — the mood system is deliberately decoupled from progression, and there is no notification delivery subsystem. Re-adding these would require re-designing the companion framing.

---

## MVP Definition

### Launch With (v1) — the locked scope

Pulled from PROJECT.md §Active requirements. Sorted by dependency order.

- [ ] Magic-link auth + anonymous play + account migration
- [ ] Supabase player-state persistence (mood, cosmetics, progress, unlocked biomes, library)
- [ ] Phaser scene with walkable island, touch + keyboard input, Cluu as pet-follower
- [ ] LOGIC.md compiler integration + contract loader
- [ ] Two-call grading pipeline (Sonnet gen → Haiku grade → verdict)
- [ ] 27–37 encounters across 5 biomes (Meadow → Village → Workshop → Tide Pools → Library)
- [ ] Cluu four moods + two in-encounter states + cosmetic rendering
- [ ] Library UI + Markdown/JSON/PNG export
- [ ] Share card generation via `@vercel/og`
- [ ] Input sanitization + meta-instruction-ignoring grader + 500-char limit
- [ ] Upstash rate limiting (20 attempts/day) + prompt-hash cache
- [ ] 60fps on iPhone SE 2020, <2MB initial bundle
- [ ] ≥95% human/Haiku grading agreement per encounter before release
- [ ] First 5 minutes magical without instructions

### Launch With (v1) — **recommended additions** from this research

Missed table stakes that should be added to v1 requirements:

- [ ] **Reduced-motion toggle** (respect `prefers-reduced-motion`, mute Cluu tweens/sparkles when set) — accessibility baseline
- [ ] **Colour-blind-safe mood + grading signals** (pair colour with icon/text always) — accessibility baseline
- [ ] **Audio captions / visual cues for SFX** — accessibility + "play in public" use case
- [ ] **Audio mute + volume control in settings** — universal expectation
- [ ] **Pause / resume mid-encounter with prompt draft preserved to localStorage** — mobile interruption resilience
- [ ] **Graceful API-failure UX** (retry, preserve prompt, friendly error) — production launch requirement
- [ ] **Offline / disconnect detection + recovery** — mobile-web reality
- [ ] **Rate-limit exceeded UX** (visible counter + clear "come back tomorrow" messaging) — dark-pattern avoidance
- [ ] **Account deletion + data export** — POPIA compliance
- [ ] **Explicit opt-in toggle for raw-prompt logging** (default OFF) — POPIA compliance, surfaces existing §13 policy as UI
- [ ] **Encounter replay** (retry a passed encounter for a higher grade or different prompt) — supports capstone meta-encounters, low cost

### Add After Validation (v1.1)

- [ ] Paid cosmetic packs + payment plumbing (already planned in design doc)
- [ ] Localisation (if demand materialises — already planned)
- [ ] UI font-scale slider (beyond browser zoom)
- [ ] Cookie / consent banner if legal review says needed
- [ ] "Founders' pack" ($5 unlimited attempts + 3 exclusive hats) if validated
- [ ] Drop-Tide-Pools fallback content (if cut in v1 per §12 slippage budget)

### Future Consideration (v2+)

- [ ] Native iOS / Android via Capacitor (v1.2, already planned)
- [ ] Community encounter authoring (v1.3, already planned)
- [ ] Screen-reader support for Phaser game layer
- [ ] Voice input (v2, already planned)
- [ ] Multiplayer / social islands (v2, already planned)
- [ ] Player-generated island themes (v2, already planned)
- [ ] Steam version (v2, already planned)

**Permanently excluded (never v-anything):**
- Leaderboards, streaks, social-proof metrics
- Notifications of any kind
- Progression gated on mood
- Paid curriculum content (curriculum is free forever; only cosmetics are paid)

---

## Feature Prioritization Matrix

Abbreviated — full locked scope is in §MVP. Highlighting only the **research-surfaced additions** for roadmap input.

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Library export (MD/JSON/PNG) | HIGH (Core Value) | HIGH | **P0 — cannot cut** |
| LOGIC.md encounter engine | HIGH | HIGH | **P0** |
| Two-call grading pipeline | HIGH | MEDIUM | **P0** |
| Anonymous play + migration | HIGH | MEDIUM | **P0** |
| Reduced-motion toggle | MEDIUM (accessibility baseline) | LOW | P1 — add to v1 |
| Colour-blind-safe signals | MEDIUM (accessibility baseline) | LOW (if designed in) | P1 — add to v1 |
| Audio captions / visual SFX cues | MEDIUM | LOW | P1 — add to v1 |
| Pause-mid-encounter + draft preservation | HIGH (mobile bounce risk) | LOW | P1 — add to v1 |
| Graceful API failure UX | HIGH (prod launch blocker) | MEDIUM | P1 — add to v1 |
| Offline / disconnect handling | MEDIUM | MEDIUM | P1 — add to v1 |
| Rate-limit exceeded UX | MEDIUM (dark-pattern avoidance) | LOW | P1 — add to v1 |
| Account deletion + data export | HIGH (POPIA) | LOW | P1 — add to v1 |
| Raw-prompt-logging opt-in UI | MEDIUM (POPIA) | LOW | P1 — add to v1 |
| Encounter replay | MEDIUM (capstone support) | LOW | P1 — add to v1 |
| Screen-reader support for Phaser canvas | LOW (semantic-HTML Library is the primary a11y surface) | HIGH | P3 — v2 |
| Minimap | LOW | LOW | P3 — defer, add if asked |
| UI font-scale slider | LOW (browser zoom covers it) | MEDIUM | P2 — v1.1 |

**Priority key:**
- **P0** — Project fails without it (Core Value or fundamental architecture)
- **P1** — Must ship in v1 (table stakes or locked-design commitment)
- **P2** — Ship in v1.1 (valuable but deferrable)
- **P3** — Future (v2+ or conditional)

---

## Competitor / Genre Feature Analysis

| Feature | Stardew Valley | Animal Crossing | Duolingo | Tamagotchi (modern) | Cluu's Approach |
|---------|----------------|------------------|----------|---------------------|-----------------|
| Companion | Farm animals / spouse | Villagers | Duo (mascot) | The pet itself | **Cluu — companion, never avatar** |
| Notifications | Occasional | Real-time calendar events | Aggressive daily streak | Push to check on pet | **Never, ever** |
| Streaks / retention mechanics | Daily routine-driven | Real-time calendar-driven | Streak freeze, XP lb | Guilt-driven | **Mood decays, zero consequence** |
| Curriculum visibility | N/A | N/A | Lesson 3 of 12, XP bar | N/A | **Hidden curriculum** |
| Export your work | N/A (save file only) | Screenshot design codes | Achievements | N/A | **MD / JSON / PNG Library — the differentiator** |
| Multiplayer | Co-op (optional) | Island visits | Friends list, lb | Breeding (some variants) | **Single-player only (share cards for social)** |
| Monetization | One-time purchase | One-time + DLC | Freemium + streak nags | F2P + iAP | **Free core + v1.1 cosmetic DLC, no streak nags** |
| Auth | Local / Steam | Nintendo account | Google/Apple/email | Varies | **Magic-link only** |
| Accessibility | Expansive options | Limited | Expanding | Minimal | **Recommended: reduced-motion, colourblind, captions in v1** |
| LLM-driven content | None | None | AI-adaptive lessons | None | **Sonnet generate + Haiku grade** |

**Takeaway:** Cluu's genre mash-up means it inherits the cozy-game no-pressure posture from Stardew/Animal Crossing, the hidden-curriculum discipline from the best educational games, and the companion-bond emotional frame from virtual pets — while explicitly rejecting the retention-dark-patterns that have crept into all three genres (Duolingo streak nag, Animal Crossing real-time pressure, Tamagotchi guilt). The Library export is the feature that *no* competitor in any of these three genres has, and it's the Core Value.

---

## Sources

- [How New Accessibility Features Are Changing Modern Game Design — GameSpace](https://gamespace.com/all-articles/news/how-new-accessibility-features-are-changing-modern-game-design/)
- [2025 Video Game Accessibility Recap — Access-Ability](https://access-ability.uk/2025/12/05/2025-video-game-accessibility-recap/)
- [Colour Blindness Accessibility in Video Games — Filament Games](https://www.filamentgames.com/blog/color-blindness-accessibility-in-video-games/)
- [Data Storage — Games on the Web Roadmap (W3C)](https://w3c.github.io/web-roadmaps/games/storage.html)
- [Why Browser Games Are Back in 2026](https://makeanapplike.com/why-browser-games-are-back/)
- [Mobile touch controls — MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch)
- [Phaser Input Concepts](https://docs.phaser.io/phaser/concepts/input)
- [Stardew Valley and the Cozy Game Genre — HCPL](https://hcpl.net/blogs/post/stardew-valley-and-the-cozy-game-genre/)
- [Pet Companion Design: Engaging Gamification — Yu-kai Chou](https://yukaichou.com/advanced-gamification/the-pet-companion-design-in-gamification/)
- [LLM-based Educational Games Will Be a Big Deal — Res Obscura](https://resobscura.substack.com/p/llm-based-educational-games-will)
- [Gamification in Mobile-Assisted Language Learning: Duolingo — Taylor & Francis](https://www.tandfonline.com/doi/full/10.1080/09588221.2021.1933540)
- Primary source: `docs/cluu-v1-design.md` (Draft 1, 2026-04-20) — locked design doc; §3 mechanics, §4 biomes, §7 companion, §10 Library export, §11 share cards, §13 risks, §14 exclusions
- Primary source: `.planning/PROJECT.md` — Active requirements, Out of Scope reasoning, Key Decisions, Constraints

---

*Feature research for: Cluu — cozy browser game × prompt-engineering learning tool × exportable prompt library*
*Researched: 2026-04-20*
