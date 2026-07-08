// state/gameStore.ts
// Store Factory per D-15 and the Zustand Next.js guide
// (https://zustand.docs.pmnd.rs/guides/nextjs).
// NEVER call createStore at module top-level — it will leak between SSR requests
// (STACK.md "Integration gotchas §7", Pitfall 5 adjacent).
// Consumers get the store via useGameStore() from state/StoreProvider.tsx.
import { createStore, type StoreApi } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Anchor, CluuCosmetics, CluuMood, EncounterResult, IslandProgress } from './types';

export const STORAGE_KEY = 'cluu-game-v1';

export interface GameState {
  anchor: Anchor;
  mood: CluuMood;
  cosmetics: CluuCosmetics;
  unlockedBiomes: string[];
  islandProgress: IslandProgress;
  currentEncounterId: string | null;
  encounterResult: EncounterResult | null;
  /** UUID generated on first init; sent with /api/migrate-anonymous (Pitfall 4). */
  migrationIdempotencyKey: string;
}

export interface GameActions {
  setAnchor: (anchor: Anchor) => void;
  setMood: (mood: CluuMood) => void;
  setEquipped: (slot: keyof CluuCosmetics, id: string | null) => void;
  openEncounter: (encounterId: string) => void;
  closeEncounter: () => void;
  setEncounterResult: (result: EncounterResult) => void;
  hydrate: (partial: Partial<GameState>) => void;
  reset: () => void;
}

export type GameStore = GameState & GameActions;

export const DEFAULT_STATE: GameState = {
  anchor: { x: 0, y: 0 },
  mood: 'content', // D-14: Phase 1 single pose
  cosmetics: { head: null, body: null, back: null, eyes: null },
  unlockedBiomes: ['meadow'],
  islandProgress: {},
  currentEncounterId: null,
  encounterResult: null,
  migrationIdempotencyKey: '', // populated in createGameStore if absent
};

function generateKey(): string {
  // crypto.randomUUID is available in Node 19+ and all modern browsers
  // (polyfilled in vitest.setup.ts for jsdom).
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
        openEncounter: (encounterId) => set({ currentEncounterId: encounterId, encounterResult: null }),
        closeEncounter: () => set({ currentEncounterId: null, encounterResult: null }),
        setEncounterResult: (result) => set({ encounterResult: result }),
        hydrate: (partial) => set((s) => ({ ...s, ...partial })),
        reset: () => set({ ...DEFAULT_STATE, migrationIdempotencyKey: generateKey() }),
      }),
      {
        name: STORAGE_KEY,
        // In SSR / non-browser contexts, skip persistence entirely.
        storage: createJSONStorage(() =>
          typeof window !== 'undefined' ? window.localStorage : (undefined as unknown as Storage),
        ),
        // Pattern 4: anchor position never syncs — exclude from the persisted partial.
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
