// game/scenes/BootScene.ts
// D-07: Multi-scene architecture. BootScene preloads and hands off.
import * as Phaser from 'phaser';
import { bus } from '../bridge/EventBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Placeholder grass tile — visual style deferred per CONTEXT.md specifics.
    this.load.image('grass', '/sprites/grass_32.png');
  }

  create() {
    // Hand off to gameplay + HUD scenes.
    this.scene.start('MeadowScene');
    this.scene.launch('UIScene');

    // Signal React that Phaser is up.
    bus.emit('game:ready', { timestampMs: Date.now() });
  }
}
