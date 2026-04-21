// lib/analytics/track.test.ts
// Pitfall 12 BLOCKER: proves track() is a no-op until consent=accepted AND posthog.init has run.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
  },
}));

vi.mock('./posthog-provider', () => ({
  isInitialized: vi.fn(() => false),
  __resetForTests: vi.fn(),
}));

import posthog from 'posthog-js';
import { setConsent } from '@/lib/consent/store';
import * as provider from './posthog-provider';
import { track } from './track';

describe('track() — consent gate (Pitfall 12 blocker)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(posthog.capture).mockClear();
    vi.mocked(provider.isInitialized).mockReturnValue(false);
  });

  it('is a no-op when no consent decision exists', () => {
    track('encounter_opened', { encounter_id: 'meadow-01' });
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('is a no-op when consent=declined', () => {
    setConsent('declined');
    track('game_started');
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('is a no-op when consent=accepted but posthog has not initialized', () => {
    setConsent('accepted');
    vi.mocked(provider.isInitialized).mockReturnValue(false);
    track('game_started');
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('invokes posthog.capture when consent=accepted AND initialized', () => {
    setConsent('accepted');
    vi.mocked(provider.isInitialized).mockReturnValue(true);
    track('encounter_opened', { encounter_id: 'meadow-01' });
    expect(posthog.capture).toHaveBeenCalledWith('encounter_opened', {
      encounter_id: 'meadow-01',
    });
  });
});
