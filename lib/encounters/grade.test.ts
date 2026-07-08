import { describe, expect, it } from 'vitest';
import { gradeEncounterAttempt } from './grade';
import { loadEncounterContract } from './loadContract';

const contract = await loadEncounterContract('meadow_withered_sunflower');

describe('gradeEncounterAttempt', () => {
  it('fails sparse prompts', async () => {
    const result = await gradeEncounterAttempt({
      contract,
      userPrompt: 'fix it',
    });

    expect(result.verdict).toBe('fail');
    expect(result.pass).toBe(false);
    expect(result.flair).toBe(false);
    expect(result.assertions.SPECIFICITY).toBe(false);
    expect(result.assertions.DETAIL).toBe(false);
  });

  it('passes specific visual prompts', async () => {
    const result = await gradeEncounterAttempt({
      contract,
      userPrompt: 'a tall yellow sunflower with cracked stem and green leaves',
    });

    expect(result.verdict).toBe('pass');
    expect(result.pass).toBe(true);
    expect(result.flair).toBe(false);
    expect(result.assertions.SPECIFICITY).toBe(true);
    expect(result.assertions.DETAIL).toBe(true);
    expect(result.assertions.EVOCATIVE).toBe(false);
  });

  it('awards flair for evocative specific prompts', async () => {
    const result = await gradeEncounterAttempt({
      contract,
      userPrompt: 'a tall golden sunflower with cracked stem, trembling petals, and warm morning light',
    });

    expect(result.verdict).toBe('flair');
    expect(result.pass).toBe(true);
    expect(result.flair).toBe(true);
    expect(result.assertions.EVOCATIVE).toBe(true);
  });

  it('fails inconsistent generated responses', async () => {
    const result = await gradeEncounterAttempt({
      contract,
      userPrompt: 'a tall golden sunflower with cracked stem, trembling petals, and warm morning light',
      generatedResponse: 'The plant stays dead and contradicts the prompt.',
    });

    expect(result.verdict).toBe('fail');
    expect(result.assertions.CONSISTENCY).toBe(false);
  });
});
