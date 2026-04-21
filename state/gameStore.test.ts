// state/gameStore.test.ts
// D-15 / Pitfall 5 adjacent: prove the Store Factory is not leaking.
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameStore, STORAGE_KEY } from './gameStore';

describe('gameStore — Store Factory pattern', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('createGameStore returns independent instances (no shared state)', () => {
    const a = createGameStore();
    const b = createGameStore();
    a.getState().setMood('stoked');
    expect(a.getState().mood).toBe('stoked');
    expect(b.getState().mood).toBe('content');
  });

  it('defaults match DEFAULT_STATE for non-persisted fields', () => {
    const store = createGameStore();
    const s = store.getState();
    expect(s.mood).toBe('content'); // D-14
    expect(s.cosmetics).toEqual({ head: null, body: null, back: null, eyes: null });
    expect(s.unlockedBiomes).toEqual(['meadow']);
    expect(s.anchor).toEqual({ x: 0, y: 0 });
  });

  it('generates a migration idempotency key automatically', () => {
    const store = createGameStore();
    // Either a crypto.randomUUID (36-char v4) or the fallback idm-... / test-... shim
    expect(store.getState().migrationIdempotencyKey).toMatch(/^(idm-|test-|[0-9a-f-]{36}$)/);
  });

  it('setMood mutates only mood, not cosmetics', () => {
    const store = createGameStore();
    const before = store.getState().cosmetics;
    store.getState().setMood('sleepy');
    expect(store.getState().mood).toBe('sleepy');
    expect(store.getState().cosmetics).toBe(before);
  });

  it('setEquipped mutates one slot, leaves others', () => {
    const store = createGameStore();
    store.getState().setEquipped('head', 'petal_pin');
    const c = store.getState().cosmetics;
    expect(c.head).toBe('petal_pin');
    expect(c.body).toBeNull();
    expect(c.back).toBeNull();
    expect(c.eyes).toBeNull();
  });

  it('persist uses the cluu-game-v1 storage key', async () => {
    const store = createGameStore();
    store.getState().setMood('stoked');
    // zustand persist is async; wait a tick for the write to flush.
    await new Promise((r) => setTimeout(r, 10));
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(STORAGE_KEY).toBe('cluu-game-v1'); // D-15 exact wording
  });

  it('anchor is NOT in the persisted partial (Pattern 4: anchor never syncs)', async () => {
    const store = createGameStore();
    store.getState().setAnchor({ x: 500, y: 300 });
    await new Promise((r) => setTimeout(r, 10));
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    expect(parsed?.state?.anchor).toBeUndefined();
    // mood SHOULD be there
    expect(parsed?.state?.mood).toBeDefined();
  });

  it('reset returns state to defaults with a fresh idempotency key', () => {
    const store = createGameStore();
    const keyA = store.getState().migrationIdempotencyKey;
    store.getState().setMood('blue');
    store.getState().reset();
    expect(store.getState().mood).toBe('content');
    expect(store.getState().migrationIdempotencyKey).not.toBe(keyA);
  });
});
