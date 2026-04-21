// sanity.test.ts
// Phase 1 Plan 01 sanity tests. Kept through Phase 1 as a tripwire —
// if this ever goes red, the toolchain regressed. Phase 2 can delete.
import { describe, it, expect } from 'vitest';

describe('Vitest 4.1 sanity (D-23 revised)', () => {
  it('runs at all', () => {
    expect(1 + 1).toBe(2);
  });

  it('runs on Node 24+ (Vitest 4 requirement)', () => {
    const major = Number.parseInt(process.versions.node.split('.')[0], 10);
    expect(major).toBeGreaterThanOrEqual(24);
  });

  it('jsdom environment is active (needed by Plans 03/04/06/07)', () => {
    const el = document.createElement('div');
    el.textContent = 'ok';
    expect(el.textContent).toBe('ok');
  });
});
