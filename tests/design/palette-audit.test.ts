import { readFileSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { hexToInt, palette } from '../../lib/design/tokens';

const projectRoot = path.resolve(__dirname, '../..');
const sourceRoots = ['app', 'game', 'lib', 'state', 'ui', 'tests'];
const excludedDirs = new Set(['node_modules', '.next', 'build', 'coverage', '.claude']);
const phase011OverlayAllowlist = new Set([
  'app/auth/signin/page.tsx',
  'app/global-error.tsx',
  'app/globals.css',
  'app/play/CanvasSkeleton.tsx',
  'ui/ConsentBanner.tsx',
  'ui/SettingsMenu.tsx',
]);
const rawHexPattern = new RegExp(`#${'[0-9a-fA-F]{6}'}`);

const phase011PaletteTokens = [
  'ui_paper',
  'ink_900',
  'accent_green',
  'meadow_hint',
  'cluu_body',
  'meadow_grass_mid',
  'meadow_grass_highlight',
  'meadow_grass_shadow',
  'sunflower_petal',
  'sunflower_core',
  'sunflower_stem',
  'sunflower_withered',
  'cluu_cheek',
] as const;

function walkFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirs.has(entry.name)) files.push(...walkFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx|css)$/.test(entry.name)) files.push(fullPath);
  }

  return files;
}

describe('Phase 01.1 design tokens', () => {
  it('keeps the Phase 01.1 palette role-named', () => {
    expect(Object.keys(palette)).toEqual(expect.arrayContaining(phase011PaletteTokens as unknown as string[]));
  });

  it('stores every palette token as lowercase #rrggbb', () => {
    const values = Object.values(palette) as string[];
    expect(values.every((value) => /^#[0-9a-f]{6}$/.test(value))).toBe(true);
  });

  it('converts hex tokens to Phaser integer colours', () => {
    expect(hexToInt(palette.meadow_hint)).toBe(15_267_031);
    expect(hexToInt(palette.cluu_body)).toBe(16_044_469);
  });

  it('keeps raw hex literals inside the design token module only', () => {
    const filesWithRawHex = sourceRoots
      .flatMap((root) => walkFiles(path.join(projectRoot, root)))
      .filter((file) => {
        const relativePath = path.relative(projectRoot, file);
        if (relativePath === 'lib/design/tokens.ts' || phase011OverlayAllowlist.has(relativePath)) return false;
        return rawHexPattern.test(readFileSync(file, 'utf8'));
      });

    expect(filesWithRawHex.map((file) => path.relative(projectRoot, file))).toEqual([]);
  });
});
