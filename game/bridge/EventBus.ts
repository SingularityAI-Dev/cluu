// game/bridge/EventBus.ts
// The ONE Phaser<->React seam. Pattern 2 from ARCHITECTURE.md.
// Keep this narrow: add new events only when a genuine cross-boundary signal is needed.
//
// Phase 1 events (more added in Phase 2+):
//   - game:ready               -> Phaser has booted, MeadowScene has created
//   - player:anchor-moved      -> (Plan 05) anchor position changed
//   - cluu:mood                -> (Phase 3) mood changed
import mitt, { type Emitter } from 'mitt';

export type GameEvents = {
  'game:ready': { timestampMs: number };
  'player:anchor-moved': { x: number; y: number };
  'cluu:mood': { mood: 'stoked' | 'content' | 'sleepy' | 'blue' };
};

// Singleton. Module-level in a file only imported from game/ and app/play/GameClient.tsx
// is fine because GameClient is ssr:false — no SSR leak risk.
export const bus: Emitter<GameEvents> = mitt<GameEvents>();
