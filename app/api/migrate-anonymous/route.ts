// app/api/migrate-anonymous/route.ts
// D-16: idempotent anon->authed migration endpoint. Pitfall 4 mitigation.
// D-22: Node.js runtime — Vercel Fluid Compute default; do NOT switch to Edge.
// D-17: uses supabase.auth.getUser() only — never the cached-session helper.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  applyAnonymousMigration,
  type MigrationPayload,
} from '@/lib/migrate/idempotency';
import { createServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MigrationSchema = z.object({
  idempotencyKey: z.string().min(1),
  anonymousState: z.object({
    cluu_mood: z.enum(['stoked', 'content', 'sleepy', 'blue']),
    cluu_cosmetics: z.object({
      head: z.string().nullable(),
      body: z.string().nullable(),
      back: z.string().nullable(),
      eyes: z.string().nullable(),
    }),
    island_progress: z.record(z.string(), z.unknown()),
    unlocked_biomes: z.array(z.string()),
  }),
  libraryEntries: z.array(
    z.object({
      encounter_id: z.string(),
      prompt_text: z.string().max(500),
      generated_response: z.string(),
      grade: z.enum(['pass', 'flair']),
      tags: z.array(z.string()),
    }),
  ),
  userCosmetics: z.array(
    z.object({
      cosmetic_id: z.string(),
      acquisition_source: z.string().nullable().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  const supabase = await createServerClient();

  // D-17: getUser(), never the cached-session helper.
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = MigrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await applyAnonymousMigration(
      supabase,
      user.id,
      parsed.data as MigrationPayload,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    // T-03-04 mitigation: echo only Error.message, never the payload.
    return NextResponse.json(
      { error: 'migration_failed', message },
      { status: 500 },
    );
  }
}
