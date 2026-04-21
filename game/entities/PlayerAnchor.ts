// game/entities/PlayerAnchor.ts
// The invisible cursor the player drives. Cluu follows this, not the player directly (§7 design).
// D-11: Arcade Physics collision with world bounds. Visible only when debug is enabled.
import * as Phaser from 'phaser';

export interface AnchorTarget {
  x: number;
  y: number;
}

export class PlayerAnchor extends Phaser.Physics.Arcade.Sprite {
  private target: AnchorTarget;
  private readonly speed = 220; // px/s for tap-to-move seek
  private readonly arriveRadius = 4;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Reuse the grass texture as a placeholder body; we scale to 8px and keep invisible.
    super(scene, x, y, 'grass');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(8, 8);
    this.setVisible(false); // invisible in gameplay
    this.setCollideWorldBounds(true); // D-11 world-bounds collision

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
