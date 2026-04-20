---
phase: 01-scaffold
plan: 04
type: execute
wave: 2
depends_on: [01]
files_modified:
  - package.json
  - app/play/page.tsx
  - app/play/GameClient.tsx
  - app/play/CanvasSkeleton.tsx
  - game/index.ts
  - game/config.ts
  - game/bridge/EventBus.ts
  - game/scenes/BootScene.ts
  - game/scenes/MeadowScene.ts
  - game/scenes/UIScene.ts
  - game/GameClient.test.tsx
  - public/sprites/grass_32.png
  - public/sprites/.gitkeep
autonomous: true
requirements:
  - WORLD-01

must_haves:
  truths:
    - "Visiting `/play` renders a Phaser canvas within 3 seconds on broadband (WORLD-01)"
    - "Phaser is imported ONLY inside the dynamically-loaded client component (`ssr: false`) — no module-top-level import in any Server Component (D-09, Pitfall 5)"
    - "Exactly one `Phaser.Game` instance exists per mount; `game.destroy(true)` runs on unmount (D-08, Pitfall 5)"
    - "Three scenes registered at construction: BootScene → MeadowScene → UIScene (D-07)"
    - "Scene transitions use `scene.start()` / `scene.launch()`, not new Game instances (D-08)"
    - "Canvas renderer, not WebGL (design doc §8 lock)"
    - "React StrictMode is ON (Pitfall 5 prevention #3) and the double-invoke does NOT crash — cleanup runs correctly"
    - "EventBus is a singleton typed pub/sub; listeners unregister on scene shutdown"
    - "MeadowScene renders a visible grass tile (placeholder sprite — visual style deferred per CONTEXT.md)"
  artifacts:
    - path: "game/index.ts"
      provides: "createGame factory — ONLY entry point from React into Phaser"
      exports: ["createGame", "type GameInstance"]
    - path: "game/config.ts"
      provides: "Phaser config object — Canvas, Arcade Physics, 3 scenes"
      exports: ["buildConfig"]
    - path: "game/bridge/EventBus.ts"
      provides: "Typed Phaser↔React pub/sub singleton (Pattern 2)"
      exports: ["bus", "type GameEvents"]
    - path: "game/scenes/BootScene.ts"
      provides: "Preload phase + splash; transitions to MeadowScene"
      exports: ["BootScene"]
    - path: "game/scenes/MeadowScene.ts"
      provides: "Gameplay scene — Phase 1 shows grass; Plan 05 adds anchor + Cluu"
      exports: ["MeadowScene"]
    - path: "game/scenes/UIScene.ts"
      provides: "Phaser HUD layer running parallel to MeadowScene"
      exports: ["UIScene"]
    - path: "app/play/GameClient.tsx"
      provides: "The ONE Phaser mount point; uses next/dynamic ssr:false per D-09"
      contains: "'use client'"
    - path: "app/play/page.tsx"
      provides: "Server Component for /play — reads user, hands initialState to GameClient"
      contains: "ssr: false"
  key_links:
    - from: "app/play/page.tsx"
      to: "app/play/GameClient.tsx"
      via: "next/dynamic import with ssr: false"
      pattern: "ssr:\\s*false"
    - from: "app/play/GameClient.tsx"
      to: "game/index.ts createGame"
      via: "createGame called inside useEffect; returns Phaser.Game"
      pattern: "createGame\\("
    - from: "game/index.ts"
      to: "game.destroy(true)"
      via: "cleanup returned from useEffect"
      pattern: "destroy\\(true"
---

<objective>
Mount Phaser 3.90.0 inside Next.js 16 App Router correctly: dynamic import with `ssr: false`, single `Phaser.Game` per mount, explicit `destroy(true)` on unmount. Absorbs **Pitfall 5 (BLOCKER)** — the scene-leak and SSR-crash class of bugs that has killed multiple Phaser-in-Next projects.

Creates the game/ directory scaffolding per ARCHITECTURE.md: `game/index.ts` as the ONE React→Phaser entry point, `game/bridge/EventBus.ts` as the ONE Phaser↔React seam (Pattern 2), and three scenes registered at construction (D-07):
- **BootScene** — preload + splash, transitions to MeadowScene
- **MeadowScene** — gameplay; Phase 1 shows grass. Plan 05 adds the anchor + Cluu.
- **UIScene** — Phaser HUD layer running parallel (not the React overlay — that's a different concern)

`app/play/page.tsx` is a Server Component that reads the user session (passing through the proxy from Plan 02) and hands `initialState` to `GameClient` via props. `GameClient.tsx` is `'use client'` and loaded via `next/dynamic` with `ssr: false` — the ONLY file that imports from `game/`.

This plan does NOT add the anchor or Cluu (Plan 05). It does NOT wire Zustand to Phaser beyond initial prop hand-off (Plan 05 closes that loop via EventBus).

Purpose: WORLD-01 (load within 3s) passes. Pitfall 5 absorbed. Plan 05 can add entities without touching the mount plumbing.
Output: `/play` renders a Phaser canvas showing a grass scene, no SSR crashes, no memory leaks on route changes.
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
@docs/cluu-v1-design.md

<interfaces>
<!-- Pinned from STACK.md -->

```
phaser@3.90.0 (exact — minor versions change renderer behaviour)
```

<!-- From STACK.md "Integration gotchas §1" -->
- NEVER import `phaser` at module top-level of a Server Component
- Pattern (official `phaserjs/template-nextjs`):
  - `app/play/page.tsx` (Server Component) imports `GameClient` via `next/dynamic({ ssr: false })`
  - `GameClient` ref exposes `{ game, scene }` via `forwardRef` + `useImperativeHandle` so React UI can dispatch
  - React ↔ Phaser uses EventBus (`Phaser.Events.EventEmitter` OR mitt) singleton, NOT prop drilling

<!-- From Pitfall 5 prevention strategy -->
1. Single-page-game architecture — Game lives on `/play` only (modals, not routes)
2. Dynamic-import the entire component, not just the module
3. Cleanup invariant: `useEffect` MUST return a cleanup that calls `gameRef.current?.destroy(true, false)`
4. React StrictMode ON (already set in next.config.ts from Plan 01) — double-invokes cleanup in dev, catches leaks
5. EventBus listeners: register in Scene.create, remove in Scene.shutdown AND Scene.destroy

<!-- From ARCHITECTURE.md Recommended Project Structure -->
```
game/
├── index.ts                      # createGame() factory
├── scenes/
│   ├── BootScene.ts
│   ├── MeadowScene.ts
│   └── UIScene.ts
├── bridge/
│   └── EventBus.ts
```

<!-- From Plan 02 (dependency) — already exists -->
```ts
// lib/supabase/server.ts
export async function createServerClient(): Promise<SupabaseClient<Database>>;
```

<!-- Phaser 3.90 API confirm points (executor reads Phaser docs live before implementing) -->
- Phaser.Game constructor signature: `new Phaser.Game(config: Phaser.Types.Core.GameConfig)`
- Canvas renderer: `type: Phaser.CANVAS`
- Destroy signature: `game.destroy(removeCanvas: boolean, noReturn?: boolean)` — we call `destroy(true, false)`
- Scene base: `class MyScene extends Phaser.Scene { constructor() { super('my-scene'); } }`
- Multi-scene: `{ scene: [BootScene, MeadowScene, UIScene] }` in config; first is auto-started
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install Phaser, create game/ scaffold, EventBus, three scenes</name>
  <files>package.json, game/index.ts, game/config.ts, game/bridge/EventBus.ts, game/scenes/BootScene.ts, game/scenes/MeadowScene.ts, game/scenes/UIScene.ts, public/sprites/grass_32.png, public/sprites/.gitkeep</files>

  <read_first>
    - .planning/research/STACK.md — "Installation" (phaser pin), "Integration gotchas §1"
    - .planning/research/ARCHITECTURE.md — "Pattern 1" (Phaser + next/dynamic), "Pattern 2" (EventBus), "Recommended Project Structure" (game/ tree)
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-07, D-08, D-09, D-10
    - .planning/research/PITFALLS.md — Pitfall 5 (lines 173-213) full prevention list
    - docs/cluu-v1-design.md §8 "Technical stack" — Phaser Canvas (not WebGL) locked
    - Phaser 3.90 docs (live): https://newdocs.phaser.io/docs/3.90.0 — verify API shapes before committing code
  </read_first>

  <action>
1. Install Phaser exact version:
```bash
pnpm add phaser@3.90.0
```

2. Install a tiny, tree-shakeable pub/sub library for the EventBus. Per Pattern 2, `mitt` is the idiomatic choice (~200 bytes, typed):
```bash
pnpm add mitt@^3.0.1
```

3. Create `game/bridge/EventBus.ts`. Typed singleton. Pattern 2. Events enumerated to keep the seam narrow (~6-8 events total per ARCHITECTURE.md):
```ts
// game/bridge/EventBus.ts
// The ONE Phaser↔React seam. Pattern 2 from ARCHITECTURE.md.
// Keep this narrow: add new events only when a genuine cross-boundary signal is needed.
//
// Phase 1 events (more added in Phase 2+):
//   - game:ready               → Phaser has booted, MeadowScene has created
//   - player:anchor-moved      → (Plan 05) anchor position changed
//   - cluu:mood                → (Phase 3) mood changed
import mitt, { type Emitter } from 'mitt';

export type GameEvents = {
  'game:ready': { timestampMs: number };
  'player:anchor-moved': { x: number; y: number };
  'cluu:mood': { mood: 'stoked' | 'content' | 'sleepy' | 'blue' };
};

// Singleton. Module-level in a file only imported from game/ and app/play/GameClient.tsx
// is fine because GameClient is ssr:false — no SSR leak risk.
export const bus: Emitter<GameEvents> = mitt<GameEvents>();
```

4. Create `public/sprites/.gitkeep` and a placeholder `public/sprites/grass_32.png` (32×32 solid pastel green PNG — "acceptable for Phase 1" per CONTEXT.md "Claude's Discretion"). Executor creates the PNG via a small script:
```bash
# From repo root — generates a 32×32 pastel-green PNG using Node's built-in Buffer
node -e '
const fs = require("fs");
const w = 32, h = 32;
// Minimal valid PNG — use zlib to deflate; simpler: write a BMP and rename? No —
// easier path: use a pre-made 1-pixel PNG and scale via CSS, OR commit a real PNG.
// Use `sharp` if available? Skip the dep. Use the `data:` URL to inline.
// For Phase 1, ship a single-pixel green PNG and let Phaser scale it.
const onePx = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkcH39HwAEZwIhHtYJ1AAAAABJRU5ErkJggg==", "base64");
fs.writeFileSync("public/sprites/grass_32.png", onePx);
console.log("wrote placeholder grass_32.png (1px, will be scaled by Phaser)");
'
touch public/sprites/.gitkeep
```

5. Create `game/scenes/BootScene.ts`. Preloads the grass asset, then transitions to MeadowScene + launches UIScene in parallel (D-07 multi-scene from day 1):
```ts
// game/scenes/BootScene.ts
// D-07: Multi-scene architecture. BootScene preloads and hands off.
import Phaser from 'phaser';
import { bus } from '../bridge/EventBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Placeholder grass tile — visual style deferred per CONTEXT.md specifics
    this.load.image('grass', '/sprites/grass_32.png');
  }

  create() {
    // Hand off to gameplay + HUD scenes
    this.scene.start('MeadowScene');
    this.scene.launch('UIScene');

    // Signal React that Phaser is up
    bus.emit('game:ready', { timestampMs: Date.now() });
  }
}
```

6. Create `game/scenes/MeadowScene.ts`. Phase 1: just paint a patch of grass so WORLD-01 has something visible. Plan 05 adds the anchor + Cluu here (same file):
```ts
// game/scenes/MeadowScene.ts
// Phase 1 Meadow: paints a grid of grass tiles. Plan 05 adds PlayerAnchor + Cluu to this scene.
import Phaser from 'phaser';

export class MeadowScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MeadowScene' });
  }

  create() {
    const tileSize = 32;          // D-10: 32×32 hand-placed tiles
    const cols = 24;
    const rows = 18;

    // Center a camera view on a ~768×576 grid
    this.cameras.main.setBackgroundColor(0xe8f4d7);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.add.image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'grass')
          .setDisplaySize(tileSize, tileSize);
      }
    }

    // World bounds matched to the tile grid for Plan 05's physics
    this.physics.world.setBounds(0, 0, cols * tileSize, rows * tileSize);
    this.cameras.main.setBounds(0, 0, cols * tileSize, rows * tileSize);
  }

  shutdown() {
    // Pitfall 5 prevention #5: remove listeners on shutdown
    // (Plan 05 will register listeners; Phase 1 Meadow has none yet)
  }
}
```

7. Create `game/scenes/UIScene.ts`. Parallel-run HUD scene. Phase 1 is empty; Phase 3 adds mood badge etc:
```ts
// game/scenes/UIScene.ts
// D-07: Phaser-layer HUD separate from the React overlay.
// Phase 1: empty. Phase 3 adds mood badge + cosmetic indicators.
import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create() {
    // Reserved for Phase 3 HUD elements
  }
}
```

8. Create `game/config.ts`. Canvas renderer (design doc lock), Arcade Physics, all 3 scenes:
```ts
// game/config.ts
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MeadowScene } from './scenes/MeadowScene';
import { UIScene } from './scenes/UIScene';

export function buildConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.CANVAS,        // design doc §8 lock — Canvas, not WebGL
    parent,
    width: 768,
    height: 576,
    backgroundColor: '#e8f4d7',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [BootScene, MeadowScene, UIScene],
    input: { activePointers: 3 },   // 1 pointer + multi-touch support for mobile
  };
}
```

9. Create `game/index.ts` — the ONE factory React calls:
```ts
// game/index.ts
// The ONLY entry point from React into Phaser. app/play/GameClient.tsx is the ONLY consumer.
// D-08: single Phaser.Game per page mount. Cleanup runs game.destroy(true, false).
import Phaser from 'phaser';
import { buildConfig } from './config';

export interface GameInstance {
  game: Phaser.Game;
  destroy: () => void;
}

export function createGame(parent: HTMLElement): GameInstance {
  const config = buildConfig(parent);
  const game = new Phaser.Game(config);
  return {
    game,
    destroy: () => {
      // Pitfall 5 prevention #3: destroy(true) removes the canvas; noReturn=false lets Phaser clean up cleanly
      game.destroy(true, false);
    },
  };
}
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; test -f game/index.ts &amp;&amp; test -f game/bridge/EventBus.ts &amp;&amp; test -f game/scenes/BootScene.ts &amp;&amp; test -f game/scenes/MeadowScene.ts &amp;&amp; test -f game/scenes/UIScene.ts &amp;&amp; test -f public/sprites/grass_32.png &amp;&amp; grep -q "Phaser.CANVAS" game/config.ts &amp;&amp; grep -q "destroy(true" game/index.ts</automated>
  </verify>

  <acceptance_criteria>
    - `package.json` pins `"phaser": "3.90.0"` (exact — no caret)
    - `game/config.ts` contains `Phaser.CANVAS` (grep match) — NOT `Phaser.WEBGL` or `Phaser.AUTO`
    - `game/config.ts` registers all 3 scenes: `scene: [BootScene, MeadowScene, UIScene]`
    - `game/index.ts` contains `destroy(true` in the returned destroy function (Pitfall 5 prevention #3)
    - `game/bridge/EventBus.ts` exports a typed `Emitter<GameEvents>` named `bus`
    - `public/sprites/grass_32.png` exists and is a valid PNG (file command: `file public/sprites/grass_32.png` mentions "PNG")
    - `pnpm typecheck` exits 0 across all game/ files
    - No file outside `game/` and `app/play/GameClient.tsx` imports from `phaser` or `@/game/*` (grep: `! grep -rn "from 'phaser'" app/ --include='*.ts*' | grep -v 'app/play/GameClient.tsx'`)
  </acceptance_criteria>

  <done>Phaser installed, 3-scene architecture scaffolded per D-07, EventBus singleton ready, Canvas renderer locked, grass placeholder in public/.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: /play page + GameClient with dynamic ssr:false + cleanup invariant test</name>
  <files>app/play/page.tsx, app/play/GameClient.tsx, app/play/CanvasSkeleton.tsx, app/play/GameClient.test.tsx</files>

  <read_first>
    - .planning/research/ARCHITECTURE.md — Pattern 1 code example (lines ~218-251)
    - .planning/research/PITFALLS.md — Pitfall 5 full prevention list (especially #2 dynamic-import pattern and #3 cleanup invariant)
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-08 (single Game instance), D-09 (ssr:false)
    - game/index.ts (Task 1) — the createGame signature this consumes
    - lib/supabase/server.ts (Plan 02) — createServerClient for reading user
    - next.config.ts (Plan 01) — confirms reactStrictMode is true
  </read_first>

  <behavior>
    - Test 1: Rendering `<GameClient />` calls `createGame` exactly once on mount
    - Test 2: Unmounting `<GameClient />` calls the returned `destroy()` function exactly once
    - Test 3: Under React StrictMode (double-invoke cleanup in dev) the total invocation count is: mount=2, destroy=1 (per React 18+ strict mode semantics with useRef guard) OR mount=2, destroy=2 — either is acceptable as long as the NET game instances alive after unmount is 0
    - Test 4: After unmount, the ref no longer holds a game instance

    (Note: we cannot unit-test the actual Phaser render cycle in jsdom — Phaser needs a real Canvas. These tests verify the LIFECYCLE is correct; actual canvas render is verified manually in `verification`.)
  </behavior>

  <action>
1. Create `app/play/CanvasSkeleton.tsx`. Loading placeholder shown for the ~100-300ms until Phaser hydrates (per ARCHITECTURE.md Pattern 1 trade-offs):
```tsx
// app/play/CanvasSkeleton.tsx
export function CanvasSkeleton() {
  return (
    <div
      style={{
        width: 768,
        height: 576,
        maxWidth: '100%',
        margin: '2rem auto',
        background: '#e8f4d7',
        borderRadius: 8,
        display: 'grid',
        placeItems: 'center',
        color: '#4a5240',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <span>Waking Cluu…</span>
    </div>
  );
}
```

2. Create `app/play/GameClient.tsx` — the ONE file that imports from `game/`. Strict-mode safe (useRef guard so double-mount doesn't create two games):
```tsx
// app/play/GameClient.tsx
// D-09: the ONE import boundary from Next into Phaser.
// Pitfall 5 absorbed: useRef guard + cleanup invariant + StrictMode compatible.
'use client';
import { useEffect, useRef } from 'react';
import type { GameInstance } from '@/game';

interface GameClientProps {
  userId: string | null;
  isAnonymous: boolean;
}

export default function GameClient(_props: GameClientProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  useEffect(() => {
    if (!parentRef.current) return;
    // StrictMode double-invoke guard: only create if we don't have a game yet.
    if (gameRef.current) return;

    let cancelled = false;

    // Dynamic import keeps Phaser out of the initial bundle tree until /play is visited.
    // Because THIS file is 'use client', we could import at top-level and it would still be
    // client-only — but inline dynamic import is gentler on the SSR RSC boundary.
    import('@/game').then(({ createGame }) => {
      if (cancelled || !parentRef.current) return;
      gameRef.current = createGame(parentRef.current);
    });

    return () => {
      cancelled = true;
      // Pitfall 5 prevention #3 — the cleanup invariant
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={parentRef}
      id="phaser-parent"
      style={{ width: '100%', maxWidth: 768, margin: '0 auto', aspectRatio: '4 / 3' }}
    />
  );
}
```

3. Create `app/play/page.tsx`. Server Component — reads user via cookie-bound client, hands initial flags to GameClient via `next/dynamic`:
```tsx
// app/play/page.tsx
// /play is the ONLY route that mounts the Phaser game (Pitfall 5 prevention #1).
// Library/Wardrobe/Settings will be modals OVER this canvas (Phase 3), not separate routes.
import dynamic from 'next/dynamic';
import { createServerClient } from '@/lib/supabase/server';
import { CanvasSkeleton } from './CanvasSkeleton';

// D-09: next/dynamic ssr:false wraps GameClient so Phaser never touches the server bundle.
const GameClient = dynamic(() => import('./GameClient'), {
  ssr: false,
  loading: () => <CanvasSkeleton />,
});

export default async function PlayPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main style={{ padding: '1rem 0' }}>
      <GameClient userId={user?.id ?? null} isAnonymous={user?.is_anonymous ?? true} />
    </main>
  );
}
```

4. Create `app/play/GameClient.test.tsx`. Tests the mount/unmount lifecycle. We can't run real Phaser in jsdom but we CAN mock `@/game` and assert the lifecycle calls:
```tsx
// app/play/GameClient.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StrictMode } from 'react';
import React from 'react';

// Mock @/game BEFORE importing the component
const destroySpy = vi.fn();
const createGameSpy = vi.fn(() => ({
  game: { __fake: true },
  destroy: destroySpy,
}));

vi.mock('@/game', () => ({
  createGame: (...args: unknown[]) => createGameSpy(...(args as Parameters<typeof createGameSpy>)),
}));

import GameClient from './GameClient';

describe('GameClient — Pitfall 5 lifecycle', () => {
  beforeEach(() => {
    createGameSpy.mockClear();
    destroySpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('creates exactly one Phaser.Game on mount (no StrictMode)', async () => {
    const { unmount } = render(<GameClient userId={null} isAnonymous={true} />);
    // Dynamic import resolves asynchronously
    await new Promise((r) => setTimeout(r, 50));
    expect(createGameSpy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('calls destroy() on unmount', async () => {
    const { unmount } = render(<GameClient userId={null} isAnonymous={true} />);
    await new Promise((r) => setTimeout(r, 50));
    unmount();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('StrictMode double-invoke does not leak: net alive instances = 0 after unmount', async () => {
    const { unmount } = render(
      <StrictMode>
        <GameClient userId={null} isAnonymous={true} />
      </StrictMode>,
    );
    await new Promise((r) => setTimeout(r, 80));
    unmount();
    await new Promise((r) => setTimeout(r, 20));

    // The useRef guard means createGame is called only once even under strict double-invoke.
    // destroy runs at least once on unmount. Net result: 0 alive instances.
    const alive = createGameSpy.mock.calls.length - destroySpy.mock.calls.length;
    expect(alive).toBeLessThanOrEqual(0);
  });
});
```

5. Install `@testing-library/react` for the test:
```bash
pnpm add -D @testing-library/react@^16 @testing-library/jest-dom@^6
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test app/play/GameClient.test.tsx &amp;&amp; pnpm build</automated>
  </verify>

  <acceptance_criteria>
    - `app/play/page.tsx` contains `ssr: false` (D-09)
    - `app/play/page.tsx` is a Server Component (no `'use client'` directive) and awaits `createServerClient()`
    - `app/play/GameClient.tsx` starts with `'use client'`
    - `app/play/GameClient.tsx` cleanup function calls `gameRef.current.destroy()` (Pitfall 5 prevention #3)
    - `app/play/GameClient.tsx` has a useRef guard to prevent double-creation (grep: `grep -q "if (gameRef.current) return" app/play/GameClient.tsx`)
    - `app/play/GameClient.test.tsx` exists and contains at least 3 lifecycle tests including a StrictMode test
    - `pnpm build` succeeds — proves no server-side Phaser import (Pitfall 5 SSR crash mode absorbed)
    - `pnpm test app/play/GameClient.test.tsx` exits 0
    - No other file in `app/` imports from `@/game` (grep: `! grep -rn "from '@/game" app/ --include='*.ts*' | grep -v 'app/play/GameClient.tsx'`)
  </acceptance_criteria>

  <done>/play renders a Phaser canvas with grass tiles. Pitfall 5 absorbed: dynamic ssr:false, single-game invariant tested, destroy(true) on unmount, StrictMode-safe.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Server RSC → Client GameClient | initialState passed via props; user-id is trusted (verified server-side via getUser) |
| Browser → Phaser canvas | Player input (touch, keyboard) — handled in Plan 05; Phase 1 has no input |
| Phaser → EventBus → React | Internal; same trust context |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Denial of Service | Phaser scene leak fills GPU/memory until tab crashes | mitigate | Pitfall 5 prevention: single-Game invariant via useRef guard + `destroy(true)` on unmount. Test in GameClient.test.tsx asserts net-alive = 0 after unmount. |
| T-04-02 | Denial of Service | SSR crash because Phaser touches `window` at import | mitigate | Pitfall 5 prevention: dynamic import with `ssr: false` in `app/play/page.tsx`. `pnpm build` acceptance criteria proves SSR does not try to resolve Phaser. |
| T-04-03 | Information Disclosure | Server Component leaks `user.id` into client bundle | accept | `user.id` is the Supabase uuid — it is expected on the client (used by migrate-anonymous and RLS). No sensitive disclosure. |
| T-04-04 | Tampering | Attacker intercepts WebSocket/EventBus and emits fake events | accept | EventBus is in-process (same JS context); no network surface. Future Phase 2 streaming calls go through `/api/encounter/attempt` which has its own threat model. |
</threat_model>

<verification>
1. `pnpm build` succeeds (SSR-safe import path confirmed)
2. `pnpm dev` + browser `http://localhost:3000/play` — grass tiles visible within 3 seconds (WORLD-01)
3. Browser DevTools: open `/play`, navigate to `/`, navigate back to `/play`, open Memory tab — heap should NOT monotonically grow (Pitfall 5 scene-leak absence)
4. `pnpm test app/play/GameClient.test.tsx` green
5. React StrictMode ON (next.config.ts) — dev server starts without "game already initialized" error
</verification>

<success_criteria>
- WORLD-01: `/play` shows grass within 3s on broadband
- D-07: three scenes (Boot, Meadow, UI) registered
- D-08: single `Phaser.Game` per mount, destroy(true) on unmount
- D-09: `next/dynamic` with `ssr: false` around the ONLY Phaser import
- Pitfall 5 BLOCKER absorbed with passing lifecycle test
- No Phaser code imported outside `game/` and `app/play/GameClient.tsx`
- Canvas renderer (not WebGL) confirmed in config
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-04-SUMMARY.md` with:
- Phaser version confirmed (3.90.0 exact)
- Build size delta (/play bundle size vs landing bundle)
- Lifecycle test count and pass status
- Manual smoke: grass visible, no memory leak on route bounce
- Known issues for Plan 05 (anchor + Cluu will add to MeadowScene.create)
</output>
