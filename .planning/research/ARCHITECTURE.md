# Architecture Research: Cluu v1

**Domain:** Browser-based 2D game with LLM grading engine (solo build)
**Researched:** 2026-04-20
**Confidence:** HIGH (stack is locked; patterns are well-established; only novel boundary is LOGIC.md compiler placement)

Cluu's architecture is unusual but not novel. It is a Next.js App Router app with three load-bearing subsystems — a **Phaser game canvas** (client-only), an **encounter grading gateway** (server-only), and a **save-state reconciler** between Zustand and Supabase. The locked stack (§8) determines the layering; the real design work is in the **boundaries between those subsystems** and the **order you wire them together** so the walking skeleton runs before you invest in content.

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER (Client)                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────┐       ┌───────────────────────────────────┐      │
│  │   Next.js RSC Shell    │       │     Phaser Game (Canvas)          │      │
│  │  - Landing / marketing │       │  - Scenes: Boot, Meadow, Village, │      │
│  │  - /play route (RSC)   │──▶    │    Workshop, TidePools, Library   │      │
│  │  - Auth callback       │ mount │  - Anchor + Cluu follow AI        │      │
│  │  - Library export page │       │  - Encounter triggers (tap tile)  │      │
│  └───────────┬────────────┘       └────────────┬──────────────────────┘      │
│              │                                 │                             │
│              │ dynamic import (ssr:false)      │ EventBus (pub/sub)          │
│              ▼                                 ▼                             │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                React UI Overlay (Client Components)                  │    │
│  │  - EncounterPanel  - LibraryBook  - Wardrobe  - MoodBadge  - Toaster │    │
│  └─────────────────────────────┬────────────────────────────────────────┘    │
│                                │                                             │
│              ┌─────────────────┴─────────────────┐                           │
│              ▼                                   ▼                           │
│  ┌────────────────────────┐        ┌──────────────────────────────┐          │
│  │  Zustand Game Store    │        │  Supabase Browser Client     │          │
│  │ (optimistic, source    │        │  (anon RLS; magic-link auth) │          │
│  │  of truth for frame)   │        └──────────────┬───────────────┘          │
│  └───────────┬────────────┘                       │                          │
│              │ debounced sync                     │ realtime / queries       │
└──────────────┼───────────────────────────────────┼──────────────────────────┘
               │                                   │
               ▼                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      VERCEL SERVER (Node.js runtime)                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐   ┌────────────────────────────────────────────┐        │
│  │ Server Actions  │   │  Route Handlers                            │        │
│  │ - savePrompt()  │   │  POST /api/encounter/attempt  ◀── main gw  │        │
│  │ - updatePlayer()│   │  POST /api/library/export                  │        │
│  │ - auth callback │   │  GET  /og/card/[id]  (next/og)             │        │
│  └────────┬────────┘   └───────────────┬────────────────────────────┘        │
│           │                            │                                     │
│           │              ┌─────────────┴─────────────┐                       │
│           │              ▼                           ▼                       │
│           │   ┌──────────────────────┐   ┌─────────────────────────┐         │
│           │   │  Grading Gateway     │   │  LOGIC.md Compiler      │         │
│           │   │  - sanitize input    │──▶│  (@logic-md/core)       │         │
│           │   │  - rate-limit check  │   │  - parse front-matter   │         │
│           │   │  - prompt-hash cache │   │  - render context       │         │
│           │   │  - orchestrate 2 calls│◀──│  - emit graded verdict  │         │
│           │   └──────┬───────┬───────┘   └─────────────────────────┘         │
│           │          │       │                                               │
│           │          │       └──────────┐                                    │
│           │          ▼                  ▼                                    │
│           │   ┌────────────┐    ┌────────────────────────────┐               │
│           │   │  Upstash   │    │  Anthropic API             │               │
│           │   │   Redis    │    │  - Sonnet 4.6 (generate)   │               │
│           │   │ (limits+   │    │  - Haiku 4.5  (grade)      │               │
│           │   │  cache)    │    └────────────────────────────┘               │
│           │   └────────────┘                                                 │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐             │
│  │  Supabase Server Client (cookie-bound, RLS-enforced)        │             │
│  │  - users / player_state / library_entries / cosmetics ...   │             │
│  └─────────────────────────────────────────────────────────────┘             │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| **Next.js RSC shell** | Marketing landing, `/play` wrapper page, OG metadata, auth callback, server-side session read | `app/` router, Server Components, Server Actions |
| **Phaser Game** | Rendering world/tiles/Cluu/anchor, camera follow, input (touch+keyboard+WASD), encounter trigger detection, sprite animations, mood/cosmetic rendering | Single `Game` instance, Arcade Physics, Canvas renderer, one `Scene` per biome + a `UIScene` for HUD |
| **React UI Overlay** | Encounter panel (prompt textarea, response stream, verdict card), Library book, Wardrobe, Mood badge, Onboarding hints | Client components rendered *above* the `<canvas>` — NOT inside Phaser |
| **EventBus** | Bidirectional channel: Phaser → React ("plant tapped, encounter=meadow_sunflower") and React → Phaser ("encounter passed, play sparkle") | Tiny typed pub/sub singleton (matches the `phaserjs/template-nextjs` bridge pattern) |
| **Zustand store** | Frame-accurate game state: anchor position, Cluu mood, active encounter, optimistic library additions, cosmetic equipped | Single slice with persist-middleware to localStorage (anonymous play) |
| **Supabase browser client** | Auth state subscription, realtime cosmetic catalogue, *reads* during gameplay | `@supabase/ssr` browser client, RLS-scoped |
| **Server Actions** | Mutations that don't need streaming: `savePromptToLibrary`, `updatePlayerState`, `equipCosmetic`, `completeOnboarding` | `app/actions/*.ts` with `'use server'`; cookie-bound Supabase client inside |
| **Grading Gateway** (`POST /api/encounter/attempt`) | THE critical boundary. Sanitize input → rate-limit → cache lookup → compile LOGIC.md → call Sonnet → call Haiku → persist attempt → return verdict | Route Handler (Node runtime / Fluid Compute, NOT Edge — Anthropic SDK streams cleanly on Node and Sonnet can exceed Edge limits) |
| **LOGIC.md Compiler** | Parse `.logic.md` file, merge front-matter + markdown, substitute `{{user_prompt}}`, emit generation prompt + grading assertions as structured JSON | `@logic-md/core` npm package (dogfooded), pure function, runs server-only |
| **Upstash Redis** | Per-user daily attempt counter (20/day), prompt-hash cache (key = `sha256(encounter_id + normalized_prompt)`) | Edge-compatible REST client; 24h TTL on counters, 7d TTL on cache |
| **Supabase Postgres** | Durable source of truth: users, player_state, library_entries, cosmetic_catalogue, user_cosmetics, encounter_attempts (audit) | Row-Level Security on every table keyed to `auth.uid()` |
| **next/og (Vercel)** | 1200×630 share card PNG generation with Cluu + prompt + island name | Bundled with Next 16; no separate `@vercel/og` install required |
| **Anthropic API** | LLM inference — Sonnet 4.6 generation, Haiku 4.5 grading | `@anthropic-ai/sdk`, held server-side only, API key never leaves Vercel Functions |
| **Proxy/Middleware** | Refresh Supabase session cookie on every request; anonymous → authed migration | Next.js middleware (called `proxy.ts` in Next.js 16, `middleware.ts` in Next.js 14) |

## Recommended Project Structure

```
cluu/
├── app/                              # Next.js App Router
│   ├── (marketing)/
│   │   └── page.tsx                  # Landing, RSC, SEO-friendly
│   ├── play/
│   │   ├── page.tsx                  # RSC: reads session, renders GameClient
│   │   ├── GameClient.tsx            # 'use client' wrapper, dynamic-imports Phaser
│   │   └── layout.tsx
│   ├── library/
│   │   └── page.tsx                  # RSC: server-fetches library_entries
│   ├── auth/
│   │   └── callback/route.ts         # Magic-link callback
│   ├── api/
│   │   ├── encounter/attempt/route.ts   # THE grading gateway
│   │   └── library/export/route.ts      # MD / JSON download
│   ├── og/card/[entryId]/route.tsx   # next/og share card
│   ├── actions/
│   │   ├── player-state.ts           # 'use server' mutations
│   │   ├── library.ts
│   │   └── cosmetics.ts
│   └── layout.tsx
├── middleware.ts                     # Supabase session refresh
│
├── game/                             # ALL Phaser code (never imported from server)
│   ├── index.ts                      # createGame() factory
│   ├── scenes/
│   │   ├── BootScene.ts              # asset preload, splash
│   │   ├── MeadowScene.ts
│   │   ├── VillageScene.ts
│   │   ├── WorkshopScene.ts
│   │   ├── TidePoolsScene.ts
│   │   ├── LibraryScene.ts
│   │   └── UIScene.ts                # HUD rendered in Phaser layer
│   ├── entities/
│   │   ├── Cluu.ts                   # sprite + mood state + cosmetic layers
│   │   ├── PlayerAnchor.ts           # invisible cursor the player drives
│   │   └── Encounter.ts              # base class: plant, chime, NPC
│   ├── systems/
│   │   ├── input.ts                  # touch + keyboard unified
│   │   ├── follow.ts                 # Cluu follows anchor (pet AI)
│   │   ├── mood.ts                   # passive decay, active recovery
│   │   └── audio.ts
│   └── bridge/
│       └── EventBus.ts               # Phaser ↔ React singleton
│
├── ui/                               # React components (client-only overlay)
│   ├── EncounterPanel.tsx            # prompt textarea, streaming response, verdict
│   ├── LibraryBook.tsx
│   ├── Wardrobe.tsx
│   ├── MoodBadge.tsx
│   └── SaveToLibraryOffer.tsx
│
├── lib/                              # Isomorphic / server-only utilities
│   ├── supabase/
│   │   ├── server.ts                 # cookie-bound server client
│   │   ├── client.ts                 # browser client
│   │   └── middleware.ts             # session refresh helper
│   ├── anthropic/
│   │   ├── client.ts                 # SDK init, server-only
│   │   ├── generate.ts               # Sonnet call
│   │   └── grade.ts                  # Haiku call + JSON schema
│   ├── logic-md/
│   │   ├── compile.ts                # @logic-md/core wrapper
│   │   └── types.ts                  # EncounterContract, Verdict
│   ├── rate-limit.ts                 # Upstash Redis wrapper
│   ├── cache.ts                      # prompt-hash lookup
│   ├── sanitize.ts                   # 500 char, strip XML tags
│   └── tags.ts                       # auto-derive tags from encounter
│
├── encounters/                       # ALL .logic.md content
│   ├── meadow/
│   │   ├── withered_sunflower.logic.md
│   │   └── ...
│   ├── village/
│   ├── workshop/
│   ├── tidepools/
│   └── library/
│
├── state/                            # Zustand stores
│   ├── gameStore.ts                  # anchor, mood, active encounter
│   ├── libraryStore.ts               # optimistic entries
│   └── cosmeticStore.ts
│
├── public/
│   ├── sprites/                      # Aseprite exports (32×32 tiles, 48×48 Cluu)
│   ├── audio/
│   └── fonts/
│
├── scripts/
│   ├── grade-test.ts                 # 50-prompt test harness per encounter
│   └── lint-logic-md.ts              # validate all .logic.md before ship
│
└── supabase/
    ├── migrations/
    └── seed.sql                      # cosmetic_catalogue seed
```

### Structure Rationale

- **`game/` is quarantined from `app/`** — Phaser code is never imported from a Server Component, never accidentally bundled into RSC. `GameClient.tsx` is the ONE entry point, and it uses `next/dynamic` with `ssr: false`.
- **`ui/` vs `game/` is the Phaser↔React seam** — anything drawn by Phaser lives in `game/`, anything drawn by the DOM lives in `ui/`. The EncounterPanel is DOM (textarea, streaming text) — NOT a Phaser overlay. This is the single biggest architectural simplification.
- **`encounters/` is content, not code** — treating `.logic.md` files as a content folder means adding a new encounter is a file commit, not a deployment. Authors can write five in an evening (§6.3).
- **`lib/` is server-first** — `lib/anthropic`, `lib/logic-md`, `lib/rate-limit` have `import 'server-only'` at the top. If one accidentally gets pulled into a client bundle, the build fails loudly.
- **`state/` is client-only Zustand** — separated from `lib/` so server code can't accidentally depend on client state.

## Architectural Patterns

### Pattern 1: Phaser mounted via `next/dynamic` (ssr:false)

**What:** The Phaser `Game` instance is constructed inside a client component that Next.js loads only after hydration. Server never sees Phaser. Documented in the official `phaserjs/template-nextjs` template.

**When to use:** Always, for any Phaser in Next.js. Skipping this causes "navigator is undefined" at build time.

**Trade-offs:** +~1 MB to deferred bundle; the player sees a `<canvas>` placeholder for ~100-300ms on first load. Acceptable — Phaser is only needed on `/play`, not on landing, and bundle budget is 2MB initial (§8) which this respects with Turbopack tree-shaking.

```typescript
// app/play/page.tsx — Server Component
import dynamic from 'next/dynamic';
const GameClient = dynamic(() => import('./GameClient'), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

export default async function PlayPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const playerState = user ? await loadPlayerState(user.id) : null;
  return <GameClient initialState={playerState} />;
}

// app/play/GameClient.tsx
'use client';
import { useEffect, useRef } from 'react';
import { createGame } from '@/game';

export default function GameClient({ initialState }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const game = createGame(ref.current!, initialState);
    return () => game.destroy(true);
  }, []);
  return (
    <>
      <div ref={ref} id="phaser-parent" />
      <EncounterPanelMount />   {/* DOM overlay, not Phaser */}
    </>
  );
}
```

### Pattern 2: EventBus for Phaser ↔ React bridge

**What:** A typed pub/sub singleton. Phaser emits events ("encounter:triggered", payload `{encounterId}`); React subscribes in `useEffect` and renders the EncounterPanel. React emits "encounter:verdict" when the server returns; Phaser subscribes and plays the sparkle animation.

**When to use:** Any time the two worlds need to talk. Do NOT put React components inside Phaser, and do NOT render game sprites from React — keep the seam thin.

**Trade-offs:** Adds an indirection, but it's worth it: Phaser's update loop and React's render cycle must not block each other. This pattern is baked into the official Phaser Next.js template.

```typescript
// game/bridge/EventBus.ts
import mitt from 'mitt';
type Events = {
  'encounter:triggered': { encounterId: string };
  'encounter:verdict': { verdict: 'pass' | 'flair' | 'fail'; messaging: string };
  'cluu:mood': { mood: 'stoked' | 'content' | 'sleepy' | 'blue' };
};
export const bus = mitt<Events>();
```

### Pattern 3: Server-authoritative grading gateway

**What:** A single Route Handler owns the entire encounter attempt pipeline. Client sends `{encounterId, userPrompt}`; server returns `{verdict, generatedResponse, assertionResults, librarEligible}`. Anthropic keys never touch the browser.

**When to use:** This is the core contract. Every encounter attempt goes through it. No exceptions, no direct Anthropic calls from the client.

**Trade-offs:** Single choke point = single rate-limit point, single cache point, single audit point — this is a feature, not a bug. Cost: two sequential LLM calls take 3-8 seconds; must stream verdict pieces to keep the player engaged.

```typescript
// app/api/encounter/attempt/route.ts
import 'server-only';
export const runtime = 'nodejs';          // NOT edge — Sonnet generation can exceed Edge limits
export const maxDuration = 60;

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('unauth', { status: 401 });

  const { encounterId, userPrompt } = await req.json();

  // 1. sanitize (500 char, strip XML-like tags)
  const clean = sanitize(userPrompt);

  // 2. rate limit
  const ok = await rateLimit.check(user.id);     // Upstash: 20/day
  if (!ok) return new Response('rate_limited', { status: 429 });

  // 3. cache lookup by prompt hash
  const cached = await cache.get(encounterId, clean);
  if (cached) return Response.json(cached);

  // 4. compile LOGIC.md
  const contract = await compileLogicMd(`encounters/${encounterId}.logic.md`, clean);

  // 5. Sonnet generation
  const generated = await anthropic.generate(contract.generationPrompt);

  // 6. Haiku grading (structured output)
  const verdict = await anthropic.grade(contract.gradingAssertions, clean, generated);

  // 7. persist audit row
  await supabase.from('encounter_attempts').insert({
    user_id: user.id, encounter_id: encounterId,
    prompt_hash: hash(clean), verdict: verdict.overall,
  });

  // 8. cache if pass/flair
  const result = { verdict, generatedResponse: generated, libraryEligible: verdict.overall === 'flair' };
  if (verdict.overall !== 'fail') await cache.set(encounterId, clean, result);

  return Response.json(result);
}
```

### Pattern 4: Optimistic Zustand + debounced Supabase reconciliation

**What:** The Zustand game store is the frame-accurate truth for anchor position, mood display, and cosmetics-equipped — these need to update at 60fps. A debounced (5-second) sync writes to Supabase via a Server Action. On session start, the RSC `/play/page.tsx` fetches Supabase state server-side and hydrates Zustand through `initialState`.

**When to use:** For state that changes every frame (position, animation) OR where a failed sync is recoverable (next tick replaces it). For the Library, use the opposite pattern — server-authoritative first, optimistic UI second, because "I saved it" is a trust moment.

**Trade-offs:** Possible write amplification if player paces endlessly. Mitigation: only sync state that matters (mood, progress, equipped cosmetics), debounce aggressively, and accept that anchor position does NOT need to persist between sessions.

```typescript
// state/gameStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useGameStore = create(persist((set, get) => ({
  anchor: { x: 0, y: 0 },
  mood: 'content',
  equipped: { head: null, body: null, back: null, eyes: null },

  setAnchor: (xy) => set({ anchor: xy }),                        // 60fps, never synced
  setMood: (m) => { set({ mood: m }); queueSync(get()); },       // synced debounced
  equipCosmetic: (slot, id) => {
    const prev = get().equipped;
    set({ equipped: { ...prev, [slot]: id } });                  // optimistic
    equipCosmeticAction(slot, id).catch(() => set({ equipped: prev })); // rollback on fail
  },
}), { name: 'cluu-game' }));   // localStorage for anonymous migration

const queueSync = debounce(async (state) => {
  await updatePlayerStateAction({ mood: state.mood, equipped: state.equipped });
}, 5000);
```

### Pattern 5: LOGIC.md as data, compiler as function

**What:** Every `.logic.md` file is version-controlled content. The compiler is a pure function: `(contractPath, userPrompt) → {generationPrompt, gradingAssertions, rewardMessaging}`. No runtime state. No side effects. Test with fixtures.

**When to use:** Always. The purity of this interface is what makes the grading pipeline testable (`scripts/grade-test.ts` can run the 50-prompt suite per encounter offline without hitting Anthropic for the compile step).

**Trade-offs:** Forces discipline on `.logic.md` authors — no dynamic lookups, no database reads. That discipline is itself a feature: it means encounters stay portable and shareable (v1.3 community authoring).

## Data Flow

### The Encounter Loop (the only flow that really matters)

```
┌─ Player taps withered plant tile ──────────────────────────────────────┐
│   Phaser MeadowScene                                                   │
│   ├─ hit-test tile at pointerdown                                      │
│   └─ bus.emit('encounter:triggered', { encounterId: 'meadow_sunflower'})│
│                             │                                          │
│                             ▼                                          │
│   React EncounterPanelMount (useEffect listener)                       │
│   ├─ setActiveEncounter(encounterId)                                   │
│   └─ renders <EncounterPanel>  (textarea + submit)                     │
│                             │                                          │
│                             ▼ user types, presses submit               │
│   fetch('/api/encounter/attempt', { body: {encounterId, userPrompt}})  │
└────────────────────────┬───────────────────────────────────────────────┘
                         │
                         ▼
┌─ Vercel Node Runtime ─ Grading Gateway ────────────────────────────────┐
│   1. supabase.auth.getUser()                  ── auth guard            │
│   2. sanitize(userPrompt)                     ── 500 chars, strip XML  │
│   3. rateLimit.check(userId)                  ── Upstash, 20/day       │
│   4. cache.get(encounterId, promptHash)       ── short-circuit if hit  │
│   5. compileLogicMd('encounters/.../sunflower.logic.md', cleanPrompt)  │
│   6. anthropic.generate(generationPrompt)     ── Sonnet 4.6, temp 0.7  │
│   7. anthropic.grade(assertions, cleanPrompt, generated)               │
│   8. supabase.insert(encounter_attempts, {audit row, no raw prompt})   │
│   9. if overall !== 'fail': cache.set(...)                             │
│  10. return {verdict, generatedResponse, libraryEligible}              │
└────────────────────────┬───────────────────────────────────────────────┘
                         │
                         ▼
┌─ Browser receives response ────────────────────────────────────────────┐
│   EncounterPanel renders verdict card with rewardMessaging             │
│   bus.emit('encounter:verdict', { verdict: 'flair', messaging: ... })  │
│                             │                                          │
│   Phaser MeadowScene subscriber                                        │
│   ├─ swap plant sprite (withered → thriving)                           │
│   ├─ spawn 3 bee sprites with tween                                    │
│   ├─ play Cluu 'sparkling' animation                                   │
│   └─ bus.emit('cosmetic:unlocked', {id: 'petal_pin'})                  │
│                                                                        │
│   React SaveToLibraryOffer                                             │
│   ├─ appears because libraryEligible === true                          │
│   └─ on accept: server action savePromptToLibrary(...)                 │
│                             │                                          │
│   Server Action (Supabase insert with RLS)                             │
│   ├─ library_entries insert                                            │
│   ├─ user_cosmetics insert (petal_pin)                                 │
│   └─ player_state update (meadow.completed_encounters++)               │
│                                                                        │
│   Zustand libraryStore optimistically pushed + mood bumped to 'stoked' │
└────────────────────────────────────────────────────────────────────────┘
```

### State Management Flows

**Anonymous → Authed migration (Week 1 critical path):**
```
Anonymous play
   Zustand (persist middleware) → localStorage key 'cluu-game'
       ↓ player clicks "Sign in with email"
   Magic link sent → /auth/callback/route.ts
       ↓ session cookie set (Supabase: anonymous user upgraded via updateUser({email}))
   Client reads localStorage → POSTs migrateAnonState action
       ↓ server action
   Supabase: INSERT player_state, library_entries from payload
       ↓
   localStorage cleared, Zustand refreshed from server
```

**Session start (authed):**
```
/play page.tsx (RSC)
   ├─ createServerClient() → getUser()
   ├─ SELECT player_state, user_cosmetics WHERE user_id = auth.uid()
   └─ <GameClient initialState={...} />       (passed as prop, hydrates Zustand)
```

**In-session writes (debounced):**
```
Zustand mutation (setMood, equipCosmetic, advanceProgress)
   ↓ debounce 5s
Server Action 'updatePlayerState'
   ↓ cookie-bound Supabase client
UPDATE player_state SET ... WHERE user_id = auth.uid()   (RLS)
```

## Suggested Build Order (5 Coarse Phases)

This collapses the design doc's 24 weekly sprints (§12) into five component groupings, ordered so the riskiest integration — the grading gateway — is proven in Phase 2 and all content work in Phases 3-4 rides on a solid pipe.

### Phase 1: Scaffold (the skeleton has bones)
**Weeks 1-2 equivalent. De-risks nothing novel — just stack alignment.**

- Next.js project deployed to Vercel at `cluu.game` (see STACK.md for version decision)
- Supabase project, migrations for all 5 tables (§9), RLS policies
- Supabase `@supabase/ssr` wiring: browser client, server client, middleware session refresh
- Magic-link auth end-to-end: landing → email → callback → session
- Phaser `Game` dynamically imported in `/play`, one MeadowScene with a grass tile and a Cluu sprite
- Anchor movement (touch + WASD), Cluu follows anchor (basic pet AI)
- Zustand store with localStorage persist, anonymous → authed migration action

**Exit gate:** Anonymous user loads `/play`, walks Cluu around on grass, signs in with magic link, state persists. No encounters yet. Nothing grading.

### Phase 2: Walking Skeleton — The One Encounter (the project lives or dies here)
**Week 3 equivalent but budget 2 weeks.** *This is the critical path.*

- `@logic-md/core` integrated, `lib/logic-md/compile.ts` with tests
- `lib/anthropic/{generate,grade}.ts` with Sonnet + Haiku wrappers, API key env-var
- Upstash Redis account, `lib/rate-limit.ts`, `lib/cache.ts`
- `lib/sanitize.ts` (500-char cap, XML tag strip)
- `POST /api/encounter/attempt` route handler (Pattern 3 above) — full pipeline
- `encounters/meadow/withered_sunflower.logic.md` as spec'd in §6.1
- Phaser: one tappable plant sprite, emits `encounter:triggered`
- React: `EncounterPanel` component, textarea, submits to `/api/encounter/attempt`, renders streaming verdict
- EventBus (`game/bridge/EventBus.ts`) — the Phaser ↔ React seam
- Phaser verdict reaction: swap sprite, spawn bee, Cluu sparkle animation
- `scripts/grade-test.ts` — 50-prompt test harness for the Sunflower encounter, >95% agreement target (§13)

**Exit gate:** End-to-end: player taps plant, writes "a tall sunflower with cracked stem just about to bloom", sees the response stream, the plant revives visually, the verdict shows "Flair". Cost per attempt measured. Grading test suite green. **If this phase works, the rest of the project is execution. If it doesn't, nothing else matters.**

### Phase 3: Meadow Content + Persistence Loop (proving the engine scales)
**Weeks 4-8 equivalent. ~5 weeks.**

- Save/load to Supabase: `updatePlayerState` action, debounced Zustand sync (Pattern 4)
- `SaveToLibraryOffer` component, `savePromptToLibrary` action, `library_entries` flow
- In-game `LibraryBook` UI (React overlay, not Phaser)
- Library export: Markdown generator, JSON generator, `/api/library/export` route
- Cluu mood system: all four passive states, Curious + Sparkling in-encounter, 4 cosmetic slots rendered (head/body/back/eyes as sprite layers)
- Cosmetic seed data, `user_cosmetics` grant flow, Wardrobe UI
- 6 more Meadow encounters (7 total), each with `.logic.md` + sprite + grading test
- Mood transition animations, day-night cycle visual
- First alpha: 5-10 friends

**Exit gate:** Meadow arc playable end-to-end. Library Markdown export opens cleanly in Obsidian. Mood transitions feel right. Attention here is on *content production velocity* — can you author a new encounter in ~4 hours? If not, fix the authoring path before Phase 4.

### Phase 4: Remaining Biomes + Share Cards (content at scale)
**Weeks 9-20 equivalent. ~12 weeks, the longest phase.**

- Village biome: tileset, NPC dialogue system (React overlay, not Phaser), 6 Request encounters
- Workshop biome: tileset, structured-output parsing (Contract mechanic's grading asserts JSON shape), 6 Contract encounters
- Tide Pools biome: tileset, tool inventory UI, tool-description coupling, 6 Tool encounters
- Library biome: 4 capstone meta-encounters
- Share card system: `/og/card/[entryId]/route.tsx` using `next/og`, 1200×630 PNG
- PNG library export path
- Second alpha (week ~13 equivalent): 20-50 testers, session-length telemetry via PostHog

**Scope flex gate (§12 slippage budget):** If behind at the midpoint of this phase, drop Tide Pools to v1.1. Village + Workshop + Library capstone is still a shippable arc.

### Phase 5: Launch Hardening (making it feel like a product)
**Weeks 21-24 equivalent. ~4 weeks.**

- Performance pass: 60fps on iPhone SE 2020, bundle <2MB initial (audit with `@next/bundle-analyzer`; Phaser lazy-loaded is fine)
- Onboarding polish: first-5-minutes feels magical, first encounter completion without instructions
- Sentry wired in, PostHog events defined (no raw prompts without opt-in — POPIA)
- Rate-limit tuning from beta load data
- Public beta launch, HN/Twitter/Discord
- Public launch

## Critical Paths and Risk Annotations

| Component | Risk | Rationale |
|-----------|------|-----------|
| **Grading Gateway** | **HIGH** | Novel pipeline. Two LLM calls, rate limiting, cache, LOGIC.md compile — all must work together. **Build and prove this in Phase 2 before touching content.** |
| **LOGIC.md compiler + assertion grading reliability** | **HIGH** | §13 flags ≥95% human/Haiku agreement as a ship gate. Every new encounter needs a 50-prompt test pass. Budget for grading-prompt tuning will be real. |
| **Phaser ↔ React EventBus** | MEDIUM | Pattern is documented in official template, but the seam gets chatty. Keep it narrow; resist the urge to route every UI interaction through it. |
| **Anonymous → Authed state migration** | MEDIUM | Easy to get wrong; must not lose library entries or cosmetic grants. Write an integration test. |
| **Zustand ↔ Supabase reconciliation** | MEDIUM | Debounce tuning + rollback on server error. Avoid write amplification. Don't sync anchor position (ever). |
| **Input sanitization + grader injection resistance** | MEDIUM | §13 flags as a real risk. Grader system prompt must explicitly ignore meta-instructions. Test with 20+ known jailbreak patterns before Phase 4 alpha. |
| **Phaser bundle size** | LOW | `ssr:false` dynamic import keeps it off the landing page. Only loads on `/play`. |
| **Supabase auth in App Router** | LOW | `@supabase/ssr` is the current official path. Pattern is stable and documented. |
| **Magic link deliverability** | LOW | Supabase handles it. Use own SMTP by Phase 5 (branded, better deliverability). |
| **`next/og` share cards** | LOW | Bundled with Next 16, simple template, well-trodden pattern. |

## Cross-Cutting Concerns

| Concern | Where It Attaches | Notes |
|---------|-------------------|-------|
| **Auth** | `middleware.ts` (session refresh) + `supabase.auth.getUser()` at every server entry point | Never trust `getSession()` in Server Components — must call `getUser()` for server-side validation |
| **Rate limiting** | Grading gateway ONLY (20/day/user). NOT on server actions — those are cheap | Upstash Redis sliding window; key = `ratelimit:{userId}:{YYYY-MM-DD}` |
| **Caching** | Grading gateway, keyed on `sha256(encounterId + normalizedPrompt)` | 7-day TTL. Only cache pass/flair results — failed attempts may be retried productively |
| **Sanitization** | First step in grading gateway + server-side on any free-text field | 500-char max, strip `<...>` tags, no markdown injection into the grader system prompt |
| **Analytics (PostHog)** | Client-side for UX events (encounter_triggered, library_exported), server-side for cost events (anthropic_tokens_used) | NEVER log raw prompts unless user has explicit opt-in toggle. POPIA requirement. |
| **Error tracking (Sentry)** | `app/global-error.tsx` on client, wrapping all `/api/*` handlers on server | Tag errors with biome + encounterId for grading-pipeline triage |
| **RLS policies** | Every Supabase table | `user_id = auth.uid()` on every read/write; `cosmetic_catalogue` is readable by all authed users |
| **Secrets** | Anthropic key, Supabase service role key, Upstash tokens in Vercel env vars only | Never in `NEXT_PUBLIC_*`. Enforce via `import 'server-only'` at the top of `lib/anthropic/*`. |
| **Idempotency** | Library save action takes `{entryId, userId, encounterId, promptHash}` — duplicate inserts become no-ops | Prevents double-save on retry |

## Client / Server / LLM Split

| Runs in… | Responsibilities |
|----------|------------------|
| **Browser (Phaser + React)** | All rendering, input, animations, mood display, cosmetic compositing, EncounterPanel UI, Library UI, optimistic state, session cookie storage |
| **Vercel Node Functions (Fluid Compute)** | Auth validation, LOGIC.md compilation, Anthropic orchestration, rate-limit enforcement, cache lookup, Supabase writes, analytics batching |
| **Anthropic infrastructure** | Sonnet generation, Haiku grading. That's it. No fine-tuning, no embeddings, no RAG in v1. |
| **Upstash Redis** | Rate-limit counters, prompt-hash cache |
| **Supabase Postgres** | Durable state: users, player_state, library_entries, cosmetics, encounter_attempts audit log |

## Integration Points

| Boundary | Pattern | Notes |
|----------|---------|-------|
| **Phaser ↔ React UI** | EventBus (mitt or custom typed pub/sub) | Keep events narrow (~6-8 total). Phaser emits world events; React emits user decisions |
| **React ↔ Server Actions** | `'use server'` functions, typed by plain TypeScript types | No REST in between. Use Route Handlers only when streaming or external-facing |
| **Client ↔ Grading Gateway** | `fetch('/api/encounter/attempt')` with JSON body, streams back verdict chunks | HTTP because the response is potentially a stream; Server Actions stream awkwardly |
| **Server ↔ Anthropic** | `@anthropic-ai/sdk`, server-only import | Two sequential calls (generate then grade); consider `Promise.allSettled` for observability |
| **Server ↔ Supabase** | `@supabase/ssr` `createServerClient` with cookie handle from `next/headers` | Call `getUser()` not `getSession()` on the server |
| **Server ↔ Upstash** | `@upstash/redis` REST client | Low-latency from Vercel Node |
| **Browser ↔ Supabase (read-side)** | `@supabase/ssr` `createBrowserClient` with same env vars | For realtime cosmetic catalogue updates only; writes should go through Server Actions |
| **LOGIC.md files ↔ compiler** | Pre-compiled at build time (Phase 5 optimization) or filesystem-read at request time (early phases) | Avoid runtime fs reads when possible |
| **Zustand ↔ Supabase** | One-way hydrate on session start (server → client), debounced sync out via Server Actions | Pattern 4 above |
| **Share card generation** | Route handler reads library entry by id + user auth, renders OG image with `next/og` | Plenty of headroom for PNG generation |

## Anti-Patterns to Avoid

### Anti-Pattern 1: Rendering React components inside Phaser

**What people do:** Embed React via `react-dom` portals mounted on Phaser sprites.
**Why it's wrong:** Fights Phaser's render loop, breaks input handling, performance cliff on mobile.
**Do this instead:** Phaser owns the canvas, React owns the DOM overlay. Stack them with CSS. Communicate through the EventBus.

### Anti-Pattern 2: Calling Anthropic from the client

**What people do:** Proxy the Anthropic key through a passthrough route — no sanitization, no rate limit, no cache.
**Why it's wrong:** Keys leak through the browser, no cost control, no abuse prevention, prompt injection lands directly on the grader.
**Do this instead:** The grading gateway (Pattern 3) is the ONLY path from client intent to Anthropic.

### Anti-Pattern 3: Hardcoding encounters

**What people do:** Write encounter logic in TypeScript per-encounter.
**Why it's wrong:** Kills authoring velocity, breaks the dogfooding story for LOGIC.md, makes v1.3 community authoring impossible.
**Do this instead:** Every encounter is a `.logic.md` file. The compiler is generic. The gateway is generic. Content is pure data.

### Anti-Pattern 4: Syncing Zustand to Supabase on every frame

**What people do:** `useEffect(() => { syncToSupabase(state); }, [state])` on the top-level store.
**Why it's wrong:** 60fps × thousands of write attempts per minute = Supabase row contention + rate-limit hits.
**Do this instead:** Only sync state that *matters between sessions* (mood, progress, cosmetics), debounced ~5s. Anchor position is ephemeral.

### Anti-Pattern 5: Trusting `auth.getSession()` in Server Components

**What people do:** Read the session from cookies in an RSC and trust the user id.
**Why it's wrong:** `getSession()` does not re-validate — an expired or forged cookie may appear valid.
**Do this instead:** Always call `supabase.auth.getUser()` in Server Components, Server Actions, and Route Handlers.

### Anti-Pattern 6: Running the grading gateway on Edge runtime

**What people do:** `export const runtime = 'edge'` for "speed."
**Why it's wrong:** Sonnet 4.6 generation can exceed Edge limits; the Anthropic SDK streams cleaner on Node.
**Do this instead:** `runtime = 'nodejs'` (Fluid Compute) with `maxDuration = 60`.

### Anti-Pattern 7: Storing raw prompts in analytics

**What people do:** Send `{event: 'encounter_attempt', prompt: userText}` to PostHog.
**Why it's wrong:** POPIA violation unless the user has opted in. Grader-bypass prompts leak.
**Do this instead:** Analytics sees `{encounterId, verdict, tokensUsed, cached}`. Raw prompts live in `library_entries` (user-initiated save) and ephemeral `encounter_attempts` audit (prompt_hash only by default, full text only if user has opted in).

### Anti-Pattern 8: Making LOGIC.md do too much

**What people do:** Add conditional logic, loops, database reads into `.logic.md` files.
**Why it's wrong:** Breaks purity (anti-dogfooding) and means encounters are no longer portable between players or shareable (v1.3 community authoring).
**Do this instead:** `.logic.md` is declarative: front-matter + markdown + assertions. Any dynamic behavior belongs in the compiler or the gateway, not in content files.

## Scaling Considerations

| Scale | What Breaks | What to Do |
|-------|-------------|------------|
| **0-100 players (v1 launch)** | Nothing. Current architecture is correctly sized. | Ship it. |
| **100-1,000 players** | Anthropic cost sneaks up. Identical-prompt cache hit rate matters. | Monitor cache hit rate; if <30%, normalize prompts (lowercase, whitespace) before hashing. Watch Upstash usage. |
| **1,000-10,000 players** | Cold-start latency on `/api/encounter/attempt` may feel slow; Supabase `encounter_attempts` audit table grows fast. | Consider ISR-ing `/play` for faster TTFB. Archive `encounter_attempts` older than 30 days. |
| **10,000+ players** | Cost becomes real; rate-limit tuning becomes business-critical. | Introduce the "founders' pack" (§13), consider prompt-similarity cache (embeddings), investigate batching grading calls. |

### First bottleneck (almost certainly): Anthropic spend

At 60¢/playthrough × 10,000 playthroughs = $6,000. Cache hit rate and the founders' pack economics determine whether the project breaks even before v1.1 cosmetic DLC ships. Build observability for cost per encounter from Phase 2 onward — tag every Anthropic call with `{encounterId, verdict, cached}` in structured logs.

## Sources

- [phaserjs/template-nextjs](https://github.com/phaserjs/template-nextjs) — official Phaser Next.js template
- [Phaser + Next.js Tutorial](https://generalistprogrammer.com/tutorials/phaser-nextjs-tutorial)
- [Navigator undefined in NextJS — Phaser forum](https://phaser.discourse.group/t/navigator-is-undefined-when-used-with-nextjs/12549)
- [Supabase: Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Supabase: Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- Cluu v1 Design Document (`docs/cluu-v1-design.md`)

---
*Architecture research for: Cluu v1 — browser cozy game with LLM grading engine*
*Researched: 2026-04-20*
