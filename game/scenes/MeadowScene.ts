// game/scenes/MeadowScene.ts
// Phase 1 Meadow: grass grid + PlayerAnchor + InputSystem + camera follow.
// Task 3 adds Cluu.
import * as Phaser from 'phaser';
import { PlayerAnchor } from '../entities/PlayerAnchor';
import { InputSystem } from '../systems/input';

export class MeadowScene extends Phaser.Scene {
  private anchor?: PlayerAnchor;
  // Renamed from `input` to avoid shadowing Phaser.Scene.input (the InputPlugin).
  private inputSystem?: InputSystem;

  constructor() {
    super({ key: 'MeadowScene' });
  }

  create() {
    const tileSize = 32; // D-10: 32x32 hand-placed tiles
    const cols = 24;
    const rows = 18;
    const worldW = cols * tileSize;
    const worldH = rows * tileSize;

    // Cozy pastel background visible if tiles fail to load.
    this.cameras.main.setBackgroundColor(0xe8f4d7);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.add
          .image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'grass')
          .setDisplaySize(tileSize, tileSize);
      }
    }

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // Spawn invisible anchor at scene center (D-11).
    this.anchor = new PlayerAnchor(this, worldW / 2, worldH / 2);

    // Unified touch + keyboard input (WORLD-02, WORLD-03).
    this.inputSystem = new InputSystem(this, this.anchor);

    // Camera follow with D-12 lerp — soft follow bounded to scene dimensions.
    this.cameras.main.startFollow(this.anchor, true, 0.1, 0.1);
    this.cameras.main.setLerp(0.1, 0.1); // D-12 literal match
  }

  update(_time: number, deltaMs: number) {
    if (!this.anchor || !this.inputSystem) return;
    this.anchor.tick(this.inputSystem.readKeyboardDelta(), deltaMs);
  }

  shutdown() {
    // Pitfall 5 prevention #5: remove listeners on shutdown.
    this.inputSystem?.shutdown();
  }
}
