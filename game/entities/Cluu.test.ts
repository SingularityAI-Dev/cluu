// game/entities/Cluu.test.ts
// D-14 no-op-but-real proof: setMood / setEquipped exist and behave correctly.
// D-13 proof: exactly 5 child sprites in z-order (back, base, bodyPattern, head, eyes).
// D-11 proof: seekTarget respects the 24px STOP_RADIUS.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STOP_RADIUS, seekTarget } from '../systems/follow';

// Cluu uses Phaser; jsdom cannot run real Phaser. Mock the minimum surface
// that `Cluu` touches when it extends Phaser.GameObjects.Container.
vi.mock('phaser', () => {
  class FakeSprite {
    texture = { key: '' };
    constructor(_s: unknown, _x: number, _y: number, key: string) {
      this.texture.key = key;
    }
    setTexture(key: string): this {
      this.texture.key = key;
      return this;
    }
  }
  class FakeContainer {
    // biome-ignore lint/suspicious/noExplicitAny: fake-scene container holds heterogenous children
    private children: any[] = [];
    length = 0;
    body: unknown = null;
    // biome-ignore lint/suspicious/noExplicitAny: fake scene is a loose stub
    constructor(
      public scene: any,
      public x: number,
      public y: number,
    ) {}
    // biome-ignore lint/suspicious/noExplicitAny: mirrors Phaser.GameObjects.Container.add signature
    add(items: any | any[]): this {
      const arr = Array.isArray(items) ? items : [items];
      this.children.push(...arr);
      this.length = this.children.length;
      return this;
    }
  }
  const PhaserStub = {
    GameObjects: { Container: FakeContainer, Sprite: FakeSprite },
    Physics: { Arcade: { Body: class {} } },
  };
  return { default: PhaserStub, ...PhaserStub, __esModule: true };
});

type FakeSpriteShape = { texture: { key: string }; setTexture: (k: string) => FakeSpriteShape };
type FakeScene = {
  sprites: FakeSpriteShape[];
  add: {
    sprite: (x: number, y: number, key: string) => FakeSpriteShape;
    existing: (o: unknown) => void;
  };
  physics: {
    add: {
      existing: (o: { body?: unknown }) => void;
    };
  };
};

function makeFakeScene(): FakeScene {
  const sprites: FakeSpriteShape[] = [];
  return {
    sprites,
    add: {
      sprite(_x: number, _y: number, key: string): FakeSpriteShape {
        const s: FakeSpriteShape = {
          texture: { key },
          setTexture(k: string) {
            this.texture.key = k;
            return this;
          },
        };
        sprites.push(s);
        return s;
      },
      existing(_o: unknown) {
        /* no-op */
      },
    },
    physics: {
      add: {
        existing(o: { body?: unknown }) {
          o.body = {
            setCollideWorldBounds(_b: boolean) {
              /* no-op */
            },
            setSize(_w: number, _h: number) {
              /* no-op */
            },
            setVelocity(_x: number, _y: number) {
              /* no-op */
            },
          };
        },
      },
    },
  };
}

// Lazy-import Cluu AFTER the Phaser mock is installed via vi.mock hoisting.
async function loadCluu() {
  const mod = await import('./Cluu');
  return mod.Cluu;
}

describe('Cluu entity — D-13 compositing pipeline + D-14 API surface', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('constructs with exactly 5 child sprites (back, base, bodyPattern, head, eyes)', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny: fake-scene shape differs from Phaser.Scene
    const cluu = new Cluu(scene as any, 0, 0);
    expect(cluu.getChildCount()).toBe(5);
  });

  it('seeds slot textures in z-order: back, base, bodyPattern, head, eyes', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    new Cluu(scene as any, 0, 0);
    expect(scene.sprites.map((s) => s.texture.key)).toEqual([
      'cluu_back',
      'cluu_base',
      'cluu_body_pattern',
      'cluu_head',
      'cluu_eyes',
    ]);
  });

  it('setMood accepts all four moods without throwing (D-14 no-op-but-real)', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    const cluu = new Cluu(scene as any, 0, 0);
    for (const m of ['stoked', 'content', 'sleepy', 'blue'] as const) {
      expect(() => cluu.setMood(m)).not.toThrow();
      expect(cluu.getMood()).toBe(m);
    }
  });

  it('setEquipped swaps texture on the targeted slot (D-13 pipeline is real)', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    const cluu = new Cluu(scene as any, 0, 0);
    cluu.setEquipped('head', 'petal_pin');
    // z-order: [back=0, base=1, bodyPattern=2, head=3, eyes=4]
    expect(scene.sprites[3].texture.key).toBe('petal_pin');
  });

  it('setEquipped(slot, null) resets slot to blank placeholder', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    const cluu = new Cluu(scene as any, 0, 0);
    cluu.setEquipped('body', 'stripes');
    cluu.setEquipped('body', null);
    // body (bodyPattern) is index 2 in z-order
    expect(scene.sprites[2].texture.key).toBe('cluu_body_pattern');
  });

  it('setEquipped targets each slot independently', async () => {
    const Cluu = await loadCluu();
    const scene = makeFakeScene();
    // biome-ignore lint/suspicious/noExplicitAny
    const cluu = new Cluu(scene as any, 0, 0);
    cluu.setEquipped('back', 'back_bag');
    cluu.setEquipped('head', 'hat_a');
    cluu.setEquipped('eyes', 'eyes_wink');
    cluu.setEquipped('body', 'stripes');
    expect(scene.sprites[0].texture.key).toBe('back_bag'); // back
    expect(scene.sprites[1].texture.key).toBe('cluu_base'); // base untouched
    expect(scene.sprites[2].texture.key).toBe('stripes'); // body
    expect(scene.sprites[3].texture.key).toBe('hat_a'); // head
    expect(scene.sprites[4].texture.key).toBe('eyes_wink'); // eyes
  });
});

describe('seekTarget — D-11 24px stop radius', () => {
  it('returns velocity pointing toward target when distant', () => {
    const v = seekTarget({ x: 0, y: 0 }, { x: 100, y: 0 }, 160);
    expect(v.x).toBeCloseTo(160);
    expect(v.y).toBeCloseTo(0);
  });

  it('returns zero velocity within STOP_RADIUS', () => {
    const v = seekTarget({ x: 0, y: 0 }, { x: 10, y: 10 }, 160);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('stops exactly at STOP_RADIUS boundary', () => {
    const v = seekTarget({ x: 0, y: 0 }, { x: STOP_RADIUS, y: 0 }, 160);
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('normalizes direction regardless of distance', () => {
    // 3-4-5 triangle, distance 500, normalized -> (0.6, 0.8) * 100
    const v = seekTarget({ x: 0, y: 0 }, { x: 300, y: 400 }, 100);
    expect(v.x).toBeCloseTo(60);
    expect(v.y).toBeCloseTo(80);
  });

  it('STOP_RADIUS constant equals 24 (D-11 literal)', () => {
    expect(STOP_RADIUS).toBe(24);
  });
});
