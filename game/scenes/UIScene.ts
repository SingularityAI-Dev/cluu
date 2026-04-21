// game/scenes/UIScene.ts
// D-07: Phaser-layer HUD separate from the React overlay.
// Phase 1: empty. Phase 3 adds mood badge + cosmetic indicators.
import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create() {
    // Reserved for Phase 3 HUD elements.
  }
}
