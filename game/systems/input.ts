// game/systems/input.ts
// WORLD-02 (touch tap-to-move) + WORLD-03 (WASD + arrows) unified input system.
import * as Phaser from 'phaser';
import { bus } from '../bridge/EventBus';
import type { PlayerAnchor } from '../entities/PlayerAnchor';

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

    // WORLD-02: tap-to-move on touch / click.
    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.anchor.setTarget(pointer.worldX, pointer.worldY);
      bus.emit('player:anchor-moved', { x: pointer.worldX, y: pointer.worldY });
    });

    // WORLD-03: WASD + arrow keys (Phaser.Scene guarantees input.keyboard in default config).
    const kbd = scene.input.keyboard;
    if (!kbd) {
      throw new Error('InputSystem requires Phaser Keyboard plugin (enabled by default)');
    }
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

    // Normalize diagonal so total speed stays constant across axes.
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }
    return { dx, dy };
  }

  shutdown(): void {
    // Pitfall 5 #4: remove listeners on scene shutdown.
    this.scene.input.removeAllListeners('pointerdown');
  }
}
