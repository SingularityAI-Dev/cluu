import { describe, expect, it } from 'vitest';
import { POST } from './route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/encounter/attempt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/encounter/attempt', () => {
  it('returns a flair grade for an evocative sunflower prompt', async () => {
    const res = await POST(
      makeRequest({
        encounterId: 'meadow_withered_sunflower',
        userPrompt: 'a tall golden sunflower with cracked stem, trembling petals, and warm morning light',
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.grade.verdict).toBe('flair');
    expect(json.grade.pass).toBe(true);
    expect(json.grade.flair).toBe(true);
    expect(json.grade.prompt_hash.length).toBe(64);
  });

  it('returns a fail grade for sparse prompts', async () => {
    const res = await POST(
      makeRequest({
        encounterId: 'meadow_withered_sunflower',
        userPrompt: 'fix it',
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.grade.verdict).toBe('fail');
  });

  it('returns 404 for unknown encounters', async () => {
    const res = await POST(
      makeRequest({
        encounterId: 'missing_encounter',
        userPrompt: 'a tall golden sunflower with cracked stem, trembling petals, and warm morning light',
      }),
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('encounter_not_found');
  });

  it('returns 400 when the prompt is longer than 500 characters', async () => {
    const res = await POST(
      makeRequest({
        encounterId: 'meadow_withered_sunflower',
        userPrompt: 'a'.repeat(501),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('invalid_body');
  });
});
