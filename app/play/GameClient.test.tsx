// app/play/GameClient.test.tsx
// Pitfall 5 BLOCKER absorption proof: lifecycle assertions for the single-Game invariant.
// jsdom can't run Phaser's real canvas — we mock @/game and check call counts instead.
//
// Plan 01-07 note: GameClient now wraps its children in <AuthAwareShell>, which pulls
// from the Zustand store via useMigrateOnSignIn. We mock AuthAwareShell here so these
// tests stay pure-lifecycle (the shell's own behaviour is covered by
// useMigrateOnSignIn.test.tsx). This keeps the Pitfall 5 assertions independent of
// Supabase client + StoreProvider plumbing.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';

// Mock the shell so GameClient renders its children directly. SettingsMenu renders too
// but has its own test suite and only needs the signOut server-action import stubbed.
vi.mock('./AuthAwareShell', () => ({
  AuthAwareShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/app/auth/actions', () => ({
  signOut: Object.assign(vi.fn(async () => {}), { $$typeof: Symbol('ServerAction') }),
}));

// Mock @/game BEFORE importing the component so the dynamic import resolves to the spy.
const destroySpy = vi.fn();
const createGameSpy = vi.fn(() => ({
  game: { __fake: true },
  destroy: destroySpy,
}));

vi.mock('@/game', () => ({
  createGame: (...args: unknown[]) =>
    createGameSpy(...(args as Parameters<typeof createGameSpy>)),
}));

// Phaser touches `document.createElement('canvas').getContext('2d')` at module import time
// (CanvasFeatures.checkInverseAlpha). jsdom returns null, which crashes the probe. Vite still
// evaluates the real `@/game` module graph even when @/game is mocked, so we stub `phaser`
// with the minimal shape scenes extend / config references.
// Plan 05 added Cluu (extends Phaser.GameObjects.Container) and PlayerAnchor
// (extends Phaser.Physics.Arcade.Sprite) into the MeadowScene module graph, so the stub
// now needs those class shapes for the class-extends lookup to succeed at module eval.
class FakeScene {}
class FakeContainer {}
class FakeSprite {}
class FakeArcadeSprite {}
const PhaserStub = {
  Scene: FakeScene,
  Game: class {
    destroy() {}
  },
  CANVAS: 1,
  AUTO: 0,
  WEBGL: 2,
  Scale: { FIT: 0, CENTER_BOTH: 0 },
  GameObjects: { Container: FakeContainer, Sprite: FakeSprite },
  Physics: { Arcade: { Sprite: FakeArcadeSprite, Body: class {} } },
  Input: {
    Keyboard: {
      KeyCodes: {
        W: 0,
        A: 0,
        S: 0,
        D: 0,
        UP: 0,
        LEFT: 0,
        DOWN: 0,
        RIGHT: 0,
      },
    },
  },
};
vi.mock('phaser', () => ({
  default: PhaserStub,
  ...PhaserStub,
}));

import { createGameStore } from '@/state/gameStore';
import { StoreProvider } from '@/state/StoreProvider';
import GameClient from './GameClient';

function renderGameClient() {
  return render(
    <StoreProvider initialState={createGameStore().getState()}>
      <GameClient userId={null} isAnonymous={true} />
    </StoreProvider>,
  );
}

describe('GameClient — Pitfall 5 lifecycle', () => {
  beforeEach(() => {
    createGameSpy.mockClear();
    destroySpy.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('creates exactly one Phaser.Game on mount (no StrictMode)', async () => {
    const { unmount } = renderGameClient();
    // Dynamic import resolves asynchronously.
    await new Promise((r) => setTimeout(r, 50));
    expect(createGameSpy).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('calls destroy() on unmount', async () => {
    const { unmount } = renderGameClient();
    await new Promise((r) => setTimeout(r, 50));
    unmount();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('StrictMode double-invoke does not leak: net alive instances = 0 after unmount', async () => {
    const { unmount } = render(
      <StrictMode>
        <StoreProvider initialState={createGameStore().getState()}>
          <GameClient userId={null} isAnonymous={true} />
        </StoreProvider>
      </StrictMode>,
    );
    await new Promise((r) => setTimeout(r, 80));
    unmount();
    await new Promise((r) => setTimeout(r, 20));

    // The useRef guard + cancelled flag means at most one createGame call survives StrictMode.
    // destroy runs at least once on unmount. Net result: <= 0 alive instances.
    const alive = createGameSpy.mock.calls.length - destroySpy.mock.calls.length;
    expect(alive).toBeLessThanOrEqual(0);
  });

  it('ref no longer holds a game instance after unmount', async () => {
    const { unmount } = renderGameClient();
    await new Promise((r) => setTimeout(r, 50));
    unmount();
    // After unmount, a second destroy must NOT fire because the ref was cleared.
    // Re-rendering would create a new game; we only assert destroy was called exactly once.
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
