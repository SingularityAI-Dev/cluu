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
    // D-13: 4-layer Cluu compositing pipeline. 5 slots counting the base body.
    // Phase 1 ships a single "Content" pose (cluu_base); the other four slots are blank
    // transparent placeholders so Phase 3 cosmetics can drop in via a texture swap only.
    this.load.image('cluu_base', '/sprites/cluu_base.png');
    this.load.image('cluu_body_pattern', '/sprites/cluu_body_pattern.png');
    this.load.image('cluu_head', '/sprites/cluu_head.png');
    this.load.image('cluu_eyes', '/sprites/cluu_eyes.png');
    this.load.image('cluu_back', '/sprites/cluu_back.png');
  }

  create() {
    // Hand off to gameplay + HUD scenes.
    this.scene.start('MeadowScene');
    this.scene.launch('UIScene');

    // Signal React that Phaser is up.
    bus.emit('game:ready', { timestampMs: Date.now() });
  }
}
