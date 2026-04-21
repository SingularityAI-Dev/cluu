// tests/rls-negative.test.ts
// PERS-02 ship gate: user A cannot read or mutate user B's player_state.
// Runs against the local Supabase stack (pnpm exec supabase start) in dev;
// Phase 5 may wire a CI-runnable stack. Skipped when env vars are absent.
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database } from '@/lib/supabase/types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasCreds = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_ROLE_KEY);

type UserHandle = { id: string; email: string; password: string };

async function adminCreateUser(email: string, password: string): Promise<UserHandle> {
  const admin = createClient<Database>(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email verification for the test
  });
  if (error) throw new Error(`admin.createUser failed: ${error.message}`);
  if (!data.user) throw new Error('admin.createUser returned no user');
  return { id: data.user.id, email, password };
}

async function adminDeleteUser(id: string): Promise<void> {
  const admin = createClient<Database>(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await admin.auth.admin.deleteUser(id);
}

async function signedInClient(user: UserHandle) {
  const client = createClient<Database>(SUPABASE_URL as string, ANON_KEY as string, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`signIn failed for ${user.email}: ${error.message}`);
  return client;
}

describe.skipIf(!hasCreds)('RLS negative test — PERS-02 (D-18)', () => {
  let userA: UserHandle;
  let userB: UserHandle;

  beforeAll(async () => {
    const suffix = Date.now();
    userA = await adminCreateUser(`rls-a-${suffix}@example.test`, 'rls-test-pw-A-123!');
    userB = await adminCreateUser(`rls-b-${suffix}@example.test`, 'rls-test-pw-B-123!');
    // The trigger auto-creates public.player_state rows for both.
  });

  afterAll(async () => {
    // Cascade-deletes the public.player_state rows too.
    if (userA) await adminDeleteUser(userA.id).catch(() => {});
    if (userB) await adminDeleteUser(userB.id).catch(() => {});
  });

  it('user A can SELECT their own player_state (positive sanity)', async () => {
    const client = await signedInClient(userA);
    const { data, error } = await client.from('player_state').select('*');
    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data?.length).toBe(1);
    expect(data?.[0].user_id).toBe(userA.id);
  });

  it('user A cannot read another user (user B) player_state row [PERS-02 NEGATIVE GATE]', async () => {
    const client = await signedInClient(userA);
    const { data, error } = await client
      .from('player_state')
      .select('*')
      .eq('user_id', userB.id);
    // RLS returns empty — NOT an error, NOT user B's data.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('user A cannot UPDATE user B player_state row (RLS with check blocks it)', async () => {
    const client = await signedInClient(userA);
    const { data, error } = await client
      .from('player_state')
      .update({ cluu_mood: 'stoked' })
      .eq('user_id', userB.id)
      .select();
    // No rows match the policy — update affects zero rows.
    expect(error).toBeNull();
    expect(data).toEqual([]);

    // Verify user B's row was NOT mutated — read via service role.
    const admin = createClient<Database>(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: bState } = await admin
      .from('player_state')
      .select('cluu_mood')
      .eq('user_id', userB.id)
      .single();
    expect(bState?.cluu_mood).toBe('content'); // default, unchanged
  });

  it('user A cannot INSERT a library_entry as user B (RLS with check on user_id)', async () => {
    const client = await signedInClient(userA);
    const { error } = await client.from('library_entries').insert({
      user_id: userB.id, // attempted spoof
      encounter_id: 'meadow_test',
      prompt_text: 'should not land',
      generated_response: '...',
      grade: 'pass',
      tags: [],
    });
    // RLS rejects this insert with a policy violation.
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/row.?level security|policy|violates/);
  });
});
