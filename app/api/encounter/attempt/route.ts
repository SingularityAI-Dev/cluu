// app/api/encounter/attempt/route.ts
// D-16: Node runtime for encounter grading and persistence.
// Phase 2 walking skeleton: validates prompt input, grades against the .logic.md contract,
// and returns the grade shape used by the Phaser/React encounter loop.
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { EncounterContract } from '@/lib/encounters/types';
import { gradeEncounterAttempt } from '@/lib/encounters/grade';
import { loadEncounterContract } from '@/lib/encounters/loadContract';
import { gradeEncounterAttemptWithNim, nimGraderEnabled } from '@/lib/encounters/nimGrade';

export const runtime = 'nodejs';
// NIM grading can queue well past a minute on the free endpoint; keep the
// function alive long enough for the 150s adapter timeout plus fallback.
export const maxDuration = 180;

const AttemptSchema = z.object({
  encounterId: z.string().min(1),
  userPrompt: z.string().trim().min(1).max(500),
  generatedResponse: z.string().max(2_000).optional(),
});

function promptHash(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex');
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = AttemptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { encounterId, userPrompt, generatedResponse } = parsed.data;
  let contract: EncounterContract;
  try {
    contract = await loadEncounterContract(encounterId);
  } catch {
    return NextResponse.json({ error: 'encounter_not_found' }, { status: 404 });
  }

  let grade: Awaited<ReturnType<typeof gradeEncounterAttempt>>;
  if (nimGraderEnabled()) {
    try {
      grade = await gradeEncounterAttemptWithNim({ contract, userPrompt });
    } catch (error) {
      console.error('NIM grader failed, falling back to local grader', error);
      grade = await gradeEncounterAttempt({ contract, userPrompt, generatedResponse });
    }
  } else {
    grade = await gradeEncounterAttempt({ contract, userPrompt, generatedResponse });
  }

  return NextResponse.json({
    encounter: {
      id: contract.id,
      biome: contract.biome,
      mechanic: contract.mechanic,
      reward: contract.reward,
    },
    grade: {
      ...grade,
      prompt_hash: promptHash(userPrompt),
    },
  });
}
