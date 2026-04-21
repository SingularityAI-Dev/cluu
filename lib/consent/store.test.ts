// lib/consent/store.test.ts
// POPIA consent store contract. Pitfall 12 BLOCKER — proves consent persistence.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_KEY, getConsent, setConsent, subscribeConsent } from './store';

describe('consent store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no decision exists', () => {
    expect(getConsent()).toBeNull();
  });

  it('setConsent("accepted") persists the decision', () => {
    setConsent('accepted');
    const record = getConsent();
    expect(record?.decision).toBe('accepted');
    expect(record?.decidedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('setConsent("declined") persists the decision', () => {
    setConsent('declined');
    expect(getConsent()?.decision).toBe('declined');
  });

  it('localStorage key is cluu-consent-v1', () => {
    setConsent('accepted');
    const raw = localStorage.getItem(CONSENT_KEY);
    expect(CONSENT_KEY).toBe('cluu-consent-v1');
    expect(raw).not.toBeNull();
  });

  it('subscribeConsent invokes callback on change and unsub stops further calls', () => {
    const cb = vi.fn();
    const unsub = subscribeConsent(cb);
    setConsent('accepted');
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ decision: 'accepted' }));
    unsub();
    cb.mockClear();
    setConsent('declined');
    expect(cb).not.toHaveBeenCalled();
  });

  it('rejects corrupt localStorage values gracefully', () => {
    localStorage.setItem(CONSENT_KEY, 'not json');
    expect(getConsent()).toBeNull();
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decision: 'maybe' }));
    expect(getConsent()).toBeNull();
  });
});
