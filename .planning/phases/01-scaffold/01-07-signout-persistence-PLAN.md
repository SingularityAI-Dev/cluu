---
phase: 01-scaffold
plan: 07
type: execute
wave: 3
depends_on: [02, 03, 04]
files_modified:
  - ui/SettingsMenu.tsx
  - ui/SettingsMenu.test.tsx
  - app/play/GameClient.tsx
  - app/play/AuthAwareShell.tsx
  - app/play/useMigrateOnSignIn.ts
  - app/play/useMigrateOnSignIn.test.tsx
  - app/page.tsx
autonomous: true
requirements:
  - AUTH-01
  - AUTH-04
  - AUTH-05

must_haves:
  truths:
    - "A top-right settings icon renders on every page of the app that shows gameplay UI (D-06)"
    - "Clicking the icon reveals a menu with a 'Sign out' button visible to both anonymous and authenticated users"
    - "Signing out invokes the `signOut` Server Action from Plan 02, which clears cookies and redirects to `/`"
    - "On first visit (no Supabase session), the app calls `supabase.auth.signInAnonymously()` to create an anonymous session (AUTH-01 + STACK.md §2)"
    - "When auth state flips from anonymous → authed (user clicked magic-link), the client POSTs localStorage state to `/api/migrate-anonymous` from Plan 03 (AUTH-03 client-side wiring)"
    - "Migration is triggered only once per upgrade — tracked by the `migrationIdempotencyKey` in the Zustand store (Plan 03)"
    - "After refresh, an authenticated user remains signed in (proxy.ts from Plan 02 keeps session fresh — this plan verifies the path end-to-end)"
    - "A unit test proves the migration hook does NOT fire when user is already authed or when localStorage was never populated"
  artifacts:
    - path: "ui/SettingsMenu.tsx"
      provides: "Top-right icon + dropdown with Sign out (D-06)"
      exports: ["SettingsMenu"]
    - path: "app/play/AuthAwareShell.tsx"
      provides: "Client shell that creates anonymous session on first visit + triggers migration on auth upgrade"
      exports: ["AuthAwareShell"]
    - path: "app/play/useMigrateOnSignIn.ts"
      provides: "Hook: subscribes to auth state changes; on anon→authed transition, POSTs to /api/migrate-anonymous"
      exports: ["useMigrateOnSignIn"]
    - path: "ui/SettingsMenu.test.tsx"
      provides: "Vitest: menu renders, sign-out invokes action"
    - path: "app/play/useMigrateOnSignIn.test.tsx"
      provides: "Vitest: fires once on upgrade, no-op otherwise"
  key_links:
    - from: "ui/SettingsMenu"
      to: "app/auth/actions.signOut"
      via: "form action attribute"
      pattern: "signOut"
    - from: "app/play/useMigrateOnSignIn"
      to: "POST /api/migrate-anonymous"
      via: "fetch on auth state change"
      pattern: "/api/migrate-anonymous"
    - from: "app/play/AuthAwareShell"
      to: "supabase.auth.signInAnonymously"
      via: "first-visit bootstrap"
      pattern: "signInAnonymously"
---

<objective>
Close two open success-criteria gaps from Plans 02-06:

1. **D-06 persistent sign-out affordance** — top-right settings icon with a "Sign out" button in the React overlay, reachable from every screen (AUTH-05).
2. **Client-side anon→authed migration trigger** — Plan 03 shipped the idempotent server endpoint; this plan wires the browser side. When `onAuthStateChange` reports a transition from `is_anonymous: true` to `is_anonymous: false`, the client POSTs the current Zustand state to `/api/migrate-anonymous`. Idempotency key from the Zustand store (Plan 03 pre-generated it) rides with the request.

Also: on first visit, create the anonymous session (STACK.md "Integration gotchas §2" — `supabase.auth.signInAnonymously()`). This closes AUTH-01 by giving every visitor a real `auth.users` row from page-load-one, with RLS keyed to `auth.uid()` working uniformly whether anonymous or authed.

Success Criterion #4 ("Signed-in user can refresh the browser and remain logged in") is proven end-to-end here: Plan 02's `proxy.ts` keeps the cookie fresh; this plan's shell confirms the user remains authed after reload.

Purpose: AUTH-01, AUTH-04, AUTH-05 pass. AUTH-03 closes end-to-end (Plan 03 was the server half; Plan 07 is the client trigger).
Output: Sign-out button visible everywhere; first-visit creates anon session; magic-link upgrade triggers migration exactly once.
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/PITFALLS.md

<interfaces>
<!-- From Plan 02 (dependencies — already created) -->
```ts
// app/auth/actions.ts
export async function signOut(): Promise<void>;

// lib/supabase/client.ts
export function createClient(): SupabaseClient<Database>;
```

<!-- From Plan 03 (dependencies — already created) -->
```ts
// state/gameStore.ts
export interface GameState {
  mood: CluuMood;
  cosmetics: CluuCosmetics;
  unlockedBiomes: string[];
  islandProgress: IslandProgress;
  migrationIdempotencyKey: string;   // ← ride this on /api/migrate-anonymous
}

// state/StoreProvider.tsx
export function useGameStore<T>(selector: (s: GameStore) => T): T;
```

```ts
// app/api/migrate-anonymous/route.ts (POST)
// Accepts:
//   {
//     idempotencyKey: string,
//     anonymousState: { cluu_mood, cluu_cosmetics, island_progress, unlocked_biomes },
//     libraryEntries: [],      // Phase 1 has none; shape ready for Phase 3
//     userCosmetics: [],       // Phase 1 has none; shape ready for Phase 3
//   }
// Returns:
//   200 { processed: true, itemsMigrated: {...} }
//   200 { processed: false, reason: 'already_migrated' }
//   400 invalid body
//   401 unauthenticated
```

<!-- From Plan 04 (dependency — already created) -->
```tsx
// app/play/GameClient.tsx — client component with the Phaser mount
// This plan wraps it with <AuthAwareShell> for the bootstrap + migration logic
```

<!-- Supabase auth change callback signature (confirmed live docs) -->
```ts
supabase.auth.onAuthStateChange((event, session) => {
  // event ∈ 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED' | 'PASSWORD_RECOVERY' | 'MFA_CHALLENGE_VERIFIED'
  // On anon→authed upgrade via updateUser, the event is 'USER_UPDATED' and session.user.is_anonymous flips to false
})
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: SettingsMenu with sign-out (D-06) + tests</name>
  <files>ui/SettingsMenu.tsx, ui/SettingsMenu.test.tsx</files>

  <read_first>
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-06 (top-right icon, reachable from every screen, including during encounter UI in Phase 2+)
    - app/auth/actions.ts (Plan 02) — `signOut` Server Action
    - CLAUDE.md — project style notes (minimal, surgical changes)
  </read_first>

  <behavior>
    - Test 1: SettingsMenu renders an icon button (aria-label="Settings")
    - Test 2: Clicking the icon opens the menu (role="menu" appears)
    - Test 3: Clicking outside the menu closes it
    - Test 4: Clicking Escape closes the menu
    - Test 5: The Sign out button is rendered inside a form with action={signOut}
    - Test 6: The component uses `position: fixed; top: ...; right: ...` — it's a persistent affordance (D-06)
  </behavior>

  <action>
Create `ui/SettingsMenu.tsx`. Server Action form submission for sign-out (no client-side JS required for the action itself):
```tsx
// ui/SettingsMenu.tsx
// D-06: persistent top-right settings affordance. Reachable from every screen.
// Phase 1: only "Sign out". Phase 3 will add "Library", "Wardrobe", "Settings".
'use client';
import { useEffect, useRef, useState } from 'react';
import { signOut } from '@/app/auth/actions';

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside handler
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 1000,
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <button
        type="button"
        aria-label="Settings"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          border: '1px solid #d9d6ce',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '1.25rem',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {/* gear glyph */}
        ⚙
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            minWidth: 180,
            padding: '0.5rem',
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #d9d6ce',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: '0.95rem',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
```

Create `ui/SettingsMenu.test.tsx`:
```tsx
// ui/SettingsMenu.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

// Mock the server action — we only want to assert the form references it
vi.mock('@/app/auth/actions', () => ({
  signOut: Object.assign(vi.fn(async () => {}), { $$typeof: Symbol('ServerAction') }),
}));

import { SettingsMenu } from './SettingsMenu';

describe('<SettingsMenu /> — D-06', () => {
  beforeEach(() => cleanup());

  it('renders the settings button with aria-label', () => {
    render(<SettingsMenu />);
    expect(screen.getByLabelText('Settings')).toBeDefined();
  });

  it('does not show the menu initially', () => {
    render(<SettingsMenu />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens the menu on click', () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getByText('Sign out')).toBeDefined();
  });

  it('closes on Escape', () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('uses fixed positioning (persistent affordance per D-06)', () => {
    render(<SettingsMenu />);
    const wrapper = screen.getByLabelText('Settings').parentElement as HTMLElement;
    const style = wrapper.getAttribute('style') ?? '';
    expect(style).toMatch(/position:\s*fixed/);
    expect(style).toMatch(/top:\s*16px/);
    expect(style).toMatch(/right:\s*16px/);
  });

  it('Sign out lives inside a form action={signOut}', () => {
    const { container } = render(<SettingsMenu />);
    fireEvent.click(screen.getByLabelText('Settings'));
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    // action prop becomes an HTML form action attribute or a react server-action reference
    // We can't easily assert the reference equality in jsdom — accept presence of the form + submit button
    const submitButton = form?.querySelector('button[type="submit"]');
    expect(submitButton?.textContent).toBe('Sign out');
  });
});
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test ui/SettingsMenu.test.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `ui/SettingsMenu.tsx` has `'use client'`
    - Wrapper uses `position: fixed; top: 16; right: 16` (D-06)
    - Menu contains a `<form action={signOut}>` with a submit button labeled "Sign out"
    - Escape key closes the menu
    - Test file has at least 6 passing tests
    - `pnpm test ui/SettingsMenu.test.tsx` exits 0
  </acceptance_criteria>

  <done>Persistent sign-out affordance (D-06) shipped with real form action tied to Plan 02's signOut Server Action.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: AuthAwareShell — first-visit anon bootstrap + anon→authed migration trigger</name>
  <files>app/play/AuthAwareShell.tsx, app/play/useMigrateOnSignIn.ts, app/play/useMigrateOnSignIn.test.tsx, app/play/GameClient.tsx, app/page.tsx</files>

  <read_first>
    - .planning/research/STACK.md — "Integration gotchas §2" (Supabase magic-link + anonymous migration; anonymous sign-ins ARE real auth users)
    - .planning/research/PITFALLS.md — Pitfall 4 prevention #4 ("Never delete localStorage until Supabase confirms") — applies here
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-04, D-16
    - state/gameStore.ts (Plan 03) — `migrationIdempotencyKey` lives in the store
    - state/StoreProvider.tsx (Plan 03) — useGameStore selector hook
    - lib/supabase/client.ts (Plan 02) — createClient()
    - app/play/GameClient.tsx (Plan 04) — what we're wrapping
  </read_first>

  <behavior>
    - Test 1: `useMigrateOnSignIn` is a no-op when there's no auth state change event
    - Test 2: When `onAuthStateChange` fires with a user that has `is_anonymous: false` AND we previously observed an anonymous session, the hook POSTs to `/api/migrate-anonymous` with the localStorage payload
    - Test 3: The hook does NOT POST if the previous observed user was already authed (no transition)
    - Test 4: The hook does NOT double-POST within a single session — a ref guard ensures single-fire per transition
    - Test 5: The hook reads the `migrationIdempotencyKey` from the Zustand store and sends it in the payload (ties to Plan 03 idempotency flag)
  </behavior>

  <action>
1. Create `app/play/useMigrateOnSignIn.ts`. Subscribes to `onAuthStateChange`, fires migration once on the anon→authed transition:
```ts
// app/play/useMigrateOnSignIn.ts
// Client-side companion to Plan 03's /api/migrate-anonymous (D-16).
// Pitfall 4 prevention #1: server-side merge, not client-side — we just POST the localStorage payload.
// Pitfall 4 prevention #4: we do NOT clear localStorage here. Retaining it is harmless because
//   server is idempotent on migration_processed flag. Server is the source of truth post-upgrade.
'use client';
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/state/StoreProvider';

export function useMigrateOnSignIn(): void {
  // Pull the state we need to migrate from Zustand (persist-middleware already loaded it from localStorage)
  const idempotencyKey = useGameStore((s) => s.migrationIdempotencyKey);
  const mood = useGameStore((s) => s.mood);
  const cosmetics = useGameStore((s) => s.cosmetics);
  const unlockedBiomes = useGameStore((s) => s.unlockedBiomes);
  const islandProgress = useGameStore((s) => s.islandProgress);

  const wasAnonymous = useRef<boolean | null>(null);
  const migrationInFlight = useRef(false);
  const migrationCompleted = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const isAnon = session?.user?.is_anonymous ?? null;

      // First observation — just record it, no migration.
      if (wasAnonymous.current === null) {
        wasAnonymous.current = isAnon;
        return;
      }

      // Anon → Authed transition (the migration trigger)
      const transitioned = wasAnonymous.current === true && isAnon === false;
      wasAnonymous.current = isAnon;

      if (!transitioned || migrationInFlight.current || migrationCompleted.current) return;

      migrationInFlight.current = true;
      fetch('/api/migrate-anonymous', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey,
          anonymousState: {
            cluu_mood: mood,
            cluu_cosmetics: cosmetics,
            island_progress: islandProgress,
            unlocked_biomes: unlockedBiomes,
          },
          libraryEntries: [],       // Phase 1: empty; Phase 3 adds entries
          userCosmetics: [],        // Phase 1: empty; Phase 3 adds
        }),
      })
        .then((r) => r.json())
        .then(() => { migrationCompleted.current = true; })
        .catch(() => {
          // Pitfall 4 #4: keep localStorage — retry on next session if needed.
          // Sentry will catch it (Plan 06 wired).
        })
        .finally(() => { migrationInFlight.current = false; });
    });

    return () => subscription.unsubscribe();
  }, [idempotencyKey, mood, cosmetics, unlockedBiomes, islandProgress]);
}
```

2. Create `app/play/AuthAwareShell.tsx`. Ensures an anonymous session exists on first visit + wires the migration hook:
```tsx
// app/play/AuthAwareShell.tsx
// First-visit bootstrap: if no Supabase session, create an anonymous one (STACK.md §2 pattern).
// AUTH-01: anonymous play works from page 1.
'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMigrateOnSignIn } from './useMigrateOnSignIn';

export function AuthAwareShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useMigrateOnSignIn();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // We intentionally use getSession() on the CLIENT here (not getUser()).
      // D-17 bans getSession() on the SERVER (security-sensitive). Client is fine.
      if (!session) {
        // First visit: create an anon session. If it fails (rate-limited etc), just render;
        // user can still play locally via Zustand persist — Phase 1 is forgiving.
        await supabase.auth.signInAnonymously().catch(() => {});
      }
      setReady(true);
    })();
  }, []);

  // Render children immediately; the anon-session creation is background.
  // Visual game doesn't need an auth check on Phase 1 (encounters in Phase 2+ do).
  return <>{children}</>;
  // Note: `ready` is intentionally unused in the render; kept for Phase 2 hooks.
  void ready;
}
```

3. Create `app/play/useMigrateOnSignIn.test.tsx`. Tests the transition detection:
```tsx
// app/play/useMigrateOnSignIn.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { StoreProvider } from '@/state/StoreProvider';
import { useMigrateOnSignIn } from './useMigrateOnSignIn';

type Callback = (event: string, session: { user: { id: string; is_anonymous: boolean } } | null) => void;
const authCallbacks: Callback[] = [];

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange(cb: Callback) {
        authCallbacks.push(cb);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  }),
}));

function HookHarness() {
  useMigrateOnSignIn();
  return null;
}

describe('useMigrateOnSignIn', () => {
  beforeEach(() => {
    authCallbacks.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ processed: true }) })) as unknown as typeof fetch,
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('does not POST on first observation (no transition yet)', async () => {
    render(<StoreProvider><HookHarness /></StoreProvider>);
    // Fire INITIAL_SESSION with an anon user
    authCallbacks[0]('INITIAL_SESSION', { user: { id: 'u1', is_anonymous: true } });
    await new Promise((r) => setTimeout(r, 10));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('POSTs to /api/migrate-anonymous on anon→authed transition', async () => {
    render(<StoreProvider><HookHarness /></StoreProvider>);
    authCallbacks[0]('INITIAL_SESSION', { user: { id: 'u1', is_anonymous: true } });
    authCallbacks[0]('USER_UPDATED', { user: { id: 'u1', is_anonymous: false } });
    await new Promise((r) => setTimeout(r, 10));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toBe('/api/migrate-anonymous');
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.idempotencyKey).toBeTruthy();
    expect(body.anonymousState.cluu_mood).toBeDefined();
  });

  it('does not POST on authed→authed no-op (e.g. TOKEN_REFRESHED)', async () => {
    render(<StoreProvider><HookHarness /></StoreProvider>);
    authCallbacks[0]('INITIAL_SESSION', { user: { id: 'u1', is_anonymous: false } });
    authCallbacks[0]('TOKEN_REFRESHED', { user: { id: 'u1', is_anonymous: false } });
    await new Promise((r) => setTimeout(r, 10));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('does not double-POST within a session', async () => {
    render(<StoreProvider><HookHarness /></StoreProvider>);
    authCallbacks[0]('INITIAL_SESSION', { user: { id: 'u1', is_anonymous: true } });
    authCallbacks[0]('USER_UPDATED', { user: { id: 'u1', is_anonymous: false } });
    await new Promise((r) => setTimeout(r, 20));
    // Fire the same transition again (defensive)
    authCallbacks[0]('USER_UPDATED', { user: { id: 'u1', is_anonymous: false } });
    await new Promise((r) => setTimeout(r, 20));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('carries migrationIdempotencyKey from Zustand store in the body', async () => {
    render(<StoreProvider initialState={{ migrationIdempotencyKey: 'idm-fixed-for-test' }}><HookHarness /></StoreProvider>);
    authCallbacks[0]('INITIAL_SESSION', { user: { id: 'u1', is_anonymous: true } });
    authCallbacks[0]('USER_UPDATED', { user: { id: 'u1', is_anonymous: false } });
    await new Promise((r) => setTimeout(r, 10));
    const [, opts] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.idempotencyKey).toBe('idm-fixed-for-test');
  });
});
```

4. Update `app/play/GameClient.tsx` to render `<AuthAwareShell>` + `<SettingsMenu>` as siblings to the canvas:
```tsx
// app/play/GameClient.tsx
'use client';
import { useEffect, useRef } from 'react';
import type { GameInstance } from '@/game';
import { AuthAwareShell } from './AuthAwareShell';
import { SettingsMenu } from '@/ui/SettingsMenu';

interface GameClientProps {
  userId: string | null;
  isAnonymous: boolean;
}

export default function GameClient(_props: GameClientProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  useEffect(() => {
    if (!parentRef.current) return;
    if (gameRef.current) return;
    let cancelled = false;
    import('@/game').then(({ createGame }) => {
      if (cancelled || !parentRef.current) return;
      gameRef.current = createGame(parentRef.current);
    });
    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <AuthAwareShell>
      <SettingsMenu />
      <div
        ref={parentRef}
        id="phaser-parent"
        style={{ width: '100%', maxWidth: 768, margin: '0 auto', aspectRatio: '4 / 3' }}
      />
    </AuthAwareShell>
  );
}
```

5. Update `app/page.tsx` (landing) to also show the settings menu (so sign-out is reachable even from the landing page — D-06 "every screen"):
```tsx
// app/page.tsx
import { SettingsMenu } from '@/ui/SettingsMenu';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <SettingsMenu />
      <h1>Cluu</h1>
      <p>
        <a href="/play">Start playing →</a>
      </p>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <a href="/auth/signin">Already signed in? Sign in to save.</a>
      </p>
    </main>
  );
}
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test app/play/useMigrateOnSignIn.test.tsx &amp;&amp; pnpm build</automated>
  </verify>

  <acceptance_criteria>
    - `app/play/useMigrateOnSignIn.ts` contains a ref guard to prevent double-fire (grep: `grep -q "migrationCompleted" app/play/useMigrateOnSignIn.ts`)
    - `app/play/AuthAwareShell.tsx` calls `supabase.auth.signInAnonymously()` on first visit when no session
    - `app/play/GameClient.tsx` wraps canvas in `<AuthAwareShell>` and shows `<SettingsMenu />`
    - `app/page.tsx` shows `<SettingsMenu />` (D-06: reachable from every screen)
    - `app/play/useMigrateOnSignIn.test.tsx` has at least 5 tests covering: no-transition, anon→authed fires, authed→authed no-op, double-fire guard, idempotency key carried
    - `pnpm build` succeeds
  </acceptance_criteria>

  <done>D-06 sign-out accessible from every screen. Anon bootstrap on first visit. Client migration trigger wired with single-fire guard. AUTH-01 + AUTH-03 + AUTH-05 end-to-end.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → Supabase Auth (anon sign-in) | First-visit endpoint; rate-limited by Supabase |
| Browser → `/api/migrate-anonymous` | Posts localStorage blob; server validates + idempotency protects against replay |
| Browser → `signOut` Server Action | Same-origin form post; CSRF protected by Next.js |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-07-01 | DoS | Malicious client loops page to burn anonymous user quota | accept | Phase 1 accepts; STACK.md §2 notes anonymous users are real auth users — Phase 2 adds `x-forwarded-for` + Upstash rate limit on the anon-sign-in path when the grading gateway is online |
| T-07-02 | Information Disclosure | Migration payload logged client-side in console/network | accept | Payload contains only the user's own state. RLS on the server ensures it cannot be routed to another user's row. |
| T-07-03 | Tampering | Client triggers fake `onAuthStateChange` via DevTools | accept | Can only affect the attacker's own session; server-side `getUser()` + migration_processed flag are the authoritative guards |
| T-07-04 | Elevation of Privilege | User signs out, then another user signs in on same browser, inherits previous user's localStorage | mitigate | `onAuthStateChange` fires SIGNED_OUT then SIGNED_IN; the `wasAnonymous.current` ref resets on SIGNED_OUT. However, localStorage is NOT cleared on sign-out in Phase 1. This is an accepted risk for solo-device cozy game with no sensitive data in localStorage. Phase 5 POPIA audit revisits. |
| T-07-05 | Denial of Service | Migration fetch fails, user stuck | mitigate | fetch().catch() swallows error, migration_completed stays false — user can refresh to retry. Sentry (Plan 06) captures failures. |
</threat_model>

<verification>
1. `pnpm test` — all prior + new tests green (store, migration server, migration client, banner, settings menu)
2. `pnpm build` succeeds
3. Manual: visit `/play` in incognito — no Supabase session beforehand, Network tab shows `signInAnonymously` firing, `auth.users` row exists server-side
4. Manual: click Sign out from the settings menu → session cleared → redirect to `/`
5. Manual (critical AUTH-04 proof): sign in via magic link, land on `/play`, REFRESH browser, observe still-signed-in (`proxy.ts` keeps cookie fresh)
6. Manual (AUTH-03 proof): play as anon, accumulate some state in Zustand, click "Save your island" → magic link → callback → client POSTs to `/api/migrate-anonymous` (verify in Network tab). Second click of the same magic link (common — email previewers) does not cause data duplication.
</verification>

<success_criteria>
- AUTH-01: anonymous play works from first visit (Supabase anon user created on first load)
- AUTH-03: client triggers migration exactly once on anon→authed transition
- AUTH-04: session persists across browser refresh (`proxy.ts` from Plan 02 + this plan's sanity check)
- AUTH-05: sign-out reachable from every screen via top-right menu (D-06)
- D-04: `updateUser({ email })` → no row migration; client migration is only for localStorage drift
- D-06: persistent settings affordance shipped
- Single-fire guard: test proves migration doesn't double-POST within a session
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-07-SUMMARY.md` with:
- Test counts for Plan 07 (SettingsMenu + useMigrateOnSignIn)
- Manual AUTH-04 refresh-persistence observation
- Manual AUTH-03 migration-fires-once observation
- Any deviations (should be none)
</output>
