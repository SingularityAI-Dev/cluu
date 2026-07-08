// ui/ConsentBanner.tsx
// D-20 + Pitfall 12: POPIA consent gate.
// Banner copy from CONTEXT.md: "We use PostHog to understand gameplay.
// Accept or decline — no dark patterns."
// BOTH buttons share the same style object — this is the dark-pattern mitigation.
'use client';

import { type CSSProperties, useEffect, useState } from 'react';
import { type ConsentRecord, getConsent, setConsent, subscribeConsent } from '@/lib/consent/store';

// D-20: identical style for Accept and Decline — enforced by a test that asserts
// both buttons' style attributes are byte-for-byte identical in the DOM.
const BUTTON_STYLE: CSSProperties = {
  flex: 1,
  padding: '0.75rem 1rem',
  fontSize: '1rem',
  fontWeight: 600,
  borderRadius: 6,
  cursor: 'pointer',
  border: '1px solid #2d2a26',
  background: '#faf8f3',
  color: '#2d2a26',
};

export function ConsentBanner() {
  const [pathname, setPathname] = useState('');
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPathname(window.location.pathname);
    setRecord(getConsent());
    return subscribeConsent(setRecord);
  }, []);

  // Avoid hydration mismatch: we can't know the client-side decision until mount.
  if (!mounted) return null;
  if (record !== null) return null;
  if (pathname === '/play') return null;

  return (
    <section
      aria-label="Analytics consent"
      style={{
        position: 'fixed',
        bottom: 16,
        left: 16,
        right: 16,
        maxWidth: 560,
        margin: '0 auto',
        padding: '1rem',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 9999,
      }}
    >
      <p style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.9rem', color: '#2d2a26' }}>
        We use PostHog to understand gameplay. Accept or decline — no dark patterns.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          data-testid="consent-accept"
          style={BUTTON_STYLE}
          onClick={() => setConsent('accepted')}
        >
          Accept
        </button>
        <button
          type="button"
          data-testid="consent-decline"
          style={BUTTON_STYLE}
          onClick={() => setConsent('declined')}
        >
          Decline
        </button>
      </div>
    </section>
  );
}
