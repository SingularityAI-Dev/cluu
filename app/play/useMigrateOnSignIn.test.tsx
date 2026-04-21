// app/play/useMigrateOnSignIn.test.tsx
// Plan 07 Task 2 — proves client migration hook fires once on anon→authed.
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreProvider } from '@/state/StoreProvider';
import { useMigrateOnSignIn } from './useMigrateOnSignIn';

type Session = { user: { id: string; is_anonymous: boolean } } | null;
type Callback = (event: string, session: Session) => void;
const authCallbacks: Callback[] = [];

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange(cb: Callback) {
        authCallbacks.push(cb);
        return {
          data: { subscription: { unsubscribe: () => {} } },
        };
      },
    },
  }),
}));

function HookHarness() {
  useMigrateOnSignIn();
  return null;
}

async function flushMicrotasks() {
  // Allow the fetch mock + promise chain to resolve.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}

describe('useMigrateOnSignIn', () => {
  beforeEach(() => {
    authCallbacks.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ processed: true }),
      })) as unknown as typeof fetch,
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not POST on first observation (no transition yet)', async () => {
    render(
      <StoreProvider>
        <HookHarness />
      </StoreProvider>,
    );
    act(() => {
      authCallbacks[0]('INITIAL_SESSION', {
        user: { id: 'u1', is_anonymous: true },
      });
    });
    await flushMicrotasks();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('POSTs to /api/migrate-anonymous on anon→authed transition', async () => {
    render(
      <StoreProvider>
        <HookHarness />
      </StoreProvider>,
    );
    act(() => {
      authCallbacks[0]('INITIAL_SESSION', {
        user: { id: 'u1', is_anonymous: true },
      });
      authCallbacks[0]('USER_UPDATED', {
        user: { id: 'u1', is_anonymous: false },
      });
    });
    await flushMicrotasks();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe('/api/migrate-anonymous');
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.idempotencyKey).toBeTruthy();
    expect(body.anonymousState.cluu_mood).toBeDefined();
    expect(body.anonymousState.unlocked_biomes).toContain('meadow');
    expect(body.libraryEntries).toEqual([]);
    expect(body.userCosmetics).toEqual([]);
  });

  it('does not POST when user was already authed on mount (authed→authed no-op)', async () => {
    render(
      <StoreProvider>
        <HookHarness />
      </StoreProvider>,
    );
    act(() => {
      authCallbacks[0]('INITIAL_SESSION', {
        user: { id: 'u1', is_anonymous: false },
      });
      authCallbacks[0]('TOKEN_REFRESHED', {
        user: { id: 'u1', is_anonymous: false },
      });
    });
    await flushMicrotasks();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not POST when there is no session on mount (localStorage-only path)', async () => {
    render(
      <StoreProvider>
        <HookHarness />
      </StoreProvider>,
    );
    act(() => {
      authCallbacks[0]('INITIAL_SESSION', null);
      authCallbacks[0]('TOKEN_REFRESHED', null);
    });
    await flushMicrotasks();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not double-POST within a session', async () => {
    render(
      <StoreProvider>
        <HookHarness />
      </StoreProvider>,
    );
    act(() => {
      authCallbacks[0]('INITIAL_SESSION', {
        user: { id: 'u1', is_anonymous: true },
      });
      authCallbacks[0]('USER_UPDATED', {
        user: { id: 'u1', is_anonymous: false },
      });
    });
    await flushMicrotasks();
    // Defensive re-fire of the same transition
    act(() => {
      authCallbacks[0]('USER_UPDATED', {
        user: { id: 'u1', is_anonymous: false },
      });
    });
    await flushMicrotasks();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('carries migrationIdempotencyKey from Zustand store in the body', async () => {
    render(
      <StoreProvider initialState={{ migrationIdempotencyKey: 'idm-fixed-for-test' }}>
        <HookHarness />
      </StoreProvider>,
    );
    act(() => {
      authCallbacks[0]('INITIAL_SESSION', {
        user: { id: 'u1', is_anonymous: true },
      });
      authCallbacks[0]('USER_UPDATED', {
        user: { id: 'u1', is_anonymous: false },
      });
    });
    await flushMicrotasks();
    const [, opts] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.idempotencyKey).toBe('idm-fixed-for-test');
  });

  it('swallows endpoint failure (no uncaught promise, no retry loop)', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }) as unknown as typeof fetch,
    );
    render(
      <StoreProvider>
        <HookHarness />
      </StoreProvider>,
    );
    act(() => {
      authCallbacks[0]('INITIAL_SESSION', {
        user: { id: 'u1', is_anonymous: true },
      });
      authCallbacks[0]('USER_UPDATED', {
        user: { id: 'u1', is_anonymous: false },
      });
    });
    await flushMicrotasks();
    // One attempt; no retry loop even though migrationCompleted stays false.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
