// lib/migrate/idempotency.test.ts
// Pitfall 4 BLOCKER TEST: double-invoke of applyAnonymousMigration is a no-op.
// Uses a fake in-memory Supabase-like client so the test is pure (no live DB).
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { applyAnonymousMigration, type MigrationPayload } from './idempotency';

type FakeState = {
  player_state: Map<
    string,
    { user_id: string; migration_processed: boolean; cluu_mood: string }
  >;
  library_entries: Array<{
    user_id: string;
    encounter_id: string;
    prompt_text: string;
  }>;
  user_cosmetics: Map<string, { user_id: string; cosmetic_id: string }>;
};

type FakeSupabase = SupabaseClient<Database> & { __state: FakeState };

function makeFakeSupabase(initial: { migration_processed: boolean }): FakeSupabase {
  const state: FakeState = {
    player_state: new Map(),
    library_entries: [],
    user_cosmetics: new Map(),
  };
  state.player_state.set('user-a', {
    user_id: 'user-a',
    migration_processed: initial.migration_processed,
    cluu_mood: 'content',
  });

  type TableName = 'player_state' | 'library_entries' | 'user_cosmetics';

  const chain = (table: TableName) => ({
    select(_cols: string) {
      return {
        eq: (_col: string, val: string) => ({
          single: async () => {
            if (table === 'player_state') {
              const row = state.player_state.get(val);
              return row
                ? { data: row, error: null }
                : { data: null, error: { message: 'not found' } };
            }
            return { data: null, error: null };
          },
        }),
      };
    },
    update(patch: Record<string, unknown>) {
      return {
        eq: async (_col: string, val: string) => {
          if (table === 'player_state') {
            const row = state.player_state.get(val);
            if (row) Object.assign(row, patch);
          }
          return { data: null, error: null };
        },
      };
    },
    insert(rows: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows];
      return {
        select: async (_cols?: string) => {
          if (table === 'library_entries') {
            state.library_entries.push(
              ...(arr as Array<{
                user_id: string;
                encounter_id: string;
                prompt_text: string;
              }>),
            );
          }
          return {
            data: arr.map((_, i) => ({ id: `id-${i}` })),
            error: null,
          };
        },
      };
    },
    upsert(rows: unknown, _opts?: unknown) {
      const arr = Array.isArray(rows) ? rows : [rows];
      return {
        select: async (_cols?: string) => {
          if (table === 'user_cosmetics') {
            for (const r of arr as Array<{
              user_id: string;
              cosmetic_id: string;
            }>) {
              const k = `${r.user_id}:${r.cosmetic_id}`;
              if (!state.user_cosmetics.has(k)) state.user_cosmetics.set(k, r);
            }
          }
          return {
            data: arr.map((r) => ({
              cosmetic_id: (r as { cosmetic_id: string }).cosmetic_id,
            })),
            error: null,
          };
        },
      };
    },
  });

  const fake = {
    from: (table: string) => chain(table as TableName),
    __state: state,
  } as unknown as FakeSupabase;
  return fake;
}

const samplePayload: MigrationPayload = {
  idempotencyKey: 'idm-test-1',
  anonymousState: {
    cluu_mood: 'stoked',
    cluu_cosmetics: { head: 'petal_pin', body: null, back: null, eyes: null },
    island_progress: {
      meadow: { completed_encounters: ['withered_sunflower'], current_xp: 10 },
    },
    unlocked_biomes: ['meadow'],
  },
  libraryEntries: [
    {
      encounter_id: 'meadow_sunflower',
      prompt_text: 'test',
      generated_response: 'gen',
      grade: 'flair',
      tags: ['describe'],
    },
    {
      encounter_id: 'meadow_chime',
      prompt_text: 'test2',
      generated_response: 'gen2',
      grade: 'pass',
      tags: ['describe'],
    },
  ],
  userCosmetics: [
    { cosmetic_id: 'petal_pin', acquisition_source: 'meadow_sunflower' },
  ],
};

describe('applyAnonymousMigration — Pitfall 4 idempotency', () => {
  it('first call processes the migration', async () => {
    const fake = makeFakeSupabase({ migration_processed: false });
    const result = await applyAnonymousMigration(fake, 'user-a', samplePayload);
    expect(result.processed).toBe(true);
    if (result.processed) {
      expect(result.itemsMigrated.libraryEntries).toBe(2);
      expect(result.itemsMigrated.userCosmetics).toBe(1);
    }
    // Flag is now true
    expect(fake.__state.player_state.get('user-a')?.migration_processed).toBe(true);
  });

  it('second call (already processed) is a no-op and returns already_migrated', async () => {
    const fake = makeFakeSupabase({ migration_processed: true });
    const result = await applyAnonymousMigration(fake, 'user-a', samplePayload);
    expect(result.processed).toBe(false);
    if (!result.processed) expect(result.reason).toBe('already_migrated');
    // No library rows written
    expect(fake.__state.library_entries.length).toBe(0);
  });

  it('double-invoke idempotent: second call does not duplicate rows', async () => {
    const fake = makeFakeSupabase({ migration_processed: false });
    const first = await applyAnonymousMigration(fake, 'user-a', samplePayload);
    const second = await applyAnonymousMigration(fake, 'user-a', samplePayload);

    expect(first.processed).toBe(true);
    expect(second.processed).toBe(false);
    // Still 2 entries, not 4
    expect(fake.__state.library_entries.length).toBe(2);
    // Still 1 cosmetic, not 2
    expect(fake.__state.user_cosmetics.size).toBe(1);
  });

  it('empty payload still flips the flag (zero-progress anon session)', async () => {
    const fake = makeFakeSupabase({ migration_processed: false });
    const empty: MigrationPayload = {
      idempotencyKey: 'idm-test-2',
      anonymousState: samplePayload.anonymousState,
      libraryEntries: [],
      userCosmetics: [],
    };
    const result = await applyAnonymousMigration(fake, 'user-a', empty);
    expect(result.processed).toBe(true);

    // Second call short-circuits
    const second = await applyAnonymousMigration(fake, 'user-a', empty);
    expect(second.processed).toBe(false);
  });
});
