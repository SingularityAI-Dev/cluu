# Cluu · v1 Design Document

*Draft 1 · 20 April 2026 · Rainier Potgieter / Single Source Studios*

A cozy browser game that teaches prompting and Claude fluency through gameplay. Player walks their Cluu around a small island, solves described-into-existence encounters, saves great prompts to a real Library they keep forever. The learning is hidden inside the mechanics. No curriculum panels, no lesson numbers, no lectures.

---

## 1 · Locked constraints

| Axis | Decision |
|---|---|
| **Target audience** | Curious students, 15 to 22. Aspiring builders (22 to 35) treated as natural sequel, not v1 scope. |
| **Build mode** | Solo. Every line owned. |
| **Platform** | Browser-first (Next.js 14 App Router + Phaser.js + Vercel). Capacitor wrap for iOS and Android deferred to v1.2 post-validation. |
| **Input** | Touch and keyboard from day one. Tap-to-move and WASD both supported. |
| **Business model** | Free core game. Cosmetic DLC (hats, patterns, outfits for Cluu) at v1.1 once payment plumbing is designed properly. v1 ships with free cosmetics only. |
| **Tech anchor** | LOGIC.md as the grading-engine spec. Every encounter is a `.logic.md` contract. Dogfoods the flagship. |
| **Timeline target** | 4 to 6 months. Realistic ceiling 9 months if scope creeps. |

---

## 2 · Core loop

Minute-to-minute, the player:

1. Opens the game in a browser (URL or saved home-screen icon)
2. Sees their island, Cluu greets them based on time since last visit
3. Walks Cluu toward a visible encounter (a withered plant, a broken chime, a waiting neighbour)
4. Interacts, opens the encounter's description interface
5. Types a prompt, sends it to Claude, response streams in-world
6. LOGIC.md contract grades the response, encounter resolves (plant revives, chime rings, neighbour hands over a reward)
7. Optionally saves the winning prompt to the Library
8. Walks Cluu somewhere new, or closes the game

Target session length: 12 to 25 minutes. One to three encounters per session. Designed for a bus ride, a study break, or the 20 minutes before bed.

---

## 3 · The five mechanics, detailed

Each mechanic is a gameplay verb that also teaches a prompting concept. The player never sees the concept name.

### 3.1 · Describe

Encounters where the world itself changes in response to descriptive prompts.

**Surface examples.** A withered plant in the meadow. The player walks Cluu up to it, taps it, a description pane opens. They type "a tall sunflower with a cracked stem, just about to bloom." Claude generates a short grounded response describing the revived plant. LOGIC.md contract checks for specificity (concrete nouns), visual detail (at least two adjectives), and internal consistency (no contradictions). Contract passes, plant sprite swaps from withered to thriving, maybe a little bee animation spawns.

**Hidden concept.** Specificity and concrete detail. The player learns that "a flower" underperforms "a tall sunflower with a cracked stem." This is Lesson 1 of prompt engineering, delivered without ever saying "specificity."

### 3.2 · Request

Encounters where NPCs (small creatures on the island, each with a name and a tiny personality) ask Cluu for help. Well-framed requests get better help back and unlock rewards.

**Surface examples.** A neighbour named Fen wants "a poem." Generic requests get a generic poem and a "thanks, it's fine" from Fen. Specific requests ("a four-line poem about missing the sea, in the voice of a lighthouse keeper") get Fen delighted and a reward like a cosmetic, a new path opened, a song playing. LOGIC.md contract grades Fen's reaction based on whether the request specified audience, length, tone, and form.

**Hidden concept.** Ask specification. Who is it for, what shape, what tone, what constraints.

### 3.3 · Contract

Encounters where the output must fit a specific shape. The player learns to request structured outputs from Claude.

**Surface examples.** A broken mail sorter that only accepts envelopes in a specific format (`{to: string, message: string, urgency: "low" | "med" | "high"}`). The player prompts Claude for a letter to a friend who moved away. If the output isn't structured, the sorter jams visually (little error animation, paper crumples). If the output is structured correctly, the envelope sails into the correct slot and a new path opens.

**Hidden concept.** Output contracts, JSON/structured generation, tool-use precursors.

### 3.4 · Tool

Later-game encounters where Cluu learns to use described tools. The description becomes a tool call.

**Surface examples.** A fishing rod that catches different things based on how you describe the water. "Still pond at dawn" catches different fish than "choppy ocean at storm's edge." A camera that photographs whatever you tell it to look for. Each tool has a small contract in its LOGIC.md spec defining what counts as a valid use.

**Hidden concept.** MCP and function-calling. Tools are capability extensions invoked by well-formed descriptions.

### 3.5 · Library

The only mechanic that leaves the game.

**Surface.** Every time the player passes an encounter's LOGIC.md contract with a "Flair" rating (top 25th percentile grade), the game offers to save the prompt to their Library. The Library is visible in-game as a little book Cluu carries, and viewable in the UI as a clean list. Each entry has: the prompt, the encounter it solved, the reward, the date, the tags.

**Exports.** The Library exports to three formats:
- Markdown (one file, one prompt per section, ready to drop into Obsidian or Claude Code `.md` skills folder)
- Image card (shareable, 1200x630, with Cluu, the prompt, and the player's island name)
- JSON (for power users who want to script over their own prompt collection)

**Why it matters.** This is the tether between game and real life. Every great prompt a player writes in the game becomes a real tool they can use in Cursor, Claude Code, Cowork. Without the Library, Cluu is a toy. With the Library, Cluu is a tool.

---

## 4 · World and biomes

v1 ships with five biomes, gated behind curriculum progress. The world is visible as a small archipelago of connected islands. Each new biome unlocks when the prior biome's core arc completes.

### 4.1 · Starter Meadow (unlocked immediately)

Cluu's home. Soft pastels, rolling grass, a few wildflowers, a signpost. Five to seven Describe encounters. Teaches specificity, concrete detail, consistency.

### 4.2 · Neighbour Village (unlocks after Meadow arc)

A cluster of little cottages where other creatures live. Six to eight Request encounters. Teaches ask specification, audience awareness, tone control.

### 4.3 · Sorting Workshop (unlocks after Village arc)

An indoor biome. Workbenches, a mail sorter, a recipe book, a filing cabinet. Six to eight Contract encounters. Teaches structured outputs, JSON, enumerations, consistent formats.

### 4.4 · Tide Pools (unlocks after Workshop arc)

A rocky shore biome. Fishing rod, camera, magnifying glass, a telescope. Six to eight Tool encounters. Teaches function calling, tool descriptions, when to use what tool.

### 4.5 · The Library (unlocks after all four biomes)

Not a normal biome. A small library building Cluu can enter anytime, containing every saved prompt, bookshelves organised by tag. Endgame "encounters" here are meta-challenges: "Write a prompt that would revive the withered plant from the Meadow, without needing to see the plant." These are the capstones that certify mastery.

---

## 5 · Curriculum arc

The hidden curriculum, mapped to biomes, in the order the player encounters it. The player never sees these labels.

| Biome | Mechanic | Hidden concept | Encounters |
|---|---|---|---|
| Meadow | Describe | Specificity, detail, grounding | 5 to 7 |
| Village | Request | Audience, tone, length, form | 6 to 8 |
| Workshop | Contract | Structured output, JSON, schemas | 6 to 8 |
| Tide Pools | Tool | Tool use, function calling | 6 to 8 |
| Library | Meta | Prompt reuse, abstraction | 4 to 6 capstones |

Total: 27 to 37 encounters in v1. Each takes 3 to 8 minutes. Full playthrough: 2 to 4 hours of content, extendable through replay of capstones with different prompts.

---

## 6 · LOGIC.md grading engine

Every encounter is a `.logic.md` file. This is the single biggest technical commitment in the design and also the biggest payoff: Cluu becomes a working demonstration of LOGIC.md in production.

### 6.1 · Encounter contract shape

```yaml
---
id: meadow_withered_sunflower
biome: meadow
mechanic: describe
difficulty: 1
reward:
  cosmetic: petal_pin
  xp: 10
  library_eligible: true
grading:
  model: claude-haiku-4-5
  temperature: 0.2
---

# Encounter: Withered Sunflower

## Context
The player has walked Cluu to a withered plant at the meadow's edge.
They must describe what the plant should become.

## Player prompt input
{{user_prompt}}

## Claude's task
Generate a short (30 to 60 word) description of the plant now, based on the player's prompt.
The description will be shown in-game as flavour text.

## Grading contract
Pass requires all three:
- SPECIFICITY: User prompt contains at least 2 concrete visual nouns (e.g. petals, stem, leaves, bud, bloom, colour, height).
- DETAIL: User prompt contains at least 2 descriptive adjectives (e.g. tall, cracked, yellow, fragile, golden).
- CONSISTENCY: Claude's generated description does not contradict the user prompt.

Flair (top grade) also requires:
- EVOCATIVE: User prompt uses sensory or atmospheric language beyond bare visual (e.g. "just about to bloom", "weathered by sea wind").

## Reward messaging
- Pass: "The sunflower unfurls. A bee arrives."
- Flair: "The sunflower unfurls, petals trembling. Three bees arrive."
- Fail: "The plant stirs, but doesn't quite wake. Try describing it more."
```

### 6.2 · Grading architecture

Each encounter attempt triggers two LLM calls:

1. **Generation call** (Claude Sonnet 4.6, moderate temp) — produces the in-world response
2. **Grading call** (Claude Haiku 4.5, low temp) — runs the contract against the user prompt + generated response

Grading call receives the contract assertions as structured JSON and returns a per-assertion pass/fail plus an overall verdict (`fail` / `pass` / `flair`). Cached where possible (identical prompts don't re-grade, though this is rare in practice).

Cost per encounter attempt: roughly 0.3 to 1 cent at current pricing. With 30 encounters and assume 2 attempts each, a full playthrough costs the server about 30 to 60 cents. Viable on free tier with rate limits, sustainable with cosmetic DLC revenue later.

### 6.3 · Why LOGIC.md and not hardcoded

- **Content authorability.** New encounters are new `.logic.md` files, not code. You can write 5 encounters in an evening once the engine is solid.
- **Dogfooding the flagship.** Cluu is the best public demonstration of LOGIC.md in a consumer product. Screenshots and gameplay clips become marketing for both.
- **Community content, later.** v1.3 can open encounter authoring to players. They write their own `.logic.md` files, share islands with custom puzzles.

---

## 7 · Cluu: the companion

Cluu is never controlled directly in the sense of being the avatar. The player moves a small invisible cursor/anchor that Cluu follows, like a pet following its owner. This subtle framing preserves the "with Cluu, not as Cluu" relationship from Session 2 of this design.

### 7.1 · Visual states

Four moods as previously designed: Stoked, Content, Sleepy, Blue. Plus two in-encounter states:

- **Curious** — head tilt, used when a prompt attempt fails. Never sad, never disappointed.
- **Sparkling** — joyful bounce, used when a prompt passes with Flair.

All state transitions via sprite swap or simple tween. No complex rigging in v1.

### 7.2 · Mood system

Mood is relational, never punitive. Rules from earlier design stand:

- **Mood never affects progression.** Unlocked biomes, saved Library prompts, cosmetic ownership are permanent.
- **Mood decays passively with absence.** Stoked after a session, Content by next day, Sleepy after 3 days, Blue after 7 days.
- **Mood recovers on return.** A single visit bumps mood back up at least one step.
- **No notifications, ever.** Cluu does not message the player. Absence is absence; return is return.

### 7.3 · Cosmetics

Cluu collects wearable cosmetics as rewards: hats, patterns on his body, little accessories. v1 ships with roughly 15 free cosmetics tied to encounter completion. v1.1 adds paid cosmetic packs.

Cosmetic slots:
- Head (hats, helmets, headbands)
- Body pattern (stripes, spots, solid colours, seasonal patterns)
- Back accessory (capes, wings, backpack)
- Eye style (default, sparkly, sunglasses, closed/sleeping)

---

## 8 · Technical stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend framework | Next.js 16.2.x App Router *(amended 2026-04-20)* | Vercel-native, SSR for landing/share cards, RSC-friendly. Next 14 reached EOL 2025-10-26; 16 is current Active LTS with Turbopack stable and `next/og` bundled. |
| Game engine | Phaser.js 3.90.x ("Tsugumi") *(amended 2026-04-20)* | Mature 2D engine, touch + keyboard native, Canvas + WebGL, proven on cozy games. 3.90 is current stable; Phaser 4 not production-ready. |
| Rendering | Phaser Canvas (not WebGL) | Simpler debugging, fine for 2D sprite art at this scale |
| Sprite art | Aseprite + manual export | Industry standard for pixel/flat sprite art |
| Physics | Phaser Arcade Physics | More than enough for walking and collision |
| State management | Zustand (client) + Supabase (server) | Zustand for game state, Supabase for auth + saves |
| Auth | Supabase Auth, magic-link email only | No passwords, no OAuth in v1. Anonymous play allowed with localStorage save migration. |
| Save state | Supabase Postgres | One `player_state` row per user, JSONB for flexibility |
| Grading engine | LOGIC.md compiler (`@logic-md/core`) + Claude Haiku 4.5 | Your flagship. Dogfood. |
| Generation LLM | Claude Sonnet 4.6 via Anthropic API | Best narrative quality at cost |
| Grading LLM | Claude Haiku 4.5 via Anthropic API | Cheap, fast, structured-output-reliable |
| API rate limiting | Upstash Redis | Per-user limits, abuse prevention |
| Deployment | Vercel | Trivial deploy, edge functions for grading, global CDN |
| Domain | `cluu.game` or `cluu.singlesource.co.za` | Short, memorable, owns the search term |
| Analytics | PostHog (self-hosted or cloud) | Privacy-respecting, POPIA-compatible |
| Error tracking | Sentry | Standard |
| CI | GitHub Actions | Standard |

**Rejected options and why.**

- *Unity or Godot.* Overkill for 2D cozy, also means no browser-native distribution without WebGL export complications.
- *Pure HTML/Canvas without Phaser.* Reinventing animation, physics, scene management. Phaser exists for exactly this.
- *Firebase.* Supabase is better POPIA story, better Postgres, you already know it.
- *OAuth in v1.* Every additional auth option is a surface area. Magic link ships faster and covers 99% of the audience.

---

## 9 · Data model

```
users
├─ id (uuid)
├─ email
├─ display_name
├─ created_at
└─ last_active_at

player_state
├─ user_id (fk)
├─ cluu_mood (enum)
├─ cluu_cosmetics (jsonb: {head, body, back, eyes})
├─ island_progress (jsonb: {meadow: {completed_encounters, current_xp}, ...})
├─ unlocked_biomes (text[])
└─ updated_at

library_entries
├─ id (uuid)
├─ user_id (fk)
├─ encounter_id (text, matches .logic.md id)
├─ prompt_text
├─ generated_response
├─ grade (enum: pass, flair)
├─ tags (text[], auto-derived from encounter biome/mechanic)
└─ created_at

cosmetic_catalogue
├─ id (text)
├─ slot (enum: head, body, back, eyes)
├─ name
├─ source (enum: encounter_reward, dlc_pack, event)
├─ sprite_path
└─ unlock_condition (jsonb)

user_cosmetics
├─ user_id (fk)
├─ cosmetic_id (fk)
├─ acquired_at
└─ acquisition_source (text)
```

---

## 10 · The Library export format

The markdown export is the product's real deliverable. Gets this right and Cluu becomes a tool people actually use.

```markdown
# My Cluu Library

*Exported from Cluu · 2026-04-20 · Island: "Fennmoor"*

## Meadow / Describe

### Withered sunflower (Flair)
*2026-04-18*

> a tall sunflower with a cracked stem, petals just about to unfurl in the morning light

**Claude's response:**
> The sunflower rises, stem marked with a hairline scar, petals peeling open into slow golden fire.

**Tags:** #describe #visual #atmospheric

---

### Broken wind chime (Pass)
*2026-04-18*

> a chime made of sea-polished glass that rings in ocean blues when the wind finds it

**Claude's response:**
> The chime stirs, glass pieces catching and releasing light, ringing in low blue tones.

**Tags:** #describe #sensory

---

## Village / Request

### Fen's poem (Flair)
*2026-04-19*

> Write a four-line poem for Fen about missing the sea, in the voice of a retired lighthouse keeper.

**Claude's response:**
> I tended light for thirty years of tide. / Now land-locked days grow thick with quiet weather. / The sea still calls, but softer, from inside. / Some nights I swear my old lamp burns together.

**Tags:** #request #creative #voice
```

Same content exports as JSON for scripting and as a 1200x630 PNG card for sharing.

---

## 11 · Share cards

On any Flair-rated save, the player can generate a share card: 1200x630 PNG, Cluu posed next to the prompt, the island name, the tags, and a subtle "made in Cluu" watermark with a link. Deployed via Vercel's `@vercel/og` for runtime generation. Share targets: Twitter, Discord, text message, anywhere. This is how Cluu acquires new players organically.

---

## 12 · Build plan: 24 weeks, solo

Each week is a focused slice. Don't parallelize; finish each milestone before moving on.

### Month 1: Foundations (weeks 1–4)

- **Week 1.** Next.js + Supabase + Phaser scaffold. Deploy "hello world" with Cluu sprite on a grass tile, walkable, to cluu.game. Auth via magic link. Anonymous play migrates to account on signup.
- **Week 2.** Tile-based world rendering, camera follow, touch + keyboard input. One fully walkable Meadow biome with fixed layout, no encounters yet. Sleep/wake day-night cycle visual.
- **Week 3.** LOGIC.md compiler integration. Build the first encounter (Withered Sunflower) end to end: tap plant, description pane, prompt input, API call to Sonnet, API call to Haiku grader, contract verdict, visual reward. Just one encounter, working.
- **Week 4.** Cluu mood system, cosmetic slot rendering, save/load to Supabase. Basic Library UI (in-game book, list of saved prompts). Library markdown export working.

### Month 2: Meadow content and polish (weeks 5–8)

- **Week 5.** Author 6 more Meadow encounters. Each is a `.logic.md` file + a sprite/animation. Reuse the first encounter's engine.
- **Week 6.** Encounter variety polish. Different visual rewards, different contract shapes within Describe mechanic. First pass at audio (ambient loop, SFX for pass/fail).
- **Week 7.** Cluu mood polish: all four moods, transition animations, return-after-absence flows. Cosmetic unlock flow, cosmetic wardrobe UI.
- **Week 8.** Meadow arc complete. Private alpha: invite 5 to 10 friends to play, collect qualitative feedback. Fix the top three friction points.

### Month 3: Village and Workshop (weeks 9–16)

- **Weeks 9–10.** Village biome: new tileset, new NPCs, 6 Request encounters. Reuse engine, layer NPC dialogue system.
- **Weeks 11–12.** Workshop biome: new tileset, 6 Contract encounters. Structured output parsing, visual "fits the slot" vs "jams" rewards.
- **Weeks 13–14.** Second alpha: 20 to 50 friendlies. Focus on session-length data, drop-off points, what encounters frustrate.
- **Weeks 15–16.** Response to alpha feedback. Encounter rebalancing, grading contract tuning, UX fixes.

### Month 4: Tide Pools and Library (weeks 17–20)

- **Weeks 17–18.** Tide Pools biome: 6 Tool encounters. Tool animation, tool inventory, tool-description coupling.
- **Weeks 19–20.** Library biome: 4 capstone encounters. Share card system. Full Library export polish (MD, JSON, PNG).

### Month 5: Launch prep (weeks 21–24)

- **Week 21.** Performance pass. Target: 60fps on iPhone SE 2020, smooth on 5-year-old Android. Bundle size <2MB initial.
- **Week 22.** Onboarding polish. First 5 minutes must feel magical. Refine the moment of first encounter completion.
- **Week 23.** Public beta. Post on HN, Twitter, LOGIC.md Discord. Collect live feedback and server load data.
- **Week 24.** Launch. Public announcement, hit Anthropic dev community, show it in your Paperclip/LOGIC.md narrative.

### Slippage budget

This plan assumes no slippage. You will slip. Realistic: add 4 to 8 weeks for unexpected issues, which puts launch at month 7 or 8. Mitigation: cut a biome if behind at month 3 (drop Tide Pools, save it for v1.1). Never cut the Library export; it's the tether.

---

## 13 · Risks and mitigations

**Grading contract reliability.** Haiku will occasionally grade inconsistently. Mitigation: run every new encounter through 50 test prompts with known-pass and known-fail examples, tune the contract language until Haiku agrees with humans >95% of the time. Keep a grading-disputes log; if a player flags a bad verdict, review and patch the contract.

**API cost at scale.** 30 to 60 cents per playthrough is fine at 100 players, painful at 10,000. Mitigations: aggressive caching (cache by prompt hash; identical prompts don't re-grade), daily rate limit per user (20 encounter attempts per day free), and the v1.1 cosmetic DLC funds ongoing API costs. Consider a "founders' pack" at 5 USD that includes unlimited attempts + 3 exclusive hats.

**Prompt injection through player input.** Players will try to jailbreak the grader. Mitigation: sanitize inputs (strip XML-like tags in user prompts, enforce max length 500 chars), run grading with a system prompt that explicitly ignores meta-instructions in user prompts, add a prompt-injection detection pass on suspicious inputs. POPIA-relevant: never log raw prompts to analytics without explicit opt-in.

**Scope creep on art.** Temptation to over-polish sprites will kill the timeline. Mitigation: commit to a single visual style guide in week 1 (soft pastels, flat shading, 32x32 base tile, 48x48 Cluu), outsource or AI-generate 50% of sprite variants, spend craft time on animation feel not on sprite-by-sprite perfection.

**LOGIC.md evolution during build.** Cluu will reveal gaps in LOGIC.md as a tool. Mitigation: budget 10% of build time for LOGIC.md improvements that feed back to the flagship. Cluu is the proving ground; treat tool friction as a feature request, not a blocker.

**Solo isolation and motivation.** Six-month solo builds have a well-known motivational valley around month 3. Mitigation: weekly public build log on Twitter, alpha tester group by week 8 so you have real players responding early, Paperclip CEO agent tracking issues so you don't have to hold it all in your head.

---

## 14 · What's explicitly NOT in v1

- Multiplayer or social-island features (v2 territory)
- Paid cosmetic purchase (v1.1)
- Native iOS/Android (v1.2 via Capacitor)
- Community encounter authoring (v1.3)
- Voice input (v2)
- Localisation beyond English (v1.1 if demand appears)
- Steam version (v2 if browser wins)
- Player-generated island themes (v2)
- Leaderboards, streaks, social proof metrics (deliberately excluded forever)

---

## 15 · Success criteria

v1 is a success if, at three months post-launch:

- 1,000+ players have completed the Meadow arc
- Average session length >= 12 minutes
- 30%+ of players return within 7 days of first session
- 20%+ of players have exported a Library at least once
- At least one viral moment on Twitter or HN driven by a share card
- LOGIC.md GitHub stars bump measurably correlating with Cluu launch
- Player qualitative feedback indicates "fun" and "I learned something" roughly equally

v1 is a failure if first-session completion is below 50% or 7-day retention is below 15%. Those numbers mean the onboarding is wrong and no amount of content downstream fixes it.

---

## 16 · Next deliverables

When you're ready to move from design to build, the next artifacts are:

1. **Visual style guide.** Single image with colour palette, Cluu reference sheet, tile samples, UI components. Week 0 commit.
2. **LOGIC.md encounter specification.** Formalised schema for every `.logic.md` file. Anchors the grading engine work.
3. **Week 1 build brief.** GSD-formatted execution prompt for Claude Code to scaffold the Next.js + Phaser + Supabase project.
4. **Meadow encounter brief × 7.** Each a `.logic.md` draft plus a sprite-direction sketch. Week 5 content batch.

Hand me any of those and I'll draft it.

---

*End of design document. This supersedes all prior conversation fragments. If anything conflicts with prior design notes, this document wins.*

---

## Amendments

| Date | Section | Change | Reason |
|---|---|---|---|
| 2026-04-20 | §8 Technical stack | Next.js 14 → **16.2.x**; Phaser 3.80+ → **3.90.x** | Next 14 hit EOL 2025-10-26 — no security patches. Phaser 3.90 is current stable. Surfaced by GSD stack research; user-approved. |
