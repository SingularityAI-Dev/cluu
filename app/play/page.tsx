// app/play/page.tsx
// /play is the ONLY route that mounts the Phaser game (Pitfall 5 prevention #1).
// Library/Wardrobe/Settings will be modals OVER this canvas (Phase 3), not separate routes.
//
// Next 16 forbids `next/dynamic({ ssr: false })` inside Server Components, so the actual
// dynamic import lives in the 'use client' GameClientLoader. This file reads the user
// server-side (cookie-bound Supabase) and hands safe props to the loader. D-09 upheld.
import { createServerClient } from '@/lib/supabase/server';
import { GameClientLoader } from './GameClientLoader';

export default async function PlayPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main
      style={{
        margin: 0,
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <GameClientLoader userId={user?.id ?? null} isAnonymous={user?.is_anonymous ?? true} />
    </main>
  );
}
