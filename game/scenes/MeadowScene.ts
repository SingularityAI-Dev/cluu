// game/scenes/MeadowScene.ts
// Phase 1 Meadow: grass grid + PlayerAnchor + InputSystem + camera follow.
// Task 3 adds Cluu. Phase 2 adds the Withered Sunflower encounter object.
import * as Phaser from 'phaser';
import { bus } from '../bridge/EventBus';
import { Cluu } from '../entities/Cluu';
import { PlayerAnchor } from '../entities/PlayerAnchor';
import { InputSystem } from '../systems/input';

const SUNFLOWER_ENCOUNTER_ID = 'meadow_withered_sunflower';
const SUNFLOWER_SPRITE = 'encounter_meadow_sunflower_withered';
const SUNFLOWER_RESOLVED_SPRITE = 'encounter_meadow_sunflower_revived';
const ENCOUNTER_OPEN_RADIUS = 72;

export class MeadowScene extends Phaser.Scene {
  private anchor?: PlayerAnchor;
  // Renamed from `input` to avoid shadowing Phaser.Scene.input (the InputPlugin).
  private inputSystem?: InputSystem;
  private cluu?: Cluu;
  private cluuShadow?: Phaser.GameObjects.Ellipse;
  private sunflower?: Phaser.GameObjects.Image;
  private sunflowerX = 0;
  private sunflowerY = 0;
  private encounterOpenRequested = false;
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private enterKey?: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'MeadowScene' });
  }

  create() {
    const tileSize = 32; // D-10: 32x32 hand-placed tiles
    const worldW = this.scale.width;
    const worldH = this.scale.height;
    const cols = Math.ceil(worldW / tileSize);
    const rows = Math.ceil(worldH / tileSize);

    // Cozy pastel background visible if tiles fail to load.
    this.cameras.main.setBackgroundColor(0x87b878);

    this.paintSky(worldW, worldH);
    this.paintDistantHills(worldW, worldH);
    this.paintDirtPath(worldW, worldH);
    this.paintMeadowDecor(worldW, worldH);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        this.add
          .image(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, 'grass')
          .setDisplaySize(tileSize, tileSize)
          .setDepth(5);
      }
    }

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // Spawn invisible anchor at scene center (D-11).
    this.anchor = new PlayerAnchor(this, worldW / 2, worldH / 2);

    // Unified touch + keyboard input (WORLD-02, WORLD-03).
    this.inputSystem = new InputSystem(this, this.anchor);

    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

    // Camera follow with D-12 lerp — soft follow bounded to scene dimensions.
    this.cameras.main.startFollow(this.anchor, true, 0.1, 0.1);
    this.cameras.main.setLerp(0.1, 0.1); // D-12 literal match

    // Spawn Cluu slightly offset so the follow/trailing behavior reads immediately (CLUU-01).
    this.cluu = new Cluu(this, worldW / 2 + 92, worldH / 2 + 30);
    this.cluuShadow = this.add.ellipse(this.cluu.x, this.cluu.y + 42, 78, 18, 0x2d2a26, 0.18).setDepth(19);
    this.cluu.setDepth(30);
    this.cluu.setScale(1.85);

    this.sunflowerX = worldW / 2 - 96;
    this.sunflowerY = worldH / 2 - 10;
    this.add.ellipse(this.sunflowerX, this.sunflowerY + 52, 72, 22, 0x2d2a26, 0.22).setDepth(18);
    this.sunflower = this.add
      .image(this.sunflowerX, this.sunflowerY, SUNFLOWER_SPRITE)
      .setDisplaySize(128, 128)
      .setDepth(24);
    this.tweens.add({
      targets: this.sunflower,
      y: this.sunflowerY - 4,
      duration: 1_600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.createEncounterBadge(worldW);

    const handlePointerDown = (pointer: Phaser.Input.Pointer) => {
      this.tryOpenEncounter(pointer.worldX, pointer.worldY);
    };
    this.input.on('pointerdown', handlePointerDown);

    const handleResolved = (event: { encounterId: string; spriteKey: string }) => {
      if (event.encounterId !== SUNFLOWER_ENCOUNTER_ID || !this.sunflower) return;
      this.sunflower.setTexture(event.spriteKey);
    };
    bus.on('encounter:resolved', handleResolved);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointerdown', handlePointerDown);
      bus.off('encounter:resolved', handleResolved);
    });
  }

  private createEncounterBadge(worldW: number): void {
    const badge = this.add.graphics();
    badge.setDepth(60);
    badge.fillStyle(0xfaf8f3, 0.92);
    badge.fillRoundedRect(worldW / 2 - 245, 24, 490, 58, 29);
    badge.lineStyle(3, 0x8aa96a, 0.9);
    badge.strokeRoundedRect(worldW / 2 - 245, 24, 490, 58, 29);

    this.add
      .text(worldW / 2, 53, 'Meadow Encounter', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: 'rgb(45, 42, 38)',
      })
      .setOrigin(0.5)
      .setDepth(61);
  }

  private paintSky(worldW: number, worldH: number): void {
    const sky = this.add.graphics();
    sky.setDepth(0);
    sky.fillStyle(0x9ed8b4, 1);
    sky.fillRect(0, 0, worldW, worldH);
    sky.fillStyle(0xc8ecd0, 1);
    sky.fillRoundedRect(0, 0, worldW, 150, 0);

    sky.fillStyle(0xfff3b0, 0.9);
    sky.fillCircle(worldW - 110, 82, 42);
    sky.fillStyle(0xfff8dc, 0.85);
    sky.fillCircle(worldW - 96, 70, 54);

    this.paintCloud(sky, 130, 78, 1);
    this.paintCloud(sky, 710, 118, 0.82);
  }

  private paintCloud(g: Phaser.GameObjects.Graphics, x: number, y: number, scale: number): void {
    g.fillStyle(0xffffff, 0.78);
    g.fillCircle(x, y, 22 * scale);
    g.fillCircle(x + 24 * scale, y - 8 * scale, 27 * scale);
    g.fillCircle(x + 54 * scale, y, 22 * scale);
    g.fillRoundedRect(x - 12 * scale, y, 86 * scale, 24 * scale, 12 * scale);
  }

  private paintDistantHills(worldW: number, worldH: number): void {
    const hills = this.add.graphics();
    hills.setDepth(2);
    hills.fillStyle(0x6fa872, 0.7);
    hills.fillEllipse(worldW * 0.22, 190, 420, 220);
    hills.fillEllipse(worldW * 0.66, 205, 520, 240);
    hills.fillStyle(0x5d9a62, 0.62);
    hills.fillEllipse(worldW * 0.42, 220, 560, 250);
    hills.fillEllipse(worldW * 0.82, 218, 430, 220);
  }

  private paintDirtPath(worldW: number, worldH: number): void {
    const path = this.add.graphics();
    path.setDepth(4);
    path.fillStyle(0xd8b37a, 0.82);
    path.fillRoundedRect(worldW / 2 - 86, 142, 172, worldH - 178, 70);
    path.fillEllipse(worldW / 2, worldH - 18, 300, 110);
    path.fillStyle(0xc99a61, 0.38);
    for (let i = 0; i < 18; i += 1) {
      const x = worldW / 2 - 62 + ((i * 37) % 124);
      const y = 170 + i * 18;
      path.fillEllipse(x, y, 8, 4);
    }
  }

  private paintMeadowDecor(worldW: number, worldH: number): void {
    const decor = this.add.graphics({ x: 0, y: 0 });
    decor.setDepth(3);
    decor.fillStyle(0x87b878, 0.45);
    decor.fillRoundedRect(8, 8, worldW - 16, worldH - 16, 28);
    decor.lineStyle(5, 0x5f8f55, 0.55);
    decor.strokeRoundedRect(16, 16, worldW - 32, worldH - 32, 34);

    decor.fillStyle(0x4f7f45, 0.35);
    for (const [x, y] of [
      [70, 96],
      [512, 78],
      [310, 454],
      [612, 398],
      [180, 272],
      [462, 238],
    ]) {
      decor.fillEllipse(x, y, 44, 18);
    }

    decor.fillStyle(0xf2c94c, 0.85);
    decor.fillCircle(94, 156, 5);
    decor.fillCircle(536, 134, 5);
    decor.fillStyle(0xe8b8a0, 0.85);
    decor.fillCircle(334, 470, 5);
    decor.fillCircle(632, 414, 5);
  }

  update(_time: number, deltaMs: number) {
    if (!this.anchor || !this.inputSystem) return;
    this.anchor.tick(this.inputSystem.readKeyboardDelta(), deltaMs);
    this.cluuShadow?.setPosition(this.cluu?.x ?? this.anchor.x, (this.cluu?.y ?? this.anchor.y) + 42);
    // CLUU-01: Cluu follows the anchor like a pet, never directly controlled.
    this.cluu?.follow(this.anchor.x, this.anchor.y, deltaMs);

    const wantsKeyboardOpen = Boolean(this.spaceKey?.isDown || this.enterKey?.isDown);
    if (wantsKeyboardOpen && this.cluu) {
      this.tryOpenEncounter(this.cluu.x, this.cluu.y);
    }
  }

  private tryOpenEncounter(x: number, y: number): void {
    if (this.encounterOpenRequested || !this.sunflower) return;

    const distance = Phaser.Math.Distance.Between(x, y, this.sunflowerX, this.sunflowerY);
    if (distance > ENCOUNTER_OPEN_RADIUS) return;

    this.encounterOpenRequested = true;
    bus.emit('encounter:open', { encounterId: SUNFLOWER_ENCOUNTER_ID });
  }

  shutdown() {
    // Pitfall 5 prevention #5: remove listeners on shutdown.
    this.inputSystem?.shutdown();
  }
}
