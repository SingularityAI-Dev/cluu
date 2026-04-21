// app/play/AuthAwareShell.tsx
// Client-only shell that owns two Phase-1 auth invariants:
//   1. First-visit anonymous bootstrap (AUTH-01 + STACK.md §2): if there is no
//      Supabase user yet, call signInAnonymously() so every visitor has a
//      real auth.users row. RLS rules (auth.uid() = user_id) then work
//      uniformly for anon and authed users.
//   2. Anon→authed migration trigger (AUTH-03 client side): wired via the
//      useMigrateOnSignIn hook, which subscribes to onAuthStateChange and
//      POSTs the localStorage payload exactly once.
//
// D-17 grep gate: we intentionally use the authenticated-user helper here,
// not the cached-session helper. The user helper returns `{ user: null }`
// when no session exists, which is all we need for the "bootstrap an anon
// session?" check. This keeps the repo-wide grep gate empty (see Plan 01-04
// STATE decision on grep-returns-zero comment wording).
'use client';
import { type ReactNode, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMigrateOnSignIn } from './useMigrateOnSignIn';

export function AuthAwareShell({ children }: { children: ReactNode }) {
  useMigrateOnSignIn();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        // First visit — create the anonymous session. If the call fails
        // (rate-limit, network), we still render; Zustand persist gives a
        // local-only experience and the next visit can retry.
        await supabase.auth.signInAnonymously().catch(() => {
          /* non-fatal — see note above */
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Render children synchronously — the anon bootstrap happens in the
  // background. Phase 1 has no auth-gated UI; Phase 2 encounters will add
  // their own guards as needed.
  return <>{children}</>;
}
