// lib/encounters/grade.ts
// Deterministic local grader for the Phase 2 walking skeleton.
// This keeps /play testable without API keys while preserving the future Anthropic adapter boundary.
import type { EncounterContract, EncounterMechanic } from './types';

export type AttemptVerdict = 'fail' | 'pass' | 'flair';

export interface GradeResult {
  verdict: AttemptVerdict;
  pass: boolean;
  flair: boolean;
  generatedResponse: string;
  assertions: Record<string, boolean>;
  tokensUsed: number;
  cached: boolean;
}

interface GradeInput {
  contract: EncounterContract;
  userPrompt: string;
  generatedResponse?: string;
}

const specificityTerms = [
  'sunflower',
  'stem',
  'petals',
  'petal',
  'leaves',
  'leaf',
  'bloom',
  'bud',
  'soil',
  'bee',
  'gold',
  'yellow',
  'green',
  'cracked',
  'droop',
  'tall',
];

const detailTerms = [
  'tall',
  'cracked',
  'golden',
  'gold',
  'yellow',
  'green',
  'fragile',
  'wilted',
  'drooping',
  'droop',
  'bright',
  'fresh',
  'morning',
  'warm',
  'soft',
  'trembling',
  'sea',
  'wind',
  'dawn',
  'glowing',
];

const evocativeTerms = [
  'morning',
  'warm',
  'soft',
  'trembling',
  'sea',
  'wind',
  'dawn',
  'glowing',
  'golden',
  'gold',
  'fragile',
  'fresh',
];

function containsAny(normalizedPrompt: string, terms: string[]): boolean {
  return terms.some((term) => normalizedPrompt.includes(term));
}

function generatedResponseFor(verdict: AttemptVerdict): string {
  if (verdict === 'flair') {
    return 'The sunflower rises, petals trembling in warm morning light as three bees arrive.';
  }

  if (verdict === 'pass') {
    return 'The sunflower unfurls, stem steady and petals open. A bee arrives.';
  }

  return 'The plant stirs, but the description is too thin to wake it fully.';
}

function assertSunflowerContract(contract: EncounterContract): void {
  if (contract.id !== 'meadow_withered_sunflower') {
    throw new Error(`Unsupported encounter for local grader: ${contract.id}`);
  }

  if (contract.mechanic !== ('describe' satisfies EncounterMechanic)) {
    throw new Error(`Unsupported mechanic for local grader: ${contract.mechanic}`);
  }
}

export async function gradeEncounterAttempt(input: GradeInput): Promise<GradeResult> {
  assertSunflowerContract(input.contract);

  const normalizedPrompt = input.userPrompt.toLowerCase();
  const generatedResponse = input.generatedResponse ?? '';
  const normalizedResponse = generatedResponse.toLowerCase();

  const assertions = {
    SPECIFICITY: containsAny(normalizedPrompt, specificityTerms),
    DETAIL: containsAny(normalizedPrompt, detailTerms),
    CONSISTENCY: !['contradict', 'not'].some((term) => normalizedResponse.includes(term)),
    EVOCATIVE: containsAny(normalizedPrompt, evocativeTerms),
  };

  const pass = assertions.SPECIFICITY && assertions.DETAIL && assertions.CONSISTENCY;
  const flair = pass && assertions.EVOCATIVE;
  const verdict: AttemptVerdict = flair ? 'flair' : pass ? 'pass' : 'fail';
  const generated = input.generatedResponse ?? generatedResponseFor(verdict);
  const tokensUsed = Math.max(1, Math.ceil((input.userPrompt.length + generated.length) / 4));

  return {
    verdict,
    pass,
    flair,
    generatedResponse: generated,
    assertions,
    tokensUsed,
    cached: false,
  };
}
