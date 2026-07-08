// lib/encounters/nimGrade.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gradeEncounterAttemptWithNim, nimGraderEnabled } from './nimGrade';
import type { EncounterContract } from './types';

const contract: EncounterContract = {
  id: 'meadow_withered_sunflower',
  biome: 'meadow',
  mechanic: 'describe',
  difficulty: 1,
  reward: { cosmetic: 'petal_pin', xp: 10, library_eligible: true },
  grading: { model: 'z-ai/glm-5.2', temperature: 0.2 },
  body: '## Grading contract\n- SPECIFICITY\n- DETAIL\n- CONSISTENCY\n- EVOCATIVE',
};

function nimResponse(content: string, totalTokens = 200) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { total_tokens: totalTokens },
    }),
  };
}

describe('nimGrade', () => {
  beforeEach(() => {
    vi.stubEnv('NIM_API_KEY', 'nvapi-test');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('nimGraderEnabled reflects NIM_API_KEY presence', () => {
    expect(nimGraderEnabled()).toBe(true);
    vi.stubEnv('NIM_API_KEY', '');
    expect(nimGraderEnabled()).toBe(false);
  });

  it('grades a flair verdict from clean JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        nimResponse(
          JSON.stringify({
            generatedResponse: 'The sunflower rises, petals trembling in warm light.',
            assertions: { SPECIFICITY: true, DETAIL: true, CONSISTENCY: true, EVOCATIVE: true },
          }),
        ),
      ),
    );

    const grade = await gradeEncounterAttemptWithNim({ contract, userPrompt: 'a prompt' });
    expect(grade.verdict).toBe('flair');
    expect(grade.pass).toBe(true);
    expect(grade.flair).toBe(true);
    expect(grade.tokensUsed).toBe(200);
  });

  it('strips json code fences before parsing', async () => {
    const payload = JSON.stringify({
      generatedResponse: 'The sunflower unfurls. A bee arrives.',
      assertions: { SPECIFICITY: true, DETAIL: true, CONSISTENCY: true, EVOCATIVE: false },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(nimResponse(`\`\`\`json\n${payload}\n\`\`\``)),
    );

    const grade = await gradeEncounterAttemptWithNim({ contract, userPrompt: 'a prompt' });
    expect(grade.verdict).toBe('pass');
    expect(grade.flair).toBe(false);
  });

  it('fails when any core assertion is false, even with EVOCATIVE true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        nimResponse(
          JSON.stringify({
            generatedResponse: 'The plant stirs.',
            assertions: { SPECIFICITY: false, DETAIL: false, CONSISTENCY: true, EVOCATIVE: true },
          }),
        ),
      ),
    );

    const grade = await gradeEncounterAttemptWithNim({ contract, userPrompt: 'make it nice' });
    expect(grade.verdict).toBe('fail');
    expect(grade.pass).toBe(false);
  });

  it('sends the contract model and player prompt to the NIM endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      nimResponse(
        JSON.stringify({
          generatedResponse: 'The sunflower unfurls.',
          assertions: { SPECIFICITY: true, DETAIL: true, CONSISTENCY: true, EVOCATIVE: false },
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await gradeEncounterAttemptWithNim({ contract, userPrompt: 'golden petals, green stem' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('z-ai/glm-5.2');
    expect(body.messages[1].content).toContain('golden petals, green stem');
    expect(init.headers.Authorization).toBe('Bearer nvapi-test');
  });

  it('throws on HTTP errors so the route can fall back to the local grader', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(
      gradeEncounterAttemptWithNim({ contract, userPrompt: 'a prompt' }),
    ).rejects.toThrow('NIM request failed: 429');
  });

  it('throws on malformed grader JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(nimResponse('not json at all')));
    await expect(
      gradeEncounterAttemptWithNim({ contract, userPrompt: 'a prompt' }),
    ).rejects.toThrow();
  });

  it('throws when NIM_API_KEY is missing', async () => {
    vi.stubEnv('NIM_API_KEY', '');
    await expect(
      gradeEncounterAttemptWithNim({ contract, userPrompt: 'a prompt' }),
    ).rejects.toThrow('NIM_API_KEY is not set');
  });
});
