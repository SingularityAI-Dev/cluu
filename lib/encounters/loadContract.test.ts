import { describe, expect, it } from 'vitest';
import { loadEncounterContract, parseEncounterContract } from './loadContract';

describe('loadEncounterContract', () => {
  it('loads the Withered Sunflower contract from disk', async () => {
    const contract = await loadEncounterContract('meadow_withered_sunflower');

    expect(contract.id).toBe('meadow_withered_sunflower');
    expect(contract.biome).toBe('meadow');
    expect(contract.mechanic).toBe('describe');
    expect(contract.reward.cosmetic).toBe('petal_pin');
    expect(contract.reward.library_eligible).toBe(true);
    expect(contract.body).toContain("## Claude's task");
  });

  it('parses nested reward and grading frontmatter', () => {
    const contract = parseEncounterContract(`---
id: test_encounter
biome: meadow
mechanic: describe
difficulty: 2
reward:
  cosmetic: test_cosmetic
  xp: 25
  library_eligible: false
grading:
  model: claude-haiku-4-5
  temperature: 0.1
---

# Test
Body text.
`);

    expect(contract.reward).toEqual({
      cosmetic: 'test_cosmetic',
      xp: 25,
      library_eligible: false,
    });
    expect(contract.grading).toEqual({
      model: 'claude-haiku-4-5',
      temperature: 0.1,
    });
  });

  it('rejects invalid encounter slugs', async () => {
    await expect(loadEncounterContract('../secret')).rejects.toThrow('Invalid encounter slug');
  });
});
