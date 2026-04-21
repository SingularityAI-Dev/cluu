// app/play/GameClient.tsx
// D-09: the ONE import boundary from Next into Phaser.
// Pitfall 5 absorbed: useRef guard + cleanup invariant + StrictMode compatible.
//
// Plan 01-07 wraps the canvas in <AuthAwareShell> so:
//   - first-visit anonymous Supabase session is created (AUTH-01)
//   - onAuthStateChange drives the anon→authed migration POST (AUTH-03 client)
// and renders <SettingsMenu /> so D-06 is reachable during gameplay.
'use client';
import { useEffect, useRef } from 'react';
import type { GameInstance } from '@/game';
import { SettingsMenu } from '@/ui/SettingsMenu';
import { AuthAwareShell } from './AuthAwareShell';

interface GameClientProps {
  userId: string | null;
  isAnonymous: boolean;
}

export default function GameClient(_props: GameClientProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameInstance | null>(null);

  useEffect(() => {
    if (!parentRef.current) return;
    // StrictMode double-invoke guard: only create if we don't have a game yet.
    if (gameRef.current) return;

    let cancelled = false;

    // Dynamic import keeps Phaser out of the initial bundle tree until /play is visited.
    // Because THIS file is 'use client', we could import at top-level and it would still be
    // client-only — but inline dynamic import is gentler on the SSR RSC boundary.
    import('@/game').then(({ createGame }) => {
      if (cancelled || !parentRef.current) return;
      // Extra safety: StrictMode can schedule a second useEffect before the first
      // dynamic import resolves, so re-check the ref at resolution time too.
      if (gameRef.current) return;
      gameRef.current = createGame(parentRef.current);
    });

    return () => {
      cancelled = true;
      // Pitfall 5 prevention #3 — the cleanup invariant.
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
