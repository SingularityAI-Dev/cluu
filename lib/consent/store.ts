// lib/consent/store.ts
// POPIA consent state. Gates analytics initialization (see lib/analytics/posthog-provider.tsx).
// D-20 + Pitfall 12: no analytics until the user explicitly accepts.

export type ConsentDecision = 'accepted' | 'declined';

export interface ConsentRecord {
  decision: ConsentDecision;
  decidedAt: string; // ISO-8601
}

export const CONSENT_KEY = 'cluu-consent-v1';
const CHANGE_EVENT = 'cluu-consent-changed';

export function getConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed.decision !== 'accepted' && parsed.decision !== 'declined') return null;
    if (typeof parsed.decidedAt !== 'string') return null;
    return { decision: parsed.decision, decidedAt: parsed.decidedAt };
  } catch {
    return null;
  }
}

export function setConsent(decision: ConsentDecision): ConsentRecord {
  const record: ConsentRecord = { decision, decidedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    // `storage` events only fire on OTHER tabs, so broadcast in-process explicitly.
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: record }));
  }
  return record;
}

export function subscribeConsent(cb: (record: ConsentRecord | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb(getConsent());
  window.addEventListener(CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
