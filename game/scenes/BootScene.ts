// game/scenes/BootScene.ts
// D-07: Multi-scene architecture. BootScene preloads and hands off.
import * as Phaser from 'phaser';
import { bus } from '../bridge/EventBus';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Phase 01.1: production-feel art assets. The Cluu sheet is an Aseprite
    // Hash export (PNG + JSON) so animations can be driven from frame tags.
    this.load.image('grass', '/sprites/grass_32.png');
    this.load.aseprite('cluu_content', '/sprites/cluu_content.png', '/sprites/cluu_content.json');
    this.load.image('encounter_meadow_sunflower_withered', '/sprites/encounter_meadow_sunflower_withered.png');
    this.load.image('encounter_meadow_sunflower_revived', '/sprites/encounter_meadow_sunflower_revived.png');

    // D-13 compatibility slots. Phase 1's visible Cluu is the animated content
    // pose above; these placeholders remain so Phase 3 cosmetics can drop in.
    this.load.image('cluu_base', '/sprites/cluu_base.png');
    this.load.image('cluu_body_pattern', '/sprites/cluu_body_pattern.png');
    this.load.image('cluu_head', '/sprites/cluu_head.png');
    this.load.image('cluu_eyes', '/sprites/cluu_eyes.png');
    this.load.image('cluu_back', '/sprites/cluu_back.png');
  }

  create() {
    // Aseprite frameTags: breath, blink, head_turn.
    this.anims.createFromAseprite('cluu_content');
    // Hand off to gameplay + HUD scenes.
    this.scene.start('MeadowScene');
    this.scene.launch('UIScene');

    // Signal React that Phaser is up.
    bus.emit('game:ready', { timestampMs: Date.now() });
  }
}
