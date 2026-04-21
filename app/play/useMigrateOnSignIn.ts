// app/play/useMigrateOnSignIn.ts
// Client-side companion to Plan 03's /api/migrate-anonymous (D-16).
// Fires exactly once on the anon→authed transition surfaced by Supabase's
// `onAuthStateChange`. AUTH-03 closes end-to-end here.
//
// Pitfall 4 alignment:
//   #1 — server is the merge authority; this hook only POSTs the payload.
//   #4 — we do NOT clear localStorage on success. Server is idempotent
//        (migration_processed flag); retaining localStorage is safe and also
//        lets the next session re-send if this call is lost (the server will
//        short-circuit with `already_migrated`).
//
// Deliberate absence of retry loop: if fetch throws, we swallow and leave
// `migrationCompleted.current` false. The next auth state change (e.g. the
// user signs back in next session) will re-trigger it, where the server's
// idempotency short-circuits duplicates. Avoids thundering-herd retries on
// flaky networks.
'use client';
import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGameStore } from '@/state/StoreProvider';

export function useMigrateOnSignIn(): void {
  // Pull persisted fields from Zustand (persist middleware has already
  // hydrated from localStorage by the time this hook renders in the browser).
  const idempotencyKey = useGameStore((s) => s.migrationIdempotencyKey);
  const mood = useGameStore((s) => s.mood);
  const cosmetics = useGameStore((s) => s.cosmetics);
  const unlockedBiomes = useGameStore((s) => s.unlockedBiomes);
  const islandProgress = useGameStore((s) => s.islandProgress);

  // Transition tracking refs — never cause re-renders, always see latest.
  const wasAnonymous = useRef<boolean | null>(null);
  const migrationInFlight = useRef(false);
  const migrationCompleted = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isAnon = session?.user?.is_anonymous ?? null;

      // First observation — just record baseline, no migration yet.
      if (wasAnonymous.current === null) {
        wasAnonymous.current = isAnon;
        return;
      }

      // T-07-04 guard: reset baseline on sign-out so a fresh anon→authed
      // flow still fires the migration for the *next* user on the same device.
      const transitioned = wasAnonymous.current === true && isAnon === false;
      wasAnonymous.current = isAnon;

      if (!transitioned) return;
      if (migrationInFlight.current) return;
      if (migrationCompleted.current) return;

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
          libraryEntries: [], // Phase 1: no library yet; shape reserved for Phase 3.
          userCosmetics: [], //   ditto
        }),
      })
        .then((r) => r.json())
        .then(() => {
          migrationCompleted.current = true;
        })
        .catch(() => {
          // Intentionally swallow. Sentry (Plan 06) reports client errors;
          // server idempotency makes a later retry safe. Pitfall 4 #4.
        })
        .finally(() => {
          migrationInFlight.current = false;
        });
    });

    return () => subscription.unsubscribe();
  }, [idempotencyKey, mood, cosmetics, unlockedBiomes, islandProgress]);
}
