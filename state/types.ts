// state/types.ts
// Shared client-side types for the game store (Plan 01-03).
// CluuMood intentionally re-declared here (and re-imported via lib/supabase/types.ts's CluuMood)
// so client bundles do not pull the server-only Database contract.

export type CluuMood = 'stoked' | 'content' | 'sleepy' | 'blue';

export interface CluuCosmetics {
  head: string | null;
  body: string | null;
  back: string | null;
  eyes: string | null;
}

export interface EncounterResult {
  verdict: 'fail' | 'pass' | 'flair';
  message: string;
}

export interface Anchor {
  x: number;
  y: number;
}

export interface IslandProgress {
  [biome: string]: { completed_encounters: string[]; current_xp: number };
}
