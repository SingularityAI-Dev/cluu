// lib/encounters/types.ts
// Shared encounter contract types for Phase 2+.

export type EncounterMechanic = 'describe' | 'request' | 'contract' | 'tool' | 'capstone';

export interface EncounterReward {
  cosmetic: string;
  xp: number;
  library_eligible: boolean;
}

export interface EncounterGrading {
  model: string;
  temperature: number;
}

export interface EncounterContract {
  id: string;
  biome: string;
  mechanic: EncounterMechanic;
  difficulty: number;
  reward: EncounterReward;
  grading: EncounterGrading;
  body: string;
}
