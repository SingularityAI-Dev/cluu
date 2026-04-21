// lib/analytics/posthog-provider.tsx
// D-20 + Pitfall 12 (POPIA): PostHog init ONLY after consent=accepted.
// This module is idempotent — safe under React 19 StrictMode double-effect in dev.
// If consent is revoked after init (accepted -> declined), track() short-circuits;
// posthog-js itself cannot "unload" cleanly, so the live SDK is told to opt-out.
'use client';

import posthog from 'posthog-js';
import { type ReactNode, useEffect } from 'react';
import { getConsent, subscribeConsent } from '@/lib/consent/store';

let initialized = false;

function maybeInit() {
  if (initialized) return;
  const record = getConsent();
  if (record?.decision !== 'accepted') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return; // No env var in dev — stay silent, do not init.
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
  posthog.init(key, {
    api_host: host, // POPIA: EU region required (Pitfall 12).
    persistence: 'localStorage',
    defaults: '2026-01-30',
    capture_pageview: true,
    autocapture: false, // Explicit events only — never scrape DOM or clicks.
    disable_session_recording: true, // No replay in Phase 1 (POPIA, threat T-06-04).
  });
  initialized = true;
}

function syncOptState() {
  if (!initialized) return;
  const record = getConsent();
  if (record?.decision === 'accepted') {
    posthog.opt_in_capturing();
  } else {
    posthog.opt_out_capturing();
  }
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    maybeInit();
    syncOptState();
    return subscribeConsent(() => {
      maybeInit();
      syncOptState();
    });
  }, []);
  return <>{children}</>;
}

// Test helpers.
export function isInitialized(): boolean {
  return initialized;
}

export function __resetForTests() {
  initialized = false;
}
