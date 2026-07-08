// game/config.ts
// Phaser config: Canvas renderer (design doc §8 lock), Arcade Physics, 3 scenes (D-07).
import * as Phaser from 'phaser';
import { hexToInt, palette } from '@/lib/design/tokens';
import { BootScene } from './scenes/BootScene';
import { MeadowScene } from './scenes/MeadowScene';
import { UIScene } from './scenes/UIScene';

export function buildConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.CANVAS, // design doc §8 lock — Canvas, not WebGL
    parent,
    width: 960,
    height: 540,
    backgroundColor: hexToInt(palette.meadow_hint),
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    scene: [BootScene, MeadowScene, UIScene],
    input: { activePointers: 3 }, // 1 pointer + multi-touch support for mobile
  };
}
