// game/entities/Cluu.ts
// D-13: 4-layer Cluu compositing pipeline (5 child sprites counting the base body).
// D-14: single "Content" mood in Phase 1. setMood / setEquipped APIs exist and are REAL —
//       Phase 3 cosmetic swaps become texture changes only, no structural refactor.
import * as Phaser from 'phaser';
import { seekTarget } from '../systems/follow';

export type CosmeticSlot = 'body' | 'head' | 'back' | 'eyes';
export type CluuMood = 'stoked' | 'content' | 'sleepy' | 'blue';

// Blank placeholder texture per slot (D-14 empty-slot behavior in Phase 1).
const BLANK_TEXTURES: Record<CosmeticSlot, string> = {
  body: 'cluu_body_pattern',
  head: 'cluu_head',
  back: 'cluu_back',
  eyes: 'cluu_eyes',
};

type AnimationSprite = Phaser.GameObjects.Sprite & {
  anims?: {
    get?: (key: string) => unknown;
    play?: (key: string) => void;
  };
};

function hasAnimation(sprite: AnimationSprite, key: string): boolean {
  try {
    return Boolean(sprite.anims?.get?.(key));
  } catch {
    return false;
  }
}

function playAnimation(sprite: AnimationSprite, key: string): boolean {
  if (!hasAnimation(sprite, key)) return false;
  try {
    sprite.anims?.play?.(key);
    return true;
  } catch {
    return false;
  }
}

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Cluu extends Phaser.GameObjects.Container {
  private base: Phaser.GameObjects.Sprite;
  private bodyPattern: Phaser.GameObjects.Sprite;
  private back: Phaser.GameObjects.Sprite;
  private head: Phaser.GameObjects.Sprite;
  private eyes: Phaser.GameObjects.Sprite;
  private mood: CluuMood = 'content'; // D-14 default — arrived, not stoked, not sleepy
  private readonly speed = 160; // px/s, slower than anchor so follow reads as "trailing"

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // z-order (back to front): back accessory, animated content body, body pattern, head, eyes.
    // Phase 1 uses the animated Aseprite content pose as the base; D-13 slots remain
    // real so Phase 3 cosmetics can drop in via texture swaps.
    this.back = scene.add.sprite(0, 0, BLANK_TEXTURES.back);
    this.base = scene.add.sprite(0, 0, 'cluu_content', '0.png');
    this.base.setDisplaySize?.(48, 48);
    this.base.setFrame?.('0.png');
    playAnimation(this.base, 'breath');
    this.bodyPattern = scene.add.sprite(0, 0, BLANK_TEXTURES.body);
    this.head = scene.add.sprite(0, 0, BLANK_TEXTURES.head);
    this.eyes = scene.add.sprite(0, 0, BLANK_TEXTURES.eyes);

    this.add([this.back, this.base, this.bodyPattern, this.head, this.eyes]);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true); // D-11 world-bounds collision
    body.setSize(40, 40); // slightly smaller than 48 for nicer collision feel

    playAnimation(this.base, 'breath');
    this.scheduleBlink(scene);
    this.scheduleHeadTurn(scene);
  }

  private scheduleBlink(scene: Phaser.Scene): void {
    const delay = randomDelay(5_000, 8_000);
    scene.time.delayedCall(delay, () => {
      this.base.once('animationcomplete-blink', () => {
        playAnimation(this.base, 'breath');
      });
      if (!playAnimation(this.base, 'blink')) return;
      this.scheduleBlink(scene);
    });
  }

  private scheduleHeadTurn(scene: Phaser.Scene): void {
    const delay = randomDelay(20_000, 40_000);
    scene.time.delayedCall(delay, () => {
      this.base.once('animationcomplete-head_turn', () => {
        playAnimation(this.base, 'breath');
      });
      if (!playAnimation(this.base, 'head_turn')) return;
      this.scheduleHeadTurn(scene);
    });
  }

  /** Follow an anchor point each tick. Constant speed seek; stops within STOP_RADIUS. */
  follow(targetX: number, targetY: number, _deltaMs: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    const v = seekTarget({ x: this.x, y: this.y }, { x: targetX, y: targetY }, this.speed);
    body.setVelocity(v.x, v.y);
  }

  /** D-14: sprite-swap API is REAL. Phase 1 has one pose → method is no-op-but-real. */
  setMood(mood: CluuMood): void {
    this.mood = mood;
    // Phase 3 will swap the base texture to the mood-specific sprite here.
    // Phase 1: record mood only; no visual change.
  }

  getMood(): CluuMood {
    return this.mood;
  }

  /** D-13: swap cosmetic texture on a specific slot. Phase 3 cosmetics drop in here. */
  setEquipped(slot: CosmeticSlot, textureKey: string | null): void {
    const target = this.getSlotSprite(slot);
    target.setTexture(textureKey ?? BLANK_TEXTURES[slot]);
  }

  private getSlotSprite(slot: CosmeticSlot): Phaser.GameObjects.Sprite {
    switch (slot) {
      case 'body':
        return this.bodyPattern;
      case 'head':
        return this.head;
      case 'back':
        return this.back;
      case 'eyes':
        return this.eyes;
    }
  }

  /** Test hook — exposes child count for acceptance tests. */
  getChildCount(): number {
    return this.length;
  }
}
