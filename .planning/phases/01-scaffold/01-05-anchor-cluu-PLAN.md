---
phase: 01-scaffold
plan: 05
type: execute
wave: 3
depends_on: [04]
files_modified:
  - game/entities/PlayerAnchor.ts
  - game/entities/Cluu.ts
  - game/systems/input.ts
  - game/systems/follow.ts
  - game/scenes/MeadowScene.ts
  - game/scenes/BootScene.ts
  - game/entities/Cluu.test.ts
  - public/sprites/cluu_base.png
  - public/sprites/cluu_body_pattern.png
  - public/sprites/cluu_head.png
  - public/sprites/cluu_eyes.png
  - public/sprites/cluu_back.png
autonomous: true
requirements:
  - WORLD-02
  - WORLD-03
  - WORLD-04
  - CLUU-01

must_haves:
  truths:
    - "Touch tap anywhere on the canvas sets the anchor destination; anchor seeks toward tap point (WORLD-02)"
    - "WASD and arrow keys move the anchor on desktop (WORLD-03)"
    - "Camera follows the anchor smoothly with setLerp(0.1, 0.1) bounded by scene dimensions (WORLD-04, D-12)"
    - "Cluu follows the anchor like a pet: constant speed toward anchor, stops within 24px stop radius (CLUU-01, D-11)"
    - "Cluu is rendered as a Phaser.GameObjects.Container with 5 child sprites: base + body pattern + head + back + eyes (D-13 — 4-layer compositing pipeline, 5 slots counting base)"
    - "Phase 1 ships a single 'Content' mood pose; slots other than `base` render null-ish placeholders (invisible) (D-14)"
    - "`cluu.setMood('content')` exists as a real method (no-op-but-real per D-14); `cluu.setEquipped(slot, textureKey)` swaps that slot's texture"
    - "Arcade Physics collides anchor AND Cluu with world bounds (D-11 collision with bounds)"
    - "Anchor is invisible in gameplay (debug flag can toggle visibility); Cluu is visible"
  artifacts:
    - path: "game/entities/PlayerAnchor.ts"
      provides: "Invisible cursor entity the player drives (touch tap + WASD)"
      exports: ["PlayerAnchor", "type AnchorTarget"]
    - path: "game/entities/Cluu.ts"
      provides: "4-layer sprite container with setMood/setEquipped API (D-13, D-14)"
      exports: ["Cluu", "type CosmeticSlot"]
    - path: "game/systems/input.ts"
      provides: "Unified input: touch tap-to-move + keyboard WASD/arrows"
      exports: ["InputSystem"]
    - path: "game/systems/follow.ts"
      provides: "Seek-behavior follow: constant speed toward target, stop at radius"
      exports: ["seekTarget"]
    - path: "game/scenes/MeadowScene.ts"
      provides: "Updated: adds PlayerAnchor + Cluu + InputSystem + camera follow"
      contains: "setLerp(0.1, 0.1)"
    - path: "game/entities/Cluu.test.ts"
      provides: "Vitest suite for Cluu API surface (D-14 no-op-but-real proof)"
      contains: "setMood"
  key_links:
    - from: "game/scenes/MeadowScene.ts"
      to: "setLerp(0.1, 0.1)"
      via: "camera follow configuration"
      pattern: "setLerp\\(0\\.1,\\s*0\\.1\\)"
    - from: "game/entities/Cluu.ts"
      to: "Phaser.GameObjects.Container"
      via: "4-layer sprite compositing (D-13)"
      pattern: "extends Phaser\\.GameObjects\\.Container"
    - from: "game/systems/follow.ts"
      to: "24px stop radius"
      via: "seek behavior"
      pattern: "24"
---

<objective>
Add the two gameplay entities that Phase 1 exists to prove: the invisible `PlayerAnchor` (the thing the user drives) and `Cluu` (the companion that follows the anchor like a pet, not a direct avatar — §7 design doc). Implements the 4-layer sprite compositing pipeline (D-13) so Phase 3's cosmetic swaps are a texture change, not a refactor.

Covers requirements WORLD-02 (tap-to-move), WORLD-03 (WASD + arrows), WORLD-04 (camera follow), and CLUU-01 (Cluu follows anchor).

Key decisions already locked and implemented here:
- **D-11**: touch tap-to-move + WASD/arrow keys; Cluu seek-behaviors with 24px stop radius; Arcade Physics for anchor/Cluu + world bounds collision
- **D-12**: camera `setLerp(0.1, 0.1)`, bounded by scene dimensions
- **D-13**: Cluu is a `Phaser.GameObjects.Container` with 5 child sprites (base body, body pattern, head, back, eyes). Even though Phase 1 has all slots null, the compositing pipeline exists — retrofitting to multi-layer in Phase 3 would be painful.
- **D-14**: single "Content" pose sprite; `setMood` is a no-op-but-real method (the sprite-swap API exists)

The Cluu sprites in Phase 1 are placeholder PNGs per CONTEXT.md specifics (solid pastel circle for base; transparent 1px PNGs for the other four slots). Final art is tracked as a separate deliverable per design doc §16.

Purpose: Success Criterion #2 passes — "Visitor can move an anchor around a grass scene via touch on mobile and WASD/arrow-keys on desktop, with Cluu following like a pet."
Output: Playable Meadow scene with anchor input, Cluu following, camera smoothly lerping. Foundation for Phase 2 encounters (anchor overlap with encounter objects → EventBus emit).
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/ARCHITECTURE.md
@docs/cluu-v1-design.md

<interfaces>
<!-- Phaser 3.90 APIs this plan uses — executor reads live docs at https://newdocs.phaser.io/docs/3.90.0 -->

Key Phaser types referenced:
```ts
Phaser.Scene
Phaser.GameObjects.Container      // for 4-layer Cluu compositing (D-13)
Phaser.GameObjects.Sprite
Phaser.Physics.Arcade.Sprite      // for anchor + Cluu with physics bodies
Phaser.Cameras.Scene2D.Camera     // setLerp, startFollow, setBounds
Phaser.Input.Keyboard.KeyboardPlugin
Phaser.Math.Vector2
Phaser.Math.Distance.Between
```

<!-- From Plan 04 (dependency) — already exists -->
```ts
// game/scenes/MeadowScene.ts — extended by this plan
export class MeadowScene extends Phaser.Scene {
  create(): void;    // currently paints grass; this plan ADDS anchor + Cluu
}

// game/bridge/EventBus.ts — already has player:anchor-moved typed event
export type GameEvents = {
  'player:anchor-moved': { x: number; y: number };
  'cluu:mood': { mood: 'stoked' | 'content' | 'sleepy' | 'blue' };
  ...
}
```

<!-- From design doc §13 + CONTEXT.md Claude's Discretion -->
- Cluu sprite canonical size: 48×48 (design doc §13)
- Placeholder art acceptable in Phase 1; visual style guide is a separate deliverable

<!-- From CONTEXT.md D-11 specifics -->
- Tap-to-move: on pointerdown, set target to pointer.worldX/Y
- WASD + arrow keys: continuous velocity
- Cluu seek: constant speed toward anchor; stop at 24px
- Arcade Physics collision with world bounds (not tile-by-tile collision in Phase 1)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Placeholder Cluu sprites + preload in BootScene</name>
  <files>public/sprites/cluu_base.png, public/sprites/cluu_body_pattern.png, public/sprites/cluu_head.png, public/sprites/cluu_eyes.png, public/sprites/cluu_back.png, game/scenes/BootScene.ts</files>

  <read_first>
    - game/scenes/BootScene.ts (Plan 04) — current preload contents
    - .planning/phases/01-scaffold/01-CONTEXT.md — "Claude's Discretion" (placeholder art acceptable) + D-13 (4 layers), D-14 (single Content pose)
    - docs/cluu-v1-design.md §7.1 and §13 — Cluu is 48×48, cozy cute
  </read_first>

  <action>
1. Generate placeholder sprites. `cluu_base.png` is a solid 48×48 pastel circle (stands in for the "Content" pose body); the other four slots are 48×48 fully-transparent PNGs so the container renders nothing visible for them in Phase 1 (D-14: "slots other than base render null-ish placeholders"). Run from repo root:

```bash
# Use Node to write minimal valid PNGs.
# Strategy: commit tiny programmatically-generated PNGs.
node -e '
const fs = require("fs");
const zlib = require("zlib");

function makePNG(width, height, rgba) {
  // rgba: function(x,y) -> [r,g,b,a]
  const sig = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }

  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    return (crc ^ 0xffffffff) | 0;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0;  // filter none
    for (let x = 0; x < width; x++) {
      const [r,g,b,a] = rgba(x, y);
      const off = y * (1 + width * 4) + 1 + x * 4;
      raw[off] = r; raw[off+1] = g; raw[off+2] = b; raw[off+3] = a;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// Cluu base: pastel mustard-yellow filled circle, 48×48
const W = 48, H = 48;
const cx = 24, cy = 24, rad = 20;
const base = makePNG(W, H, (x,y) => {
  const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
  if (d <= rad) return [245, 213, 118, 255];   // warm butter
  if (d <= rad + 1) return [245, 213, 118, 128]; // AA edge
  return [0,0,0,0];
});
fs.writeFileSync("public/sprites/cluu_base.png", base);

// Transparent placeholders for the other four slots (D-14 empty-slot behavior)
const blank = makePNG(W, H, () => [0,0,0,0]);
fs.writeFileSync("public/sprites/cluu_body_pattern.png", blank);
fs.writeFileSync("public/sprites/cluu_head.png", blank);
fs.writeFileSync("public/sprites/cluu_eyes.png", blank);
fs.writeFileSync("public/sprites/cluu_back.png", blank);
console.log("wrote 5 Cluu placeholder sprites (base + 4 blank slots)");
'
```

2. Update `game/scenes/BootScene.ts` to preload all 5 Cluu sprites:
```ts
// game/scenes/BootScene.ts
import Phaser from 'phaser';
import { bus } from '../bridge/EventBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Tiles
    this.load.image('grass', '/sprites/grass_32.png');
    // Cluu 4-layer compositing (D-13) — 5 slots counting base
    this.load.image('cluu_base', '/sprites/cluu_base.png');
    this.load.image('cluu_body_pattern', '/sprites/cluu_body_pattern.png');
    this.load.image('cluu_head', '/sprites/cluu_head.png');
    this.load.image('cluu_eyes', '/sprites/cluu_eyes.png');
    this.load.image('cluu_back', '/sprites/cluu_back.png');
  }

  create() {
    this.scene.start('MeadowScene');
    this.scene.launch('UIScene');
    bus.emit('game:ready', { timestampMs: Date.now() });
  }
}
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; test -f public/sprites/cluu_base.png &amp;&amp; test -f public/sprites/cluu_body_pattern.png &amp;&amp; test -f public/sprites/cluu_head.png &amp;&amp; test -f public/sprites/cluu_eyes.png &amp;&amp; test -f public/sprites/cluu_back.png &amp;&amp; file public/sprites/cluu_base.png | grep -q "PNG" &amp;&amp; grep -q "cluu_base" game/scenes/BootScene.ts</automated>
  </verify>

  <acceptance_criteria>
    - All 5 PNG files exist in `public/sprites/`
    - `file public/sprites/cluu_base.png` reports a valid PNG
    - `cluu_base.png` dimensions are 48×48 (can verify with `file` or `identify` if ImageMagick available)
    - `game/scenes/BootScene.ts` preloads all 5 Cluu textures
  </acceptance_criteria>

  <done>5 Cluu slot textures preloaded. Phase 3 cosmetic assets drop into the same slots without any code change beyond the texture swap.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: PlayerAnchor + input system + camera follow</name>
  <files>game/entities/PlayerAnchor.ts, game/systems/input.ts, game/scenes/MeadowScene.ts</files>

  <read_first>
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-11 (tap-to-move + WASD + Cluu seek), D-12 (camera setLerp 0.1,0.1)
    - game/scenes/MeadowScene.ts (from Plan 04) — current contents (grass grid)
    - game/bridge/EventBus.ts (Plan 04) — `player:anchor-moved` event signature
    - Phaser 3.90 input docs (live): https://newdocs.phaser.io/docs/3.90.0/Phaser.Input.InputPlugin
    - Phaser 3.90 camera docs (live): https://newdocs.phaser.io/docs/3.90.0/Phaser.Cameras.Scene2D.Camera
  </read_first>

  <action>
1. Create `game/entities/PlayerAnchor.ts`. Arcade Physics sprite (invisible unless debug flag is on). Carries a target Vector2 that the input system updates:
```ts
// game/entities/PlayerAnchor.ts
// The invisible cursor the player drives. Cluu follows this, not the player directly (§7 design).
// D-11: Arcade Physics collision with world bounds. Visible only when debug is enabled.
import Phaser from 'phaser';

export interface AnchorTarget {
  x: number;
  y: number;
}

export class PlayerAnchor extends Phaser.Physics.Arcade.Sprite {
  private target: AnchorTarget;
  private readonly speed = 220;   // px/s for tap-to-move seek
  private readonly arriveRadius = 4;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Use the 1px grass texture as a placeholder body; we scale it to 8px and keep invisible
    super(scene, x, y, 'grass');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(8, 8);
    this.setVisible(false);                        // invisible in gameplay
    this.setCollideWorldBounds(true);              // D-11 world-bounds collision

    this.target = { x, y };
  }

  setTarget(x: number, y: number): void {
    this.target = { x, y };
  }

  getTarget(): AnchorTarget {
    return { ...this.target };
  }

  /** Called by MeadowScene.update(). Moves anchor toward target; keyboard pushes target directly. */
  tick(keyboardDelta: { dx: number; dy: number }, deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;

    // Keyboard input updates the target continuously (immediate-response feel).
    if (keyboardDelta.dx !== 0 || keyboardDelta.dy !== 0) {
      const keySpeed = 260;
      const dt = deltaMs / 1000;
      this.target = {
        x: this.x + keyboardDelta.dx * keySpeed * dt,
        y: this.y + keyboardDelta.dy * keySpeed * dt,
      };
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.arriveRadius) {
      body.setVelocity(0, 0);
      return;
    }

    body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
  }
}
```

2. Create `game/systems/input.ts`. Unified touch + keyboard:
```ts
// game/systems/input.ts
// WORLD-02 (touch) + WORLD-03 (keyboard) unified input system.
import Phaser from 'phaser';
import type { PlayerAnchor } from '../entities/PlayerAnchor';
import { bus } from '../bridge/EventBus';

export class InputSystem {
  private scene: Phaser.Scene;
  private anchor: PlayerAnchor;
  private keys: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  constructor(scene: Phaser.Scene, anchor: PlayerAnchor) {
    this.scene = scene;
    this.anchor = anchor;

    // WORLD-02: tap-to-move on touch / click
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.anchor.setTarget(pointer.worldX, pointer.worldY);
      bus.emit('player:anchor-moved', { x: pointer.worldX, y: pointer.worldY });
    });

    // WORLD-03: WASD + arrow keys
    const kbd = scene.input.keyboard!;
    this.keys = {
      W: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      up: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      left: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      down: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      right: kbd.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };
  }

  /** Called by MeadowScene.update() each tick. Returns normalized {dx, dy} in range [-1, 1]. */
  readKeyboardDelta(): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    if (this.keys.A.isDown || this.keys.left.isDown) dx -= 1;
    if (this.keys.D.isDown || this.keys.right.isDown) dx += 1;
    if (this.keys.W.isDown || this.keys.up.isDown) dy -= 1;
    if (this.keys.S.isDown || this.keys.down.isDown) dy += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }
    return { dx, dy };
  }

  shutdown(): void {
    // Pitfall 5 prevention #4: remove listeners on scene shutdown
    this.scene.input.removeAllListeners('pointerdown');
  }
}
```

3. Update `game/scenes/MeadowScene.ts` to instantiate the anchor + input + camera follow. (Cluu is added in Task 3 — the scene integration there.)
```ts
// game/scenes/MeadowScene.ts
// Phase 1 Meadow: grass + PlayerAnchor + Cluu (Task 3) + camera follow.
import Phaser from 'phaser';
import { PlayerAnchor } from '../entities/PlayerAnchor';
import { InputSystem } from '../systems/input';
import { Cluu } from '../entities/Cluu';

export class MeadowScene extends Phaser.Scene {
  private anchor?: PlayerAnchor;
  private input!: InputSystem;
  private cluu?: Cluu;

  constructor() {
    super({ key: 'MeadowScene' });
  }

  create() {
    const tileSize = 32;
    const cols = 24;
    const rows = 18;

    this.cameras.main.setBackgroundColor(0xe8f4d7);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.add.image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'grass')
          .setDisplaySize(tileSize, tileSize);
      }
    }

    const worldW = cols * tileSize;
    const worldH = rows * tileSize;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // Spawn anchor at scene center
    this.anchor = new PlayerAnchor(this, worldW / 2, worldH / 2);

    // Input system (tap + WASD)
    this.input = new InputSystem(this, this.anchor) as unknown as InputSystem;
    // (Note: assigning to `this.input` shadows Phaser's built-in scene.input. Rename field to avoid.)
    // Fix: rename to `this.inputSystem` instead.

    // Camera follow with D-12 lerp
    this.cameras.main.startFollow(this.anchor, true, 0.1, 0.1);
    // Defensive explicit setLerp — matches D-12 contract exactly
    this.cameras.main.setLerp(0.1, 0.1);

    // Spawn Cluu (Task 3)
    this.cluu = new Cluu(this, worldW / 2 + 48, worldH / 2 + 48);
  }

  update(_time: number, deltaMs: number) {
    if (!this.anchor || !this.inputSystem) return;
    const kb = this.inputSystem.readKeyboardDelta();
    this.anchor.tick(kb, deltaMs);

    // Cluu follow — seek behavior handled in entity
    if (this.cluu && this.anchor) {
      this.cluu.follow(this.anchor.x, this.anchor.y, deltaMs);
    }
  }

  shutdown() {
    this.inputSystem?.shutdown();
  }

  // Rename field from `input` to avoid colliding with Phaser.Scene.input
  private inputSystem!: InputSystem;
}
```

**IMPORTANT:** `Phaser.Scene` already has an `input` property (the InputPlugin). The above code uses `this.inputSystem` to avoid shadowing. The executor must use `this.inputSystem = new InputSystem(...)`, NOT `this.input`. Final `MeadowScene.ts` should read:

```ts
import Phaser from 'phaser';
import { PlayerAnchor } from '../entities/PlayerAnchor';
import { InputSystem } from '../systems/input';
import { Cluu } from '../entities/Cluu';

export class MeadowScene extends Phaser.Scene {
  private anchor?: PlayerAnchor;
  private inputSystem?: InputSystem;
  private cluu?: Cluu;

  constructor() { super({ key: 'MeadowScene' }); }

  create() {
    const tileSize = 32, cols = 24, rows = 18;
    const worldW = cols * tileSize, worldH = rows * tileSize;
    this.cameras.main.setBackgroundColor(0xe8f4d7);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.add.image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'grass')
          .setDisplaySize(tileSize, tileSize);
      }
    }
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    this.anchor = new PlayerAnchor(this, worldW / 2, worldH / 2);
    this.inputSystem = new InputSystem(this, this.anchor);
    this.cameras.main.startFollow(this.anchor, true, 0.1, 0.1);
    this.cameras.main.setLerp(0.1, 0.1);
    this.cluu = new Cluu(this, worldW / 2 + 48, worldH / 2 + 48);
  }

  update(_time: number, deltaMs: number) {
    if (!this.anchor || !this.inputSystem) return;
    this.anchor.tick(this.inputSystem.readKeyboardDelta(), deltaMs);
    if (this.cluu && this.anchor) this.cluu.follow(this.anchor.x, this.anchor.y, deltaMs);
  }

  shutdown() { this.inputSystem?.shutdown(); }
}
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; grep -q "setLerp(0.1, 0.1)" game/scenes/MeadowScene.ts &amp;&amp; grep -q "startFollow" game/scenes/MeadowScene.ts &amp;&amp; grep -q "pointerdown" game/systems/input.ts &amp;&amp; grep -q "KeyCodes.W" game/systems/input.ts</automated>
  </verify>

  <acceptance_criteria>
    - `game/entities/PlayerAnchor.ts` extends `Phaser.Physics.Arcade.Sprite`
    - `PlayerAnchor` constructor calls `setCollideWorldBounds(true)` (D-11)
    - `PlayerAnchor.setVisible(false)` — anchor is invisible in gameplay
    - `game/systems/input.ts` registers `pointerdown` listener (WORLD-02 tap-to-move)
    - `game/systems/input.ts` binds both WASD and arrow keys (WORLD-03)
    - `game/scenes/MeadowScene.ts` calls `setLerp(0.1, 0.1)` exactly (D-12 literal)
    - `MeadowScene` uses `this.inputSystem` (not `this.input`) to avoid shadowing Phaser.Scene.input
    - `pnpm typecheck` exits 0
  </acceptance_criteria>

  <done>Anchor driven by touch + keyboard; camera follows with smooth lerp; world bounds enforced.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Cluu 4-layer Container + follow behavior + API surface test</name>
  <files>game/entities/Cluu.ts, game/systems/follow.ts, game/entities/Cluu.test.ts</files>

  <read_first>
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-13 (4 layers in Container), D-14 (single Content pose, sprite-swap API is real)
    - docs/cluu-v1-design.md §7.3 (cosmetic slots — head, body pattern, back accessory, eye style) and §13 (48×48)
    - game/entities/PlayerAnchor.ts (Task 2) — what Cluu follows
    - Phaser 3.90 Container docs (live): https://newdocs.phaser.io/docs/3.90.0/Phaser.GameObjects.Container
  </read_first>

  <behavior>
    API surface tests (proves D-14 "sprite-swap API is real even though Phase 1 has one pose"):
    - Test 1: `new Cluu(fakeScene, 0, 0)` constructs without error — fake scene stubs `add.container`, `add.sprite`
    - Test 2: `cluu.setMood('stoked')` is callable and does not throw (no-op-but-real per D-14)
    - Test 3: `cluu.setMood` accepts all four valid moods: 'stoked', 'content', 'sleepy', 'blue'
    - Test 4: `cluu.setEquipped('head', 'some_key')` calls `setTexture` on the head slot sprite
    - Test 5: `cluu.setEquipped('body', null)` clears the body-pattern slot (sets texture to the blank placeholder)
    - Test 6: Cluu has exactly 5 child sprites in its container (base + body + head + back + eyes)

    Follow behavior test (D-11 seek with 24px stop radius):
    - Test 7: `seekTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, 1000)` returns velocity pointing right
    - Test 8: `seekTarget` returns zero velocity when distance < 24 (stop radius)
    - Test 9: Distance exactly 24 — stops (inclusive-or-exclusive is fine; verify one direction)
  </behavior>

  <action>
1. Create `game/systems/follow.ts`. Pure function so it's trivially testable:
```ts
// game/systems/follow.ts
// D-11: Cluu seek behavior — constant speed toward target, stops at 24px.
export const STOP_RADIUS = 24;

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Compute desired velocity for a seek behavior.
 * @param from Current position
 * @param to Target position
 * @param speed Pixels per second
 * @returns velocity in px/s; {0, 0} when within STOP_RADIUS
 */
export function seekTarget(from: Vec2, to: Vec2, speed: number): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= STOP_RADIUS) return { x: 0, y: 0 };
  return { x: (dx / dist) * speed, y: (dy / dist) * speed };
}
```

2. Create `game/entities/Cluu.ts`. Extends `Phaser.GameObjects.Container` (D-13) with 5 child sprites in a stable z-order:
```ts
// game/entities/Cluu.ts
// D-13: 4-layer Cluu compositing (5 sprites counting the base).
// D-14: single "content" mood in Phase 1. setMood/setEquipped APIs exist and are real.
import Phaser from 'phaser';
import { seekTarget } from '../systems/follow';

export type CosmeticSlot = 'body' | 'head' | 'back' | 'eyes';
export type CluuMood = 'stoked' | 'content' | 'sleepy' | 'blue';

const BLANK_TEXTURES: Record<CosmeticSlot, string> = {
  body: 'cluu_body_pattern',
  head: 'cluu_head',
  back: 'cluu_back',
  eyes: 'cluu_eyes',
};

export class Cluu extends Phaser.GameObjects.Container {
  private base: Phaser.GameObjects.Sprite;
  private bodyPattern: Phaser.GameObjects.Sprite;
  private back: Phaser.GameObjects.Sprite;
  private head: Phaser.GameObjects.Sprite;
  private eyes: Phaser.GameObjects.Sprite;
  private mood: CluuMood = 'content';     // D-14 default
  private readonly speed = 160;             // px/s, slower than anchor so pet follow reads as "trailing"

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // z-order (back to front): back accessory, base body, body pattern, head, eyes
    // Even though slots are blank in Phase 1, the layer order is already correct for Phase 3.
    this.back = scene.add.sprite(0, 0, BLANK_TEXTURES.back);
    this.base = scene.add.sprite(0, 0, 'cluu_base');
    this.bodyPattern = scene.add.sprite(0, 0, BLANK_TEXTURES.body);
    this.head = scene.add.sprite(0, 0, BLANK_TEXTURES.head);
    this.eyes = scene.add.sprite(0, 0, BLANK_TEXTURES.eyes);

    this.add([this.back, this.base, this.bodyPattern, this.head, this.eyes]);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(40, 40);   // slightly smaller than 48 for nicer collision feel
  }

  /** Follow an anchor point. Called each tick by MeadowScene.update. */
  follow(targetX: number, targetY: number, _deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const v = seekTarget({ x: this.x, y: this.y }, { x: targetX, y: targetY }, this.speed);
    body.setVelocity(v.x, v.y);
  }

  /** D-14: sprite-swap API is REAL. Phase 1 has one pose → method is a no-op-but-real. */
  setMood(mood: CluuMood): void {
    this.mood = mood;
    // Phase 3 will swap base texture to the mood-specific sprite.
    // Phase 1: record mood, no visual change.
  }

  getMood(): CluuMood {
    return this.mood;
  }

  /** D-13: swap cosmetic texture on a specific slot. Phase 3 cosmetics use this. */
  setEquipped(slot: CosmeticSlot, textureKey: string | null): void {
    const target = this.getSlotSprite(slot);
    target.setTexture(textureKey ?? BLANK_TEXTURES[slot]);
  }

  private getSlotSprite(slot: CosmeticSlot): Phaser.GameObjects.Sprite {
    switch (slot) {
      case 'body': return this.bodyPattern;
      case 'head': return this.head;
      case 'back': return this.back;
      case 'eyes': return this.eyes;
    }
  }

  /** Test hook — exposes child count for acceptance tests. */
  getChildCount(): number {
    return this.length;
  }
}
```

3. Create `game/entities/Cluu.test.ts`. Tests the API surface with a fake Phaser scene (no real Phaser instance needed):
```ts
// game/entities/Cluu.test.ts
// D-14 no-op-but-real proof: setMood / setEquipped exist and behave correctly.
// D-13 proof: exactly 5 child sprites in z-order.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { seekTarget, STOP_RADIUS } from '../systems/follow';

// Cluu uses Phaser; we can't spin up real Phaser in jsdom.
// Mock enough of Phaser to construct the class.
vi.mock('phaser', () => {
  class FakeSprite {
    texture = { key: '' };
    constructor(_s: unknown, _x: number, _y: number, key: string) {
      this.texture.key = key;
    }
    setTexture(key: string): void {
      this.texture.key = key;
    }
  }
  class FakeContainer {
    private children: FakeSprite[] = [];
    length = 0;
    constructor(public scene: unknown, public x: number, public y: number) {}
    add(items: FakeSprite | FakeSprite[]): void {
      const arr = Array.isArray(items) ? items : [items];
      this.children.push(...arr);
      this.length = this.children.length;
    }
  }
  const Phaser = {
    GameObjects: { Container: FakeContainer, Sprite: FakeSprite },
    Physics: { Arcade: { Body: class {} } },
  };
  return { default: Phaser, __esModule: true };
});

function makeFakeScene() {
  const sprites: Array<{ texture: { key: string }; setTexture: (k: string) => void }> = [];
  return {
    sprites,
    add: {
      sprite(_x: number, _y: number, key: string) {
        const s = {
          texture: { key },
          setTexture(k: string) { this.texture.key = k; },
        };
        sprites.push(s);
        return s;
      },
      existing(_o: unknown) {},
    },
    physics: {
      add: {
        existing(o: { body?: unknown }) {
          o.body = {
            setCollideWorldBounds(_b: boolean) {},
            setSize(_w: number, _h: number) {},
            setVelocity(_x: number, _y: number) {},
          };
        },
      },
    },
  };
}

// Lazy-import Cluu AFTER the Phaser mock is installed
async function loadCluu() {
  const mod = await import('./Cluu');
  return mod.Cluu;
}

describe('Cluu entity — D-13 + D-14', () => {
  it('constructs with 5 child sprites (base + body + head + back + eyes)', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny: fake-scene shape differs from Phaser.Scene
    const cluu = new Cluu(scene as any, 0, 0);
    expect(cluu.getChildCount()).toBe(5);
  });

  it('setMood accepts all four moods without throwing (D-14 no-op-but-real)', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    const cluu = new Cluu(scene as any, 0, 0);
    for (const m of ['stoked', 'content', 'sleepy', 'blue'] as const) {
      expect(() => cluu.setMood(m)).not.toThrow();
      expect(cluu.getMood()).toBe(m);
    }
  });

  it('setEquipped swaps texture on the targeted slot (D-13 pipeline is real)', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    const cluu = new Cluu(scene as any, 0, 0);
    cluu.setEquipped('head', 'petal_pin');
    // The head sprite is the 4th one created in the constructor (back, base, bodyPattern, head, eyes)
    const headSprite = scene.sprites[3];
    expect(headSprite.texture.key).toBe('petal_pin');
  });

  it('setEquipped(slot, null) resets slot to blank placeholder', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    const cluu = new Cluu(scene as any, 0, 0);
    cluu.setEquipped('body', 'stripes');
    cluu.setEquipped('body', null);
    // body sprite is index 2 (back, base, bodyPattern)
    expect(scene.sprites[2].texture.key).toBe('cluu_body_pattern');
  });
});

describe('seekTarget — D-11 24px stop radius', () => {
  it('returns velocity pointing toward target when distant', () => {
    const v = seekTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 160);
    expect(v.x).toBeCloseTo(160);
    expect(v.y).toBeCloseTo(0);
  });

  it('returns zero velocity within STOP_RADIUS', () => {
    const v = seekTarget({ x: 0, y: 0 }, { x: 10, y: 10 }, 160);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('stops exactly at STOP_RADIUS', () => {
    const v = seekTarget({ x: 0, y: 0 }, { x: STOP_RADIUS, y: 0 }, 160);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('normalizes direction regardless of distance', () => {
    const v = seekTarget({ x: 0, y: 0 }, { x: 300, y: 400 }, 100);
    // Distance 500, normalized → (0.6, 0.8) × 100
    expect(v.x).toBeCloseTo(60);
    expect(v.y).toBeCloseTo(80);
  });
});
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test game/entities/Cluu.test.ts</automated>
  </verify>

  <acceptance_criteria>
    - `game/entities/Cluu.ts` extends `Phaser.GameObjects.Container` (grep: `grep -q "extends Phaser.GameObjects.Container" game/entities/Cluu.ts`)
    - `Cluu` constructor creates exactly 5 sprites: back, base, bodyPattern, head, eyes (z-order)
    - `Cluu.setMood(mood)` exists and accepts 4 moods (D-14)
    - `Cluu.setEquipped(slot, textureKey)` exists and accepts slot ∈ {body, head, back, eyes} (D-13)
    - `game/systems/follow.ts` exports `STOP_RADIUS = 24` (D-11)
    - `game/entities/Cluu.test.ts` has at least 8 tests total (4 Cluu + 4 seekTarget) and all pass
    - `pnpm test game/entities/Cluu.test.ts` exits 0
  </acceptance_criteria>

  <done>Cluu 4-layer Container with real setMood/setEquipped APIs. Seek-follow behavior tested. Phase 3 cosmetics drop into slots with zero refactor.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser input → game input system | Touch/keyboard events — client-local, not security-sensitive in Phase 1 (no encounters to abuse) |
| Anchor position → EventBus → React | In-process; same trust context |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-05-01 | Denial of Service | Malicious pointer flooding causing frame drops | accept | Phase 1 has no encounter attempts to trigger. Phaser's built-in input throttle plus per-frame work being O(1) makes this a non-issue at the Phase 1 surface. |
| T-05-02 | Information Disclosure | `player:anchor-moved` event leaks position to analytics | accept | Phase 1 has no analytics (Plan 06 adds consent-gated PostHog; anchor coords are not tracked) |
| T-05-03 | Tampering | Attacker modifies Cluu cosmetics via DevTools | accept | Cluu state is client-only in Phase 1. Phase 3 persistence will validate cosmetic ownership server-side before display |
</threat_model>

<verification>
1. `pnpm typecheck` + `pnpm test` all green
2. Manual: visit `/play` — move by tapping/clicking various grass tiles; anchor (invisible) moves, camera follows with gentle lerp, Cluu trails behind
3. Manual: WASD or arrow keys move the anchor; Cluu follows; mobile touch tap works equivalently
4. Manual: press to edge of scene — Cluu + anchor collide with world bounds (don't leave the grid)
5. `grep -c "setLerp(0.1, 0.1)" game/scenes/MeadowScene.ts` returns 1 (D-12 literal match)
</verification>

<success_criteria>
- WORLD-02 + WORLD-03: both input modes work
- WORLD-04: camera follows smoothly with D-12 lerp
- CLUU-01: Cluu follows the anchor like a pet (never directly controlled)
- D-11 seek: constant speed, 24px stop radius, world-bounds collision
- D-13: 4-layer Container compositing pipeline exists and tested
- D-14: setMood / setEquipped API surface exists and tested (no-op-but-real)
- Tests: Cluu API + seek behavior + all prior plan tests remain green
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-05-SUMMARY.md` with:
- Cluu test count (≥ 8)
- Manual observation: Cluu lag behind anchor looks like a pet
- FPS observed on desktop Chrome (baseline for Phase 5 perf budget)
- Any deviations from D-11/D-12/D-13/D-14 (should be none)
</output>
