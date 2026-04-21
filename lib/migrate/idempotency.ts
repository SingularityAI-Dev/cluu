// lib/migrate/idempotency.ts
// Pitfall 4 mitigation (BLOCKER):
//   - Server-side merge, not client-side (prevention #1)
//   - Idempotency flag on player_state.migration_processed (prevention #2, seeded by Plan 02)
//   - Server never trusts client-supplied user_id: caller passes authed user.id only
//
// Consumed by: app/api/migrate-anonymous/route.ts
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/supabase/types';

export interface MigrationPayload {
  idempotencyKey: string;
  anonymousState: {
    cluu_mood: 'stoked' | 'content' | 'sleepy' | 'blue';
    cluu_cosmetics: {
      head: string | null;
      body: string | null;
      back: string | null;
      eyes: string | null;
    };
    island_progress: Record<string, unknown>;
    unlocked_biomes: string[];
  };
  libraryEntries: Array<{
    encounter_id: string;
    prompt_text: string;
    generated_response: string;
    grade: 'pass' | 'flair';
    tags: string[];
  }>;
  userCosmetics: Array<{ cosmetic_id: string; acquisition_source?: string | null }>;
}

export type MigrationResult =
  | {
      processed: true;
      itemsMigrated: { libraryEntries: number; userCosmetics: number };
    }
  | { processed: false; reason: 'already_migrated' };

export async function applyAnonymousMigration(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: MigrationPayload,
): Promise<MigrationResult> {
  // Step 1: check the idempotency flag. If already migrated, no-op.
  const { data: existing, error: selErr } = await supabase
    .from('player_state')
    .select('migration_processed')
    .eq('user_id', userId)
    .single();

  if (selErr) throw new Error(`Failed to read player_state: ${selErr.message}`);
  if (existing?.migration_processed) {
    return { processed: false, reason: 'already_migrated' };
  }

  // Step 2: merge player_state (mood, cosmetics, progress, biomes) AND set the flag
  // in one update. This is the "commit" point — anything that throws before this
  // leaves the flag false, so the next call will retry cleanly.
  const { error: psErr } = await supabase
    .from('player_state')
    .update({
      cluu_mood: payload.anonymousState.cluu_mood,
      // Runtime shape validated at the zod boundary in the route handler;
      // cast here because Json's recursive type is stricter than Record<string, unknown>.
      cluu_cosmetics: payload.anonymousState.cluu_cosmetics as unknown as Json,
      island_progress: payload.anonymousState.island_progress as unknown as Json,
      unlocked_biomes: payload.anonymousState.unlocked_biomes,
      migration_processed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (psErr) throw new Error(`Failed to update player_state: ${psErr.message}`);

  // Step 3: insert library entries. RLS auto-scopes writes to auth.uid().
  let libCount = 0;
  if (payload.libraryEntries.length > 0) {
    const rows = payload.libraryEntries.map((e) => ({
      user_id: userId,
      encounter_id: e.encounter_id,
      prompt_text: e.prompt_text,
      generated_response: e.generated_response,
      grade: e.grade,
      tags: e.tags,
    }));
    const { data: inserted, error: libErr } = await supabase
      .from('library_entries')
      .insert(rows)
      .select('id');
    if (libErr) throw new Error(`Failed to insert library_entries: ${libErr.message}`);
    libCount = inserted?.length ?? 0;
  }

  // Step 4: insert user_cosmetics. Upsert w/ ignoreDuplicates keeps this safe even
  // against a race with another code path granting the same cosmetic.
  let cosCount = 0;
  if (payload.userCosmetics.length > 0) {
    const rows = payload.userCosmetics.map((c) => ({
      user_id: userId,
      cosmetic_id: c.cosmetic_id,
      acquisition_source: c.acquisition_source ?? null,
    }));
    const { data: inserted, error: cosErr } = await supabase
      .from('user_cosmetics')
      .upsert(rows, { onConflict: 'user_id,cosmetic_id', ignoreDuplicates: true })
      .select('cosmetic_id');
    if (cosErr) throw new Error(`Failed to insert user_cosmetics: ${cosErr.message}`);
    cosCount = inserted?.length ?? 0;
  }

  return {
    processed: true,
    itemsMigrated: { libraryEntries: libCount, userCosmetics: cosCount },
  };
}
