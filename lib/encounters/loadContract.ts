// lib/encounters/loadContract.ts
// Loads authorable .logic.md encounter contracts from disk.
// Phase 2 starts with a tiny YAML-subset parser so the walking skeleton has no new runtime dependency.
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import type { EncounterContract } from './types';

const encounterMechanics = ['describe', 'request', 'contract', 'tool', 'capstone'] as const;

const EncounterRewardSchema = z.object({
  cosmetic: z.string().min(1),
  xp: z.number().int().nonnegative(),
  library_eligible: z.boolean(),
});

const EncounterGradingSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
});

const EncounterContractSchema = z.object({
  id: z.string().min(1),
  biome: z.string().min(1),
  mechanic: z.enum(encounterMechanics),
  difficulty: z.number().int().positive(),
  reward: EncounterRewardSchema,
  grading: EncounterGradingSchema,
});

type ParsedContract = z.infer<typeof EncounterContractSchema> & { body: string };

function parseScalar(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value.trim();
}

function parseEncounterYamlSubset(frontmatter: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  let section: string | null = null;

  for (const rawLine of frontmatter.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (line.trim() === '') continue;

    const nested = line.match(/^ {2}([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (nested && section) {
      const [, key, value] = nested;
      const target = result[section] as Record<string, unknown>;
      target[key] = parseScalar(value);
      continue;
    }

    const topLevel = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!topLevel) {
      throw new Error(`Invalid encounter frontmatter line: ${rawLine}`);
    }

    const [, key, value] = topLevel;
    if (value === '') {
      result[key] = {};
      section = key;
    } else {
      result[key] = parseScalar(value);
      section = null;
    }
  }

  return result;
}

function splitFrontmatter(markdown: string): { frontmatter: string; body: string } {
  const trimmed = markdown.trimStart();
  if (!trimmed.startsWith('---\n')) {
    throw new Error('Encounter contract must start with YAML frontmatter.');
  }

  const closingIndex = trimmed.indexOf('\n---\n', 4);
  if (closingIndex === -1) {
    throw new Error('Encounter contract frontmatter is missing its closing --- delimiter.');
  }

  return {
    frontmatter: trimmed.slice(4, closingIndex),
    body: trimmed.slice(closingIndex + 5),
  };
}

export function parseEncounterContract(markdown: string): EncounterContract {
  const { frontmatter, body } = splitFrontmatter(markdown);
  const parsed = EncounterContractSchema.parse(parseEncounterYamlSubset(frontmatter));
  return { ...parsed, body } as EncounterContract;
}

export async function loadEncounterContract(slug: string): Promise<EncounterContract> {
  if (!/^[a-z0-9_]+$/.test(slug)) {
    throw new Error(`Invalid encounter slug: ${slug}`);
  }

  const filePath = path.join(process.cwd(), 'encounters', `${slug}.logic.md`);
  const markdown = await readFile(filePath, 'utf8');
  return parseEncounterContract(markdown);
}
