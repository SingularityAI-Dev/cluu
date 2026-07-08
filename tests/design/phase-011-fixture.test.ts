import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = path.resolve(__dirname, '../..');

type PngDimensions = {
  width: number;
  height: number;
};

type Fixture = {
  path: string;
  dimensions: PngDimensions;
};

const phase011SpriteFixtures: Record<string, Fixture> = {
  'Cluu content idle sheet': {
    path: 'public/sprites/cluu_content.png',
    dimensions: { width: 384, height: 48 },
  },
  'Cluu back slot': {
    path: 'public/sprites/cluu_back.png',
    dimensions: { width: 48, height: 48 },
  },
  'Cluu base body slot': {
    path: 'public/sprites/cluu_base.png',
    dimensions: { width: 48, height: 48 },
  },
  'Cluu body pattern slot': {
    path: 'public/sprites/cluu_body_pattern.png',
    dimensions: { width: 48, height: 48 },
  },
  'Cluu head slot': {
    path: 'public/sprites/cluu_head.png',
    dimensions: { width: 48, height: 48 },
  },
  'Cluu eyes slot': {
    path: 'public/sprites/cluu_eyes.png',
    dimensions: { width: 48, height: 48 },
  },
  'Meadow grass tile': {
    path: 'public/sprites/grass_32.png',
    dimensions: { width: 32, height: 32 },
  },
  'Withered sunflower encounter': {
    path: 'public/sprites/encounter_meadow_sunflower_withered.png',
    dimensions: { width: 64, height: 64 },
  },
  'Revived sunflower encounter': {
    path: 'public/sprites/encounter_meadow_sunflower_revived.png',
    dimensions: { width: 64, height: 64 },
  },
};

function readPngDimensions(filePath: string): PngDimensions {
  const buffer = readFileSync(filePath);
  const signature = buffer.subarray(0, 8);
  const expectedSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  expect(signature).toEqual(expectedSignature);

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

describe('Phase 01.1 design fixture', () => {
  it('ships the Phase 01.1 Phaser sprites at the documented pixel dimensions', () => {
    for (const [name, fixture] of Object.entries(phase011SpriteFixtures)) {
      const dimensions = readPngDimensions(path.join(projectRoot, fixture.path));
      expect(dimensions).toEqual(fixture.dimensions);
    }
  });

  it('keeps the Cluu content Aseprite frame tags aligned with idle behaviours', () => {
    const metadata = JSON.parse(
      readFileSync(path.join(projectRoot, 'public/sprites/cluu_content.json'), 'utf8'),
    ) as {
      frames: Record<string, unknown>;
      meta: {
        frameTags: Array<{ name: string; from: number; to: number }>;
      };
    };

    expect(Object.keys(metadata.frames)).toHaveLength(8);
    expect(metadata.meta.frameTags).toEqual([
      { name: 'breath', from: 0, to: 1, direction: 'forward' },
      { name: 'blink', from: 2, to: 4, direction: 'forward' },
      { name: 'head_turn', from: 5, to: 7, direction: 'forward' },
    ]);
  });
});
