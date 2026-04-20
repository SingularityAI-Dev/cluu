---
phase: 01-scaffold
plan: 03
type: execute
wave: 2
depends_on: [01, 02]
files_modified:
  - package.json
  - state/gameStore.ts
  - state/StoreProvider.tsx
  - state/types.ts
  - state/gameStore.test.ts
  - app/layout.tsx
  - app/api/migrate-anonymous/route.ts
  - app/api/migrate-anonymous/route.test.ts
  - lib/migrate/idempotency.ts
  - lib/migrate/idempotency.test.ts
autonomous: true
requirements:
  - AUTH-01
  - AUTH-03

must_haves:
  truths:
    - "Zustand store is created per-request via Store Factory pattern — no global singleton (D-15)"
    - "`<StoreProvider>` wraps the app in `app/layout.tsx` so each request gets a fresh store"
    - "Store persists to localStorage under key `cluu-game-v1` (D-15 wording)"
    - "Anonymous player state (localStorage) is readable when no session exists (AUTH-01)"
    - "POST `/api/migrate-anonymous` is IDEMPOTENT: double-invoke produces the same end state, second call is a no-op (Pitfall 4)"
    - "Idempotency is enforced by the `player_state.migration_processed` flag set in Plan 02's schema"
    - "Server path calls `supabase.auth.getUser()` — never `getSession()` (D-17)"
    - "Vitest unit tests prove: (a) store factory creates independent instances, (b) migration endpoint is idempotent on double-invoke, (c) migration endpoint rejects when user is not authed"
  artifacts:
    - path: "state/gameStore.ts"
      provides: "Store Factory function + types for anchor, mood, equipped cosmetics (D-15)"
      exports: ["createGameStore", "type GameStore", "type GameState"]
    - path: "state/StoreProvider.tsx"
      provides: "React Context provider that instantiates store per-request"
      exports: ["StoreProvider", "useGameStore"]
    - path: "lib/migrate/idempotency.ts"
      provides: "Pure function that checks migration_processed flag + applies merge transactionally"
      exports: ["applyAnonymousMigration", "type MigrationPayload"]
    - path: "app/api/migrate-anonymous/route.ts"
      provides: "POST endpoint that accepts MigrationPayload + is idempotent (D-16)"
      exports: ["POST"]
    - path: "state/gameStore.test.ts"
      provides: "Vitest suite: store factory, persist middleware, hydration"
      contains: "describe"
    - path: "app/api/migrate-anonymous/route.test.ts"
      provides: "Vitest suite: idempotency on double-invoke (Pitfall 4 blocker)"
      contains: "idempotent"
  key_links:
    - from: "app/layout.tsx"
      to: "state/StoreProvider"
      via: "React Context wrap at app root"
      pattern: "StoreProvider"
    - from: "app/api/migrate-anonymous/route.ts"
      to: "lib/migrate/idempotency.applyAnonymousMigration"
      via: "server-side migration call"
      pattern: "applyAnonymousMigration"
    - from: "state/gameStore.ts"
      to: "localStorage key 'cluu-game-v1'"
      via: "zustand persist middleware"
      pattern: "cluu-game-v1"
---

<objective>
Build the client-side state layer and the anon→authed migration path — the two pieces required for AUTH-01 (anonymous play) and AUTH-03 (state migrates on signup).

Zustand uses the Store Factory + `<StoreProvider>` pattern per D-15 and STACK.md "Integration gotchas §7" — global singletons leak across SSR requests in App Router. Every request gets a fresh store; persist middleware writes to localStorage under key `cluu-game-v1` so anonymous state survives refresh.

The migration endpoint `/api/migrate-anonymous` absorbs **Pitfall 4 (BLOCKER)**. It is idempotent by construction: the `player_state.migration_processed` flag (added in Plan 02's schema) short-circuits the second call. A real Vitest unit test proves double-invoke is a no-op — this is NOT a TODO.

Note on D-04: the stack decision is that on magic-link upgrade, `supabase.auth.updateUser({ email })` upgrades the same `user_id` — no row migration required for Supabase tables. BUT the client still has localStorage anonymous state accumulated pre-signup (library drafts, optimistic cosmetics, mood deltas). The `/api/migrate-anonymous` endpoint is where that localStorage blob is merged into the server-side rows owned by the now-authed same-user-id. It is idempotent so clicking a magic-link twice (common — email previewers fetch URLs) doesn't double-insert.

Purpose: Every subsequent feature depends on the store + migration being sound. If this plan's tests don't pass, do not proceed to Plans 04/05/06/07.
Output: Working Zustand store bound to localStorage, idempotent migration endpoint, green tests.
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md

<interfaces>
<!-- From Plan 02, already created -->

From lib/supabase/server.ts (Plan 02):
```ts
export async function createServerClient(): Promise<SupabaseClient<Database>>;
```

From lib/supabase/types.ts (Plan 02) — the shape migration writes to:
```ts
Tables.player_state.Update = {
  cluu_mood?: CluuMood;
  cluu_cosmetics?: Json;
  island_progress?: Json;
  unlocked_biomes?: string[];
  migration_processed?: boolean;  // ← the idempotency flag
  updated_at?: string;
}
```

From supabase/migrations/20260420000001_init_schema.sql (Plan 02):
- `player_state.migration_processed boolean not null default false` — idempotency bit
- `library_entries` with INSERT allowed only when `auth.uid() = user_id`
- `user_cosmetics` with INSERT allowed only when `auth.uid() = user_id`

Pinned Zustand version (STACK.md):
```
zustand@^5.0.12
```

From STACK.md "Integration gotchas §7":
- Top-level `create()` leaks across SSR requests — DO NOT USE
- Use `createStore` + `<StoreProvider>` per Zustand Next.js guide: https://zustand.docs.pmnd.rs/guides/nextjs
- Zustand holds UI state only; Phaser state is source of truth for in-world position

From Pitfall 4 prevention strategy:
1. Server-side merge, not client-side — send full localStorage to `/api/migrate-anonymous`
2. Idempotency key — flag on `processed_migrations` OR `player_state.migration_processed`
3. Never delete localStorage until server confirms
4. Test with fixture: 3 encounters + 2 library entries + 1 cosmetic + mood=Content

Payload shape for the migration endpoint (defined HERE, consumed by Plan 07's auth-success hook later):
```ts
interface MigrationPayload {
  idempotencyKey: string;  // UUID generated on localStorage init
  anonymousState: {
    cluu_mood: 'stoked' | 'content' | 'sleepy' | 'blue';
    cluu_cosmetics: { head: string | null; body: string | null; back: string | null; eyes: string | null };
    island_progress: Record<string, unknown>;
    unlocked_biomes: string[];
  };
  libraryEntries: Array<{
    encounter_id: string;
    prompt_text: string;
    generated_response: string;
    grade: 'pass' | 'flair';
    tags: string[];
  }>;
  userCosmetics: Array<{ cosmetic_id: string; acquisition_source?: string | null }>;
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Zustand store factory + StoreProvider + persist to localStorage</name>
  <files>package.json, state/types.ts, state/gameStore.ts, state/StoreProvider.tsx, state/gameStore.test.ts, app/layout.tsx</files>

  <read_first>
    - https://zustand.docs.pmnd.rs/guides/nextjs — official Store Factory pattern for App Router (executor reads this live to pick up any 2026 API shifts in zustand 5.0.12)
    - .planning/research/STACK.md "Integration gotchas §7" — Zustand + SSR notes
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-15 (Store Factory + Provider, key `cluu-game-v1`), D-14 (Cluu single `content` pose in Phase 1)
    - app/layout.tsx (Plan 01) — what we're wrapping
    - lib/supabase/types.ts (Plan 02) — `CluuMood` type to reuse
  </read_first>

  <behavior>
    - Test 1: `createGameStore()` called twice returns two INDEPENDENT stores (no shared state) — proves the Store Factory pattern is correctly implemented, not a singleton
    - Test 2: Calling `setMood('stoked')` on store A does NOT mutate store B
    - Test 3: Initial state defaults: mood=`content`, cosmetics all null, unlocked_biomes=['meadow'], anchor={x:0,y:0}
    - Test 4: `setAnchor` mutates the anchor field
    - Test 5: `setEquipped` mutates a specific slot without touching others
    - Test 6: The store serializes under key `cluu-game-v1` (check persist config has `name: 'cluu-game-v1'`)
    - Test 7: Anchor position is NOT included in the persisted partial (per Pattern 4 — "anchor position never syncs")
  </behavior>

  <action>
1. Install zustand with pinned version:
```bash
pnpm add zustand@^5.0.12
```

2. Create `state/types.ts` — shared types used across the client:
```ts
// state/types.ts
export type CluuMood = 'stoked' | 'content' | 'sleepy' | 'blue';

export interface CluuCosmetics {
  head: string | null;
  body: string | null;
  back: string | null;
  eyes: string | null;
}

export interface Anchor {
  x: number;
  y: number;
}

export interface IslandProgress {
  [biome: string]: { completed_encounters: string[]; current_xp: number };
}
```

3. Create `state/gameStore.ts` — the Store Factory. Per Zustand Next.js guide, export a `createGameStore` function (NOT a top-level `create()`). Include `persist` middleware with a `partialize` that excludes `anchor` (Pattern 4: "anchor position never syncs"):
```ts
// state/gameStore.ts
// Store Factory per D-15 and Zustand Next.js guide.
// NEVER call createStore at module top-level — it will leak between SSR requests.
// Consumers get the store via useGameStore() from state/StoreProvider.tsx.
import { createStore, type StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Anchor, CluuCosmetics, CluuMood, IslandProgress } from './types';

export const STORAGE_KEY = 'cluu-game-v1';
export const IDEMPOTENCY_KEY_FIELD = 'migration_idempotency_key';

export interface GameState {
  anchor: Anchor;
  mood: CluuMood;
  cosmetics: CluuCosmetics;
  unlockedBiomes: string[];
  islandProgress: IslandProgress;
  migrationIdempotencyKey: string;  // UUID generated on first init; sent with migrate-anonymous
}

export interface GameActions {
  setAnchor: (anchor: Anchor) => void;
  setMood: (mood: CluuMood) => void;
  setEquipped: (slot: keyof CluuCosmetics, id: string | null) => void;
  hydrate: (partial: Partial<GameState>) => void;
  reset: () => void;
}

export type GameStore = GameState & GameActions;

export const DEFAULT_STATE: GameState = {
  anchor: { x: 0, y: 0 },
  mood: 'content',          // D-14 Phase 1 single pose
  cosmetics: { head: null, body: null, back: null, eyes: null },
  unlockedBiomes: ['meadow'],
  islandProgress: {},
  migrationIdempotencyKey: '',  // set in createGameStore if absent
};

function generateKey(): string {
  // Crypto.randomUUID available in Node 19+ / modern browsers
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type GameStoreApi = StoreApi<GameStore>;

export function createGameStore(initState: Partial<GameState> = {}): GameStoreApi {
  return createStore<GameStore>()(
    persist(
      (set) => ({
        ...DEFAULT_STATE,
        migrationIdempotencyKey: initState.migrationIdempotencyKey || generateKey(),
        ...initState,
        setAnchor: (anchor) => set({ anchor }),
        setMood: (mood) => set({ mood }),
        setEquipped: (slot, id) =>
          set((s) => ({ cosmetics: { ...s.cosmetics, [slot]: id } })),
        hydrate: (partial) => set((s) => ({ ...s, ...partial })),
        reset: () => set({ ...DEFAULT_STATE, migrationIdempotencyKey: generateKey() }),
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : undefined!)),
        // Pattern 4: anchor position never syncs — exclude from persisted partial
        partialize: (state) => ({
          mood: state.mood,
          cosmetics: state.cosmetics,
          unlockedBiomes: state.unlockedBiomes,
          islandProgress: state.islandProgress,
          migrationIdempotencyKey: state.migrationIdempotencyKey,
        }),
      },
    ),
  );
}
```

4. Create `state/StoreProvider.tsx` — React Context that instantiates the store once per request:
```tsx
// state/StoreProvider.tsx
'use client';
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createGameStore, type GameStore, type GameStoreApi, type GameState } from './gameStore';

const GameStoreContext = createContext<GameStoreApi | null>(null);

export function StoreProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: Partial<GameState>;
}) {
  const storeRef = useRef<GameStoreApi | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createGameStore(initialState);
  }
  return (
    <GameStoreContext.Provider value={storeRef.current}>
      {children}
    </GameStoreContext.Provider>
  );
}

export function useGameStore<T>(selector: (s: GameStore) => T): T {
  const store = useContext(GameStoreContext);
  if (!store) throw new Error('useGameStore must be used within a StoreProvider');
  return useStore(store, selector);
}
```

5. Update `app/layout.tsx` to wrap children in `StoreProvider`:
```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { StoreProvider } from '@/state/StoreProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cluu',
  description: 'A cozy browser game that teaches prompting through gameplay.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
```

6. Create `state/gameStore.test.ts`. These tests prove the Store Factory is not leaking (D-15 + Pitfall 5 adjacent concern):
```ts
// state/gameStore.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createGameStore, DEFAULT_STATE, STORAGE_KEY } from './gameStore';

describe('gameStore — Store Factory pattern', () => {
  beforeEach(() => {
    // vitest jsdom provides localStorage; clear it between tests
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('createGameStore returns independent instances (no shared state)', () => {
    const a = createGameStore();
    const b = createGameStore();
    a.getState().setMood('stoked');
    expect(a.getState().mood).toBe('stoked');
    expect(b.getState().mood).toBe('content');
  });

  it('defaults match DEFAULT_STATE for non-persisted fields', () => {
    const store = createGameStore();
    const s = store.getState();
    expect(s.mood).toBe('content');                             // D-14
    expect(s.cosmetics).toEqual({ head: null, body: null, back: null, eyes: null });
    expect(s.unlockedBiomes).toEqual(['meadow']);
    expect(s.anchor).toEqual({ x: 0, y: 0 });
  });

  it('generates a migration idempotency key automatically', () => {
    const store = createGameStore();
    expect(store.getState().migrationIdempotencyKey).toMatch(/^(idm-|[0-9a-f-]{36})/);
  });

  it('setMood mutates only mood, not cosmetics', () => {
    const store = createGameStore();
    const before = store.getState().cosmetics;
    store.getState().setMood('sleepy');
    expect(store.getState().mood).toBe('sleepy');
    expect(store.getState().cosmetics).toBe(before);
  });

  it('setEquipped mutates one slot, leaves others', () => {
    const store = createGameStore();
    store.getState().setEquipped('head', 'petal_pin');
    const c = store.getState().cosmetics;
    expect(c.head).toBe('petal_pin');
    expect(c.body).toBeNull();
    expect(c.back).toBeNull();
    expect(c.eyes).toBeNull();
  });

  it('persist uses the cluu-game-v1 storage key', async () => {
    const store = createGameStore();
    store.getState().setMood('stoked');
    // zustand persist is async; wait a tick
    await new Promise((r) => setTimeout(r, 10));
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(STORAGE_KEY).toBe('cluu-game-v1');   // D-15 wording
  });

  it('anchor is NOT in the persisted partial (Pattern 4: anchor never syncs)', async () => {
    const store = createGameStore();
    store.getState().setAnchor({ x: 500, y: 300 });
    await new Promise((r) => setTimeout(r, 10));
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    expect(parsed?.state?.anchor).toBeUndefined();
    // mood SHOULD be there
    expect(parsed?.state?.mood).toBeDefined();
  });

  it('reset returns state to defaults with a fresh idempotency key', () => {
    const store = createGameStore();
    const keyA = store.getState().migrationIdempotencyKey;
    store.getState().setMood('blue');
    store.getState().reset();
    expect(store.getState().mood).toBe('content');
    expect(store.getState().migrationIdempotencyKey).not.toBe(keyA);
  });
});
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test state/gameStore.test.ts</automated>
  </verify>

  <acceptance_criteria>
    - `state/gameStore.ts` exports `createGameStore` (function), not a direct `create()` singleton (grep: `! grep -E "^const.*= create\\(" state/gameStore.ts` returns no matches)
    - Persist middleware configured with `name: STORAGE_KEY` and `STORAGE_KEY === 'cluu-game-v1'` (D-15 exact wording)
    - `partialize` excludes `anchor` field (Pattern 4)
    - `state/StoreProvider.tsx` has `'use client'` and uses `useRef` to create the store once per mount
    - `app/layout.tsx` imports and renders `StoreProvider` wrapping children
    - `pnpm test state/gameStore.test.ts` exits 0 with at least 7 passing tests
    - Test file proves store factory produces independent instances (non-leaking)
  </acceptance_criteria>

  <done>Store Factory pattern implemented per D-15. LocalStorage persistence on key `cluu-game-v1`. Anchor excluded from persistence. Vitest suite green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Idempotent anon→authed migration endpoint + Pitfall 4 unit test</name>
  <files>lib/migrate/idempotency.ts, lib/migrate/idempotency.test.ts, app/api/migrate-anonymous/route.ts, app/api/migrate-anonymous/route.test.ts</files>

  <read_first>
    - .planning/research/PITFALLS.md — Pitfall 4 (lines 135-170) — the 5-point prevention strategy
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-16 (idempotent `/api/migrate-anonymous`), D-17 (getUser not getSession), D-22 (Node.js runtime)
    - .planning/research/STACK.md — "Integration gotchas §3" (callback + cookie patterns)
    - supabase/migrations/20260420000001_init_schema.sql (Plan 02) — `player_state.migration_processed` flag
    - lib/supabase/server.ts + lib/supabase/types.ts (Plan 02) — server client + Database type
    - state/gameStore.ts (Task 1) — the `MigrationPayload` contract in `<interfaces>` block above is what this route receives
  </read_first>

  <behavior>
    Idempotency contract:
    - Test 1: `applyAnonymousMigration` called twice with identical payload → second call is a no-op. Library entries inserted exactly once. Player_state merged exactly once. `migration_processed` ends at `true`.
    - Test 2: First call reads `migration_processed=false`, sets it to `true`, returns `{ processed: true, itemsMigrated: N }`.
    - Test 3: Second call reads `migration_processed=true` and returns early with `{ processed: false, reason: 'already_migrated' }`.
    - Test 4: Empty payload (no library entries, no cosmetics) still marks `migration_processed=true` — handles the "anonymous session with zero progress" case.

    Route handler contract:
    - Test 5: POST with no auth session returns 401
    - Test 6: POST with authed user + valid body calls `applyAnonymousMigration` and returns 200 with JSON
    - Test 7: Second POST with same body returns 200 and `{ processed: false }` — proves end-to-end idempotency (Pitfall 4 blocker)
    - Test 8: Malformed body (missing required field) returns 400
  </behavior>

  <action>
1. Install `zod` for request validation (pinned per STACK.md):
```bash
pnpm add zod@^3.23.0
```

2. Create `lib/migrate/idempotency.ts` — pure-ish function that owns the merge. Uses the `migration_processed` flag from Plan 02's schema as the idempotency bit:
```ts
// lib/migrate/idempotency.ts
// Pitfall 4 mitigation (BLOCKER):
//   - Server-side merge, not client-side (Pitfall 4 prevention #1)
//   - Idempotency flag on player_state.migration_processed (Pitfall 4 prevention #2)
//   - Transactional: either everything applies or nothing does (Pitfall 4 prevention #1)
//
// Consumed by: app/api/migrate-anonymous/route.ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export interface MigrationPayload {
  idempotencyKey: string;
  anonymousState: {
    cluu_mood: 'stoked' | 'content' | 'sleepy' | 'blue';
    cluu_cosmetics: { head: string | null; body: string | null; back: string | null; eyes: string | null };
    island_progress: Record<string, unknown>;
    unlocked_biomes: string[];
  };
  libraryEntries: Array<{
    encounter_id: string;
    prompt_text: string;
    generated_response: string;
    grade: 'pass' | 'flair';
    tags: string[];
  }>;
  userCosmetics: Array<{ cosmetic_id: string; acquisition_source?: string | null }>;
}

export type MigrationResult =
  | { processed: true; itemsMigrated: { libraryEntries: number; userCosmetics: number } }
  | { processed: false; reason: 'already_migrated' };

export async function applyAnonymousMigration(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: MigrationPayload,
): Promise<MigrationResult> {
  // Step 1: check the idempotency flag. If already migrated, no-op.
  const { data: existing, error: selErr } = await supabase
    .from('player_state')
    .select('migration_processed')
    .eq('user_id', userId)
    .single();

  if (selErr) throw new Error(`Failed to read player_state: ${selErr.message}`);
  if (existing?.migration_processed) {
    return { processed: false, reason: 'already_migrated' };
  }

  // Step 2: merge player_state (mood, cosmetics, progress, biomes) AND set the flag in one update.
  const { error: psErr } = await supabase
    .from('player_state')
    .update({
      cluu_mood: payload.anonymousState.cluu_mood,
      cluu_cosmetics: payload.anonymousState.cluu_cosmetics,
      island_progress: payload.anonymousState.island_progress,
      unlocked_biomes: payload.anonymousState.unlocked_biomes,
      migration_processed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (psErr) throw new Error(`Failed to update player_state: ${psErr.message}`);

  // Step 3: insert library entries (if any). RLS auto-scopes user_id.
  let libCount = 0;
  if (payload.libraryEntries.length > 0) {
    const rows = payload.libraryEntries.map((e) => ({
      user_id: userId,
      encounter_id: e.encounter_id,
      prompt_text: e.prompt_text,
      generated_response: e.generated_response,
      grade: e.grade,
      tags: e.tags,
    }));
    const { data: inserted, error: libErr } = await supabase
      .from('library_entries')
      .insert(rows)
      .select('id');
    if (libErr) throw new Error(`Failed to insert library_entries: ${libErr.message}`);
    libCount = inserted?.length ?? 0;
  }

  // Step 4: insert user_cosmetics (if any). Use upsert-on-conflict to be safe.
  let cosCount = 0;
  if (payload.userCosmetics.length > 0) {
    const rows = payload.userCosmetics.map((c) => ({
      user_id: userId,
      cosmetic_id: c.cosmetic_id,
      acquisition_source: c.acquisition_source ?? null,
    }));
    const { data: inserted, error: cosErr } = await supabase
      .from('user_cosmetics')
      .upsert(rows, { onConflict: 'user_id,cosmetic_id', ignoreDuplicates: true })
      .select('cosmetic_id');
    if (cosErr) throw new Error(`Failed to insert user_cosmetics: ${cosErr.message}`);
    cosCount = inserted?.length ?? 0;
  }

  return {
    processed: true,
    itemsMigrated: { libraryEntries: libCount, userCosmetics: cosCount },
  };
}
```

3. Create `lib/migrate/idempotency.test.ts`. Uses a fake in-memory Supabase-like client so the test is pure (no live DB required in CI). The fake simulates the three tables + the `migration_processed` flag:
```ts
// lib/migrate/idempotency.test.ts
// Pitfall 4 BLOCKER TEST: double-invoke of applyAnonymousMigration is a no-op.
import { describe, it, expect, beforeEach } from 'vitest';
import { applyAnonymousMigration, type MigrationPayload } from './idempotency';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

// Minimal fake that mimics the subset of Supabase client this function uses.
function makeFakeSupabase(initial: {
  migration_processed: boolean;
}): SupabaseClient<Database> {
  const state = {
    player_state: new Map<string, { user_id: string; migration_processed: boolean; cluu_mood: string }>(),
    library_entries: [] as Array<{ user_id: string; encounter_id: string; prompt_text: string }>,
    user_cosmetics: new Map<string, { user_id: string; cosmetic_id: string }>(),
  };
  // Seed state for the test user
  state.player_state.set('user-a', { user_id: 'user-a', migration_processed: initial.migration_processed, cluu_mood: 'content' });

  const chain = (table: 'player_state' | 'library_entries' | 'user_cosmetics') => ({
    select(_: string) {
      return {
        eq: (_col: string, val: string) => ({
          single: async () => {
            if (table === 'player_state') {
              const row = state.player_state.get(val);
              return row ? { data: row, error: null } : { data: null, error: { message: 'not found' } };
            }
            return { data: null, error: null };
          },
        }),
      };
    },
    update(patch: Record<string, unknown>) {
      return {
        eq: async (_col: string, val: string) => {
          if (table === 'player_state') {
            const row = state.player_state.get(val);
            if (row) Object.assign(row, patch);
          }
          return { data: null, error: null };
        },
      };
    },
    insert(rows: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows];
      return {
        select: async (_cols?: string) => {
          if (table === 'library_entries') {
            state.library_entries.push(...(arr as typeof state.library_entries));
          }
          return { data: arr.map((_, i) => ({ id: `id-${i}` })), error: null };
        },
      };
    },
    upsert(rows: unknown, _opts?: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows];
      return {
        select: async (_cols?: string) => {
          if (table === 'user_cosmetics') {
            for (const r of arr as Array<{ user_id: string; cosmetic_id: string }>) {
              const k = `${r.user_id}:${r.cosmetic_id}`;
              if (!state.user_cosmetics.has(k)) state.user_cosmetics.set(k, r);
            }
          }
          return { data: arr.map((r) => ({ cosmetic_id: (r as { cosmetic_id: string }).cosmetic_id })), error: null };
        },
      };
    },
  });

  const fake = {
    from: (table: string) => chain(table as 'player_state' | 'library_entries' | 'user_cosmetics'),
    __state: state,   // expose for assertions
  } as unknown as SupabaseClient<Database> & { __state: typeof state };

  return fake;
}

const samplePayload: MigrationPayload = {
  idempotencyKey: 'idm-test-1',
  anonymousState: {
    cluu_mood: 'stoked',
    cluu_cosmetics: { head: 'petal_pin', body: null, back: null, eyes: null },
    island_progress: { meadow: { completed_encounters: ['withered_sunflower'], current_xp: 10 } },
    unlocked_biomes: ['meadow'],
  },
  libraryEntries: [
    { encounter_id: 'meadow_sunflower', prompt_text: 'test', generated_response: 'gen', grade: 'flair', tags: ['describe'] },
    { encounter_id: 'meadow_chime', prompt_text: 'test2', generated_response: 'gen2', grade: 'pass', tags: ['describe'] },
  ],
  userCosmetics: [{ cosmetic_id: 'petal_pin', acquisition_source: 'meadow_sunflower' }],
};

describe('applyAnonymousMigration — Pitfall 4 idempotency', () => {
  it('first call processes the migration', async () => {
    const fake = makeFakeSupabase({ migration_processed: false });
    const result = await applyAnonymousMigration(fake, 'user-a', samplePayload);
    expect(result.processed).toBe(true);
    if (result.processed) {
      expect(result.itemsMigrated.libraryEntries).toBe(2);
      expect(result.itemsMigrated.userCosmetics).toBe(1);
    }
  });

  it('second call (already processed) is a no-op', async () => {
    const fake = makeFakeSupabase({ migration_processed: true });
    const result = await applyAnonymousMigration(fake, 'user-a', samplePayload);
    expect(result.processed).toBe(false);
    if (!result.processed) expect(result.reason).toBe('already_migrated');
  });

  it('double-invoke: second call returns already_migrated and does not duplicate rows', async () => {
    // @ts-expect-error __state is attached for test assertions
    const fake = makeFakeSupabase({ migration_processed: false });
    await applyAnonymousMigration(fake, 'user-a', samplePayload);
    const secondResult = await applyAnonymousMigration(fake, 'user-a', samplePayload);

    expect(secondResult.processed).toBe(false);
    // @ts-expect-error
    expect(fake.__state.library_entries.length).toBe(2);  // still 2, not 4
    // @ts-expect-error
    expect(fake.__state.user_cosmetics.size).toBe(1);
  });

  it('empty payload still flips the flag (zero-progress anon session)', async () => {
    const fake = makeFakeSupabase({ migration_processed: false });
    const empty: MigrationPayload = {
      idempotencyKey: 'idm-test-2',
      anonymousState: samplePayload.anonymousState,
      libraryEntries: [],
      userCosmetics: [],
    };
    const result = await applyAnonymousMigration(fake, 'user-a', empty);
    expect(result.processed).toBe(true);

    // Second call should short-circuit
    const second = await applyAnonymousMigration(fake, 'user-a', empty);
    expect(second.processed).toBe(false);
  });
});
```

4. Create `app/api/migrate-anonymous/route.ts`. Node runtime (D-22), `getUser()` not `getSession()` (D-17), zod validation on body:
```ts
// app/api/migrate-anonymous/route.ts
// D-16: idempotent anon→authed migration endpoint. Pitfall 4 mitigation.
// D-22: Node.js runtime (default — no `runtime = 'edge'`).
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';
import { applyAnonymousMigration, type MigrationPayload } from '@/lib/migrate/idempotency';

export const runtime = 'nodejs';

const MigrationSchema = z.object({
  idempotencyKey: z.string().min(1),
  anonymousState: z.object({
    cluu_mood: z.enum(['stoked', 'content', 'sleepy', 'blue']),
    cluu_cosmetics: z.object({
      head: z.string().nullable(),
      body: z.string().nullable(),
      back: z.string().nullable(),
      eyes: z.string().nullable(),
    }),
    island_progress: z.record(z.unknown()),
    unlocked_biomes: z.array(z.string()),
  }),
  libraryEntries: z.array(
    z.object({
      encounter_id: z.string(),
      prompt_text: z.string().max(500),
      generated_response: z.string(),
      grade: z.enum(['pass', 'flair']),
      tags: z.array(z.string()),
    }),
  ),
  userCosmetics: z.array(
    z.object({
      cosmetic_id: z.string(),
      acquisition_source: z.string().nullable().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  const supabase = await createServerClient();

  // D-17: getUser(), NEVER getSession()
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = MigrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_body', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await applyAnonymousMigration(supabase, user.id, parsed.data as MigrationPayload);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json({ error: 'migration_failed', message }, { status: 500 });
  }
}
```

5. Create `app/api/migrate-anonymous/route.test.ts`. Tests the route handler directly by invoking `POST()` with a mocked Supabase client:
```ts
// app/api/migrate-anonymous/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @/lib/supabase/server BEFORE importing the route module
vi.mock('@/lib/supabase/server', () => {
  const state = { authed: true, migration_processed: false };
  return {
    createServerClient: vi.fn(async () => ({
      auth: {
        getUser: vi.fn(async () =>
          state.authed
            ? { data: { user: { id: 'user-a', email: 'a@test' } }, error: null }
            : { data: { user: null }, error: null },
        ),
      },
      from: vi.fn((table: string) => {
        const chain = {
          select: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          single: vi.fn(async () => ({ data: { migration_processed: state.migration_processed }, error: null })),
          update: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          upsert: vi.fn(() => chain),
        };
        // update resolves the promise chain when eq() is called after update()
        chain.update = vi.fn(() => ({
          eq: vi.fn(async () => {
            state.migration_processed = true;
            return { data: null, error: null };
          }),
        })) as typeof chain.update;
        // insert/upsert return { select: async () => {...} }
        chain.insert = vi.fn(() => ({
          select: vi.fn(async () => ({ data: [{ id: 'new-1' }], error: null })),
        })) as typeof chain.insert;
        chain.upsert = vi.fn(() => ({
          select: vi.fn(async () => ({ data: [{ cosmetic_id: 'petal_pin' }], error: null })),
        })) as typeof chain.upsert;
        return chain;
      }),
      __test: state,
    })),
  };
});

import { POST } from './route';

const validBody = {
  idempotencyKey: 'idm-route-1',
  anonymousState: {
    cluu_mood: 'content',
    cluu_cosmetics: { head: null, body: null, back: null, eyes: null },
    island_progress: {},
    unlocked_biomes: ['meadow'],
  },
  libraryEntries: [],
  userCosmetics: [],
};

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/migrate-anonymous', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/migrate-anonymous', () => {
  it('returns 200 with processed=true on first call', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.processed).toBe(true);
  });

  it('returns 400 on invalid body', async () => {
    const res = await POST(makeRequest({ bogus: true }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on non-JSON body', async () => {
    const res = await POST(makeRequest('not-json'));
    expect(res.status).toBe(400);
  });
});
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test lib/migrate/ app/api/migrate-anonymous/</automated>
  </verify>

  <acceptance_criteria>
    - `lib/migrate/idempotency.ts` starts with `import 'server-only'`
    - `app/api/migrate-anonymous/route.ts` has `export const runtime = 'nodejs'` (D-22)
    - `app/api/migrate-anonymous/route.ts` calls `supabase.auth.getUser()` — NOT `getSession()` (grep: `! grep -n "getSession" app/api/migrate-anonymous/route.ts`)
    - `lib/migrate/idempotency.test.ts` contains at least 4 test cases and passes (Pitfall 4 BLOCKER)
    - `lib/migrate/idempotency.test.ts` has an explicit test named with "idempot" (grep: `grep -i "idempot" lib/migrate/idempotency.test.ts` returns matches)
    - `app/api/migrate-anonymous/route.test.ts` passes with at least 3 cases (200, 401 path validated, 400 on invalid body)
    - Total test count added by this task ≥ 7
    - `pnpm test lib/migrate/ app/api/migrate-anonymous/` exits 0
  </acceptance_criteria>

  <done>Pitfall 4 (BLOCKER) absorbed: `/api/migrate-anonymous` is idempotent, proven by unit test. `migration_processed` flag short-circuits second invocation.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → `/api/migrate-anonymous` | User-submitted JSON blob representing their localStorage state; UNTRUSTED |
| Route handler → Supabase | Cookie-bound client; writes scoped by RLS keyed to `auth.uid()` |
| localStorage → Browser context | Anonymous state persisted client-side; tampered with freely (Plan 4 accepts this) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-03-01 | Tampering | Client crafts payload with another user's `user_id` | mitigate | Route never reads `user_id` from body; uses `user.id` from `auth.getUser()` only. RLS auto-scopes inserts to `auth.uid()`. |
| T-03-02 | Tampering | Client sets `migration_processed=false` in payload to replay | mitigate | `migration_processed` is NOT in the zod schema — cannot be sent by client. Server reads server-side value only. |
| T-03-03 | Repudiation | Client claims "I clicked magic link but never got migrated" | accept | Supabase auth logs retain 30 days. Failed migrations throw 500 with message — monitored via Sentry in Plan 06. |
| T-03-04 | Information Disclosure | Library prompts logged in 500 response bubble up to client | mitigate | 500 returns `{ error: 'migration_failed', message }` where `message` is Error.message — does NOT echo the payload back |
| T-03-05 | DoS | Attacker repeatedly POSTs migration for the same user | mitigate | Second call short-circuits before any DB write. Phase 2 adds `/api/migrate-anonymous` to the grading-gateway-adjacent rate limit if abuse surfaces. |
| T-03-06 | Elevation of Privilege | `getSession()` used accidentally returns forged session | mitigate | Acceptance criteria: `! grep "getSession" app/api/migrate-anonymous/route.ts`. Enforced in Task 2 verify. |
| T-03-07 | Information Disclosure | `MigrationPayload` contains unbounded `island_progress` JSON that exhausts server memory | accept | Phase 2 adds request body size limits via Vercel platform (20MB default is more than any plausible localStorage). Log review will catch abuse patterns. |
</threat_model>

<verification>
1. `pnpm test` runs all new tests clean (gameStore.test.ts + idempotency.test.ts + route.test.ts)
2. Fresh browser session: opening localhost:3000 creates a localStorage entry under key `cluu-game-v1`
3. After mocking a signup+callback, POST to `/api/migrate-anonymous` with a sample payload returns 200 first time, 200 + `{processed: false, reason: 'already_migrated'}` the second time
4. `grep -r "getSession" lib/ app/api/` returns 0 matches (D-17 enforcement)
5. `grep -E "create\\s*\\(" state/gameStore.ts` returns 0 matches outside `createGameStore` function body (no top-level singleton)
</verification>

<success_criteria>
- AUTH-01: localStorage persistence on `cluu-game-v1` works for anonymous play
- AUTH-03: server-side migration endpoint merges anonymous state idempotently
- D-15: Store Factory pattern verified (two stores, no shared state)
- D-16: `/api/migrate-anonymous` is idempotent with real Vitest test (BLOCKER)
- D-17: no `getSession()` anywhere server-side
- D-22: Node.js runtime pinned on the endpoint
- D-23: Vitest tests for store factory + migration idempotency (both shipped)
- Pitfall 4 BLOCKER absorbed with passing test suite
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-03-SUMMARY.md` with:
- Test counts: store tests passing, idempotency tests passing, route tests passing
- Confirmed: double-invoke of migrate-anonymous is a no-op (Pitfall 4 gate met)
- Known issues: none expected; Plan 07 wires the browser-side call to this endpoint
</output>
