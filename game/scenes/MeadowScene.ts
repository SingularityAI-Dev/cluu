// game/scenes/MeadowScene.ts
// Phase 1 Meadow: paints a grid of grass tiles. Plan 05 adds PlayerAnchor + Cluu to this scene.
import * as Phaser from 'phaser';

export class MeadowScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MeadowScene' });
  }

  create() {
    const tileSize = 32; // D-10: 32x32 hand-placed tiles
    const cols = 24;
    const rows = 18;

    // Cozy pastel background visible if tiles fail to load.
    this.cameras.main.setBackgroundColor(0xe8f4d7);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.add
          .image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'grass')
          .setDisplaySize(tileSize, tileSize);
      }
    }

    // World bounds matched to the tile grid for Plan 05's physics.
    this.physics.world.setBounds(0, 0, cols * tileSize, rows * tileSize);
    this.cameras.main.setBounds(0, 0, cols * tileSize, rows * tileSize);
  }

  shutdown() {
    // Pitfall 5 prevention #5: remove listeners on shutdown.
    // (Plan 05 will register listeners; Phase 1 Meadow has none yet.)
  }
}
