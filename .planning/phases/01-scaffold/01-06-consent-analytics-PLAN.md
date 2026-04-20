---
phase: 01-scaffold
plan: 06
type: execute
wave: 3
depends_on: [01, 03]
files_modified:
  - package.json
  - ui/ConsentBanner.tsx
  - ui/ConsentBanner.test.tsx
  - lib/consent/store.ts
  - lib/consent/store.test.ts
  - lib/analytics/posthog-provider.tsx
  - lib/analytics/track.ts
  - sentry.client.config.ts
  - sentry.server.config.ts
  - sentry.edge.config.ts
  - instrumentation.ts
  - app/layout.tsx
  - app/global-error.tsx
  - next.config.ts
  - .env.example
autonomous: true
requirements: []

user_setup:
  - service: posthog
    why: "Product analytics (funnels for onboarding in Phase 5; POPIA-friendly with EU region)"
    env_vars:
      - name: NEXT_PUBLIC_POSTHOG_KEY
        source: "PostHog -> Project Settings -> Project API Key"
      - name: NEXT_PUBLIC_POSTHOG_HOST
        source: "PostHog EU: https://eu.posthog.com (POPIA: use EU region)"
  - service: sentry
    why: "Error tracking for Phase 2+ grading pipeline errors (Plan 06 wires, zero volume expected in Phase 1)"
    env_vars:
      - name: NEXT_PUBLIC_SENTRY_DSN
        source: "Sentry -> Project Settings -> Client Keys (DSN)"
      - name: SENTRY_AUTH_TOKEN
        source: "Sentry -> User Settings -> Auth Tokens (source-map upload)"
      - name: SENTRY_ORG
        source: "Sentry org slug"
      - name: SENTRY_PROJECT
        source: "Sentry project slug"

must_haves:
  truths:
    - "On first visit, a cookie-consent banner appears with two equal-weight buttons: 'Accept' and 'Decline' (D-20, Pitfall 12, no dark pattern)"
    - "PostHog is NOT loaded into the page until the user clicks 'Accept' — verifiable by: opening localhost in incognito, inspecting Network tab, seeing zero requests to posthog host (Pitfall 12 blocker)"
    - "Consent decision is persisted in localStorage under key `cluu-consent-v1` with shape `{ decision: 'accepted' | 'declined'; decidedAt: ISO8601 }`"
    - "Sentry is initialized for client, server, and edge runtimes via `instrumentation.ts` + `sentry.*.config.ts` (D-21)"
    - "`app/global-error.tsx` exists and captures errors into Sentry"
    - "Consent banner renders with equal visual weight on 'Accept' and 'Decline' — not a dark pattern (Pitfall 12 + CONTEXT.md specifics)"
    - "A unit test proves: PostHogProvider does NOT call `posthog.init` when consent is 'declined' or absent"
    - "A unit test proves: calling `track()` when consent is absent is a no-op (event is silently dropped)"
  artifacts:
    - path: "ui/ConsentBanner.tsx"
      provides: "First-visit banner with Accept/Decline buttons of equal visual weight"
      exports: ["ConsentBanner"]
    - path: "lib/consent/store.ts"
      provides: "Pure consent-state helpers: read/write localStorage, subscribe to changes"
      exports: ["getConsent", "setConsent", "subscribeConsent", "type ConsentDecision"]
    - path: "lib/analytics/posthog-provider.tsx"
      provides: "Client Provider that initializes PostHog ONLY after consent=accepted"
      exports: ["PostHogProvider"]
    - path: "lib/analytics/track.ts"
      provides: "Safe track() wrapper — no-op when consent is absent"
      exports: ["track"]
    - path: "instrumentation.ts"
      provides: "Next.js instrumentation hook for Sentry server/edge initialization"
      exports: ["register", "onRequestError"]
    - path: "sentry.client.config.ts"
      provides: "Sentry browser SDK initialization"
    - path: "app/global-error.tsx"
      provides: "Error boundary that captures to Sentry (D-21)"
      exports: ["default"]
  key_links:
    - from: "ui/ConsentBanner"
      to: "lib/consent/store.setConsent"
      via: "button click writes decision"
      pattern: "setConsent"
    - from: "lib/analytics/posthog-provider"
      to: "getConsent() === 'accepted'"
      via: "gate on initialization"
      pattern: "accepted"
    - from: "app/layout.tsx"
      to: "ConsentBanner + PostHogProvider"
      via: "root wrap"
      pattern: "ConsentBanner|PostHogProvider"
---

<objective>
Absorb **Pitfall 12 (BLOCKER)**: POPIA-compliant analytics gating. PostHog must NOT load until the user has explicitly opted in via a consent banner with equal-weight buttons (no dark pattern per CONTEXT.md specifics). Also wire Sentry for client + server + edge error tracking (D-21) — Phase 1 event volume is near zero but the plumbing is in place for Phase 2's grading-pipeline errors.

**Zero analytics events fire on first visit in incognito mode** — this is the acceptance gate. If a PostHog network request fires before consent, the implementation is wrong.

Key decisions absorbed:
- **D-20**: cookie-consent banner in `app/layout.tsx`; banner copy neutral ("We use PostHog to understand gameplay. Accept or decline — no dark patterns."); PostHog only loads post-opt-in
- **D-21**: Sentry wired into `app/global-error.tsx` + middleware (Plan 02 middleware already exists; this plan adds Sentry instrumentation via the Next.js hook)
- **D-22**: Node.js runtime (instrumentation.ts already respects runtime conditionals)

Banner behavior (from Pitfall 12 + CONTEXT.md): both buttons visually equal (same padding, color scheme, font weight); banner sits at the bottom of the viewport; dismisses once decision is made; banner never re-appears if decided (can be re-opened from Settings in a future phase).

Purpose: Project-wide compliance with POPIA consent (D-20). Sentry ready to catch Phase 2 errors without a plumbing detour.
Output: Working consent banner; PostHog gated; Sentry initialized; tests prove the gate holds.
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/PITFALLS.md

<interfaces>
<!-- Pinned (STACK.md) -->
```
@posthog/next (latest)           # preferred per STACK.md
@sentry/nextjs@^10.48.0
```

<!-- From Pitfall 12 prevention strategy -->
1. Consent banner before analytics load — PostHog init gated on explicit consent
2. Functional cookies (auth JWT) exempt from consent but disclosed in policy
3. IP pseudonymization — configure Vercel (Phase 5 finalization); no-op in Phase 1 dev

<!-- From CONTEXT.md D-20 -->
Banner copy: "We use PostHog to understand gameplay. Accept or decline — no dark patterns."
Banner buttons must be equal weight — NOT "Accept All" prominent and "Decline" greyed out.

<!-- From Plan 03 (dependency) — StoreProvider wraps the layout -->
```tsx
// app/layout.tsx currently has
<StoreProvider>{children}</StoreProvider>
// This plan adds ConsentBanner + PostHogProvider wrapping
```

<!-- PostHog SDK init pattern (executor confirms live at posthog.com/docs/libraries/next-js) -->
```ts
// @posthog/next PostHogProvider mounts only after consent=accepted
import posthog from 'posthog-js';
posthog.init(key, { api_host, persistence: 'localStorage', defaults: '2026-01-30' });
```

<!-- Sentry Next 16 setup (@sentry/nextjs 10.48+) — official guide consulted live at docs.sentry.io -->
- `instrumentation.ts` at repo root — called by Next.js automatically
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- `withSentryConfig` wrap in next.config.ts
- `Sentry.captureException` from global-error.tsx
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Consent store + banner with equal-weight buttons</name>
  <files>package.json, lib/consent/store.ts, lib/consent/store.test.ts, ui/ConsentBanner.tsx, ui/ConsentBanner.test.tsx</files>

  <read_first>
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-20 exact banner copy, specifics "NOT dark-pattern"
    - .planning/research/PITFALLS.md — Pitfall 12 (lines 446-485) full prevention list
    - app/layout.tsx (Plan 01 / Plan 03) — where banner mounts
  </read_first>

  <behavior>
    Consent store:
    - Test 1: `getConsent()` returns `null` when localStorage is empty
    - Test 2: After `setConsent('accepted')`, `getConsent()` returns `{ decision: 'accepted', decidedAt: <ISO string> }`
    - Test 3: After `setConsent('declined')`, `getConsent()` returns `{ decision: 'declined', ... }`
    - Test 4: `subscribeConsent(cb)` invokes cb when consent changes; unsubscribe function stops future invocations
    - Test 5: localStorage key is exactly `cluu-consent-v1`

    Banner component:
    - Test 6: Renders when consent is `null` (no decision yet)
    - Test 7: Does NOT render when consent is `accepted` or `declined`
    - Test 8: Clicking "Accept" calls `setConsent('accepted')` and banner disappears
    - Test 9: Clicking "Decline" calls `setConsent('declined')` and banner disappears
    - Test 10: Both buttons have equal structural treatment — same CSS class OR inline style keys for padding/font-weight (prevents dark pattern). Assertion: both buttons' computed `font-weight` and `padding` values match.
  </behavior>

  <action>
1. Create `lib/consent/store.ts`. Pure client-side utility — uses localStorage + storage event for cross-tab sync:
```ts
// lib/consent/store.ts
// POPIA consent state. Used by lib/analytics/posthog-provider.tsx to gate init.
// D-20: no analytics until consent=accepted.

export type ConsentDecision = 'accepted' | 'declined';

export interface ConsentRecord {
  decision: ConsentDecision;
  decidedAt: string;  // ISO-8601
}

export const CONSENT_KEY = 'cluu-consent-v1';

export function getConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.decision !== 'accepted' && parsed.decision !== 'declined') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setConsent(decision: ConsentDecision): ConsentRecord {
  const record: ConsentRecord = { decision, decidedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    // Manually broadcast in-process (storage events only fire on OTHER tabs)
    window.dispatchEvent(new CustomEvent('cluu-consent-changed', { detail: record }));
  }
  return record;
}

export function subscribeConsent(cb: (record: ConsentRecord | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb(getConsent());
  window.addEventListener('cluu-consent-changed', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('cluu-consent-changed', handler);
    window.removeEventListener('storage', handler);
  };
}
```

2. Create `lib/consent/store.test.ts`:
```ts
// lib/consent/store.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConsent, setConsent, subscribeConsent, CONSENT_KEY } from './store';

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

  it('subscribeConsent invokes callback on change', () => {
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
```

3. Create `ui/ConsentBanner.tsx`. Equal-weight buttons per D-20 — same style tokens for both:
```tsx
// ui/ConsentBanner.tsx
// D-20 + Pitfall 12: POPIA consent gate.
// Exact copy from CONTEXT.md: "We use PostHog to understand gameplay. Accept or decline — no dark patterns."
// Both buttons share the SAME style object — no dark pattern.
'use client';
import { useEffect, useState } from 'react';
import { getConsent, setConsent, subscribeConsent, type ConsentRecord } from '@/lib/consent/store';

export function ConsentBanner() {
  const [record, setRecord] = useState<ConsentRecord | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRecord(getConsent());
    return subscribeConsent(setRecord);
  }, []);

  // Don't render until we've read client-side state (avoid hydration mismatch)
  if (!mounted) return null;
  if (record !== null) return null;

  // D-20: identical button style objects — this is the dark-pattern mitigation
  const buttonStyle: React.CSSProperties = {
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

  return (
    <div
      role="dialog"
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
          style={buttonStyle}
          onClick={() => setConsent('accepted')}
        >
          Accept
        </button>
        <button
          type="button"
          data-testid="consent-decline"
          style={buttonStyle}
          onClick={() => setConsent('declined')}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
```

4. Create `ui/ConsentBanner.test.tsx`:
```tsx
// ui/ConsentBanner.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ConsentBanner } from './ConsentBanner';
import { getConsent, CONSENT_KEY } from '@/lib/consent/store';

describe('<ConsentBanner />', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  it('renders when no consent decision exists', async () => {
    render(<ConsentBanner />);
    expect(await screen.findByTestId('consent-accept')).toBeDefined();
    expect(await screen.findByTestId('consent-decline')).toBeDefined();
  });

  it('uses neutral copy (D-20)', async () => {
    render(<ConsentBanner />);
    const text = await screen.findByText(/Accept or decline — no dark patterns/);
    expect(text).toBeDefined();
  });

  it('both buttons have identical visual weight (no dark pattern)', async () => {
    render(<ConsentBanner />);
    const accept = (await screen.findByTestId('consent-accept')) as HTMLButtonElement;
    const decline = (await screen.findByTestId('consent-decline')) as HTMLButtonElement;

    // Assert the style attribute strings are identical — guarantees Accept and Decline
    // are styled with the same inline style object in source.
    expect(accept.getAttribute('style')).toBe(decline.getAttribute('style'));
  });

  it('Accept click persists consent and hides banner', async () => {
    const { rerender } = render(<ConsentBanner />);
    const btn = await screen.findByTestId('consent-accept');
    fireEvent.click(btn);
    expect(getConsent()?.decision).toBe('accepted');
    rerender(<ConsentBanner />);
    expect(screen.queryByTestId('consent-accept')).toBeNull();
  });

  it('Decline click persists consent and hides banner', async () => {
    const { rerender } = render(<ConsentBanner />);
    const btn = await screen.findByTestId('consent-decline');
    fireEvent.click(btn);
    expect(getConsent()?.decision).toBe('declined');
    rerender(<ConsentBanner />);
    expect(screen.queryByTestId('consent-decline')).toBeNull();
  });

  it('does not render when consent already set', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ decision: 'accepted', decidedAt: new Date().toISOString() }));
    render(<ConsentBanner />);
    // give useEffect a tick
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('consent-accept')).toBeNull();
  });
});
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test lib/consent/ ui/ConsentBanner.test.tsx</automated>
  </verify>

  <acceptance_criteria>
    - `lib/consent/store.ts` CONSENT_KEY equals exactly `'cluu-consent-v1'`
    - `ui/ConsentBanner.tsx` exists with `'use client'` and test-ids `consent-accept` + `consent-decline`
    - Banner copy matches D-20: contains `"Accept or decline — no dark patterns"` (grep: `grep -q "no dark patterns" ui/ConsentBanner.tsx`)
    - Both button `style` attributes are identical in the DOM (test asserts this)
    - Test file has at least 6 passing tests
    - `pnpm test lib/consent/ ui/ConsentBanner.test.tsx` exits 0
  </acceptance_criteria>

  <done>Consent store + banner shipped. No dark pattern: both buttons share the exact same style object.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: PostHog gated on consent + Sentry wired for all runtimes</name>
  <files>package.json, lib/analytics/posthog-provider.tsx, lib/analytics/track.ts, sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts, instrumentation.ts, app/layout.tsx, app/global-error.tsx, next.config.ts, .env.example</files>

  <read_first>
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-20 (PostHog gated), D-21 (Sentry wired)
    - .planning/research/PITFALLS.md — Pitfall 12 full prevention list; CRITICAL: PostHog MUST NOT load until consent=accepted
    - PostHog Next.js docs (live): https://posthog.com/docs/libraries/next-js — confirm @posthog/next provider signature for 2026
    - Sentry Next.js 16 docs (live): https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ — confirm `instrumentation.ts` pattern for 10.48+
    - lib/consent/store.ts (Task 1) — the gate function
    - next.config.ts (Plan 01) — current contents that this task wraps with withSentryConfig
  </read_first>

  <behavior>
    - Test 1: `track('event_name', { foo: 'bar' })` is a no-op when consent is absent (asserts the underlying posthog capture is not invoked)
    - Test 2: `track('event_name', { foo: 'bar' })` IS invoked when consent=accepted
    - Test 3: `<PostHogProvider>` does NOT call `posthog.init` when consent is null (first visit)
    - Test 4: `<PostHogProvider>` does NOT call `posthog.init` when consent=declined
    - Test 5: `<PostHogProvider>` calls `posthog.init` exactly once after consent=accepted
  </behavior>

  <action>
1. Install PostHog + Sentry:
```bash
pnpm add posthog-js @sentry/nextjs@^10.48.0
```
(Note: using `posthog-js` directly rather than `@posthog/next` for tighter control over init timing — the gate pattern is simpler this way. STACK.md allows either.)

2. Create `lib/analytics/posthog-provider.tsx`. Gated on consent:
```tsx
// lib/analytics/posthog-provider.tsx
// D-20 + Pitfall 12: PostHog init ONLY after consent=accepted.
// This component is idempotent — if consent flips accepted→declined later, init does not retract
// (posthog-js does not support graceful unload); we just stop calling track().
'use client';
import { useEffect, type ReactNode } from 'react';
import posthog from 'posthog-js';
import { getConsent, subscribeConsent } from '@/lib/consent/store';

let initialized = false;

function maybeInit() {
  if (initialized) return;
  const record = getConsent();
  if (record?.decision !== 'accepted') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!key) return;
  posthog.init(key, {
    api_host: host || 'https://eu.posthog.com',   // POPIA: EU region (Pitfall 12)
    persistence: 'localStorage',
    defaults: '2026-01-30',
    capture_pageview: true,
    autocapture: false,        // explicit events only
  });
  initialized = true;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    maybeInit();
    return subscribeConsent(() => maybeInit());
  }, []);
  return <>{children}</>;
}

// Test helper — lets tests reset the singleton between cases
export function __resetForTests() {
  initialized = false;
}

export function isInitialized(): boolean {
  return initialized;
}
```

3. Create `lib/analytics/track.ts`. Safe wrapper — no-op when consent absent:
```ts
// lib/analytics/track.ts
// Safe track() — no-op when consent is not granted. Callers don't need to check themselves.
import posthog from 'posthog-js';
import { getConsent } from '@/lib/consent/store';
import { isInitialized } from './posthog-provider';

export function track(event: string, properties?: Record<string, unknown>): void {
  if (getConsent()?.decision !== 'accepted') return;
  if (!isInitialized()) return;
  posthog.capture(event, properties);
}
```

4. Create Sentry configs. Use `@sentry/nextjs` 10.48+ conventions (executor confirms against live docs):

`sentry.client.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,    // no session replay in Phase 1 (POPIA)
  integrations: [],
  // Hide the default error overlay noise in dev
  enabled: process.env.NODE_ENV === 'production',
});
```

`sentry.server.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
});
```

`sentry.edge.config.ts`:
```ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
});
```

5. Create `instrumentation.ts` at repo root. Per Sentry 10.48+ Next 16 guidance:
```ts
// instrumentation.ts
// Called by Next.js automatically. Wires Sentry on server + edge.
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
```

6. Create `app/global-error.tsx`. D-21 error boundary:
```tsx
// app/global-error.tsx
// D-21: errors caught here flow to Sentry.
'use client';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Something went wrong</h1>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          We've logged it. Try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2d6a4f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
```

7. Update `next.config.ts` to wrap with `withSentryConfig`:
```ts
import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: '/monitoring-tunnel',  // helps with ad blockers
  disableLogger: true,
  automaticVercelMonitors: false,     // Phase 5 turns on
});
```

8. Update `app/layout.tsx` to include ConsentBanner + PostHogProvider (note: StoreProvider is already there from Plan 03):
```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import { StoreProvider } from '@/state/StoreProvider';
import { PostHogProvider } from '@/lib/analytics/posthog-provider';
import { ConsentBanner } from '@/ui/ConsentBanner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cluu',
  description: 'A cozy browser game that teaches prompting through gameplay.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <PostHogProvider>
            {children}
            <ConsentBanner />
          </PostHogProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
```

9. Create unit tests for the gate. New file `lib/analytics/track.test.ts`:
```ts
// lib/analytics/track.test.ts
// Proves: track() is a no-op when consent is not granted.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('posthog-js', () => {
  return {
    default: {
      init: vi.fn(),
      capture: vi.fn(),
    },
  };
});

vi.mock('./posthog-provider', () => ({
  isInitialized: vi.fn(() => false),
  __resetForTests: vi.fn(),
}));

import posthog from 'posthog-js';
import { track } from './track';
import { setConsent } from '@/lib/consent/store';
import * as provider from './posthog-provider';

describe('track() — consent gate (Pitfall 12 blocker)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(posthog.capture).mockClear();
    vi.mocked(provider.isInitialized).mockReturnValue(false);
  });

  it('is a no-op when no consent decision exists', () => {
    track('test_event', { a: 1 });
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('is a no-op when consent=declined', () => {
    setConsent('declined');
    track('test_event');
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('is a no-op when consent=accepted but posthog not initialized', () => {
    setConsent('accepted');
    vi.mocked(provider.isInitialized).mockReturnValue(false);
    track('test_event');
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('invokes posthog.capture when consent=accepted AND initialized', () => {
    setConsent('accepted');
    vi.mocked(provider.isInitialized).mockReturnValue(true);
    track('test_event', { foo: 'bar' });
    expect(posthog.capture).toHaveBeenCalledWith('test_event', { foo: 'bar' });
  });
});
```

10. Update `.env.example` to include Sentry vars that are now referenced:
```
# Supabase (Plan 02)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# PostHog (Plan 06) — user must click consent banner before events fire
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# Sentry (Plan 06)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu &amp;&amp; pnpm typecheck &amp;&amp; pnpm test lib/analytics/ &amp;&amp; pnpm build</automated>
  </verify>

  <acceptance_criteria>
    - `lib/analytics/posthog-provider.tsx` checks `getConsent()?.decision === 'accepted'` before `posthog.init`
    - `lib/analytics/track.ts` is a no-op when consent is missing (Pitfall 12 test proves it)
    - `instrumentation.ts` exists at repo root with `register()` and `onRequestError` exports
    - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` all exist and call `Sentry.init`
    - `app/global-error.tsx` calls `Sentry.captureException` (D-21)
    - `next.config.ts` wraps with `withSentryConfig`
    - `app/layout.tsx` renders `<ConsentBanner />` + `<PostHogProvider>`
    - `pnpm build` succeeds (wrapping with withSentryConfig doesn't break the build)
    - Test file `lib/analytics/track.test.ts` has 4 passing tests proving the gate
  </acceptance_criteria>

  <done>PostHog gated behind consent; Sentry wired for all 3 runtimes; global-error.tsx captures exceptions; tests prove Pitfall 12 blocker is absorbed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → PostHog | PII + behavior data; must be consent-gated (Pitfall 12) |
| Browser → Sentry | Stack traces (may contain paths, var names); sample-rate 10%; no PII in Phase 1 |
| Server errors → Sentry | Same; server-side exceptions have access to request context — ensure no raw prompts/tokens logged in Phase 1 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-06-01 | Information Disclosure | PostHog loads before consent (Pitfall 12 BLOCKER) | mitigate | Consent gate in `posthog-provider.tsx` — verified by tests + manual incognito network-tab check in `<verification>` |
| T-06-02 | Information Disclosure | Sentry captures request body containing raw prompts | mitigate | Phase 1 has no prompts (grading gateway not built yet). Phase 2 Plan will add `beforeSend` Sentry hook to scrub. Accept for Phase 1. |
| T-06-03 | Tampering | Attacker sends custom `cluu-consent-changed` CustomEvent to spoof consent | accept | Same-origin, in-process only — not a meaningful threat surface. Malicious user can bypass client-side gates on their own device, but this leaks only their own data to their own chosen PostHog key. |
| T-06-04 | Information Disclosure | Session replay captures DOM with email in sign-in form | mitigate | `replaysSessionSampleRate: 0` in sentry.client.config.ts — session replay disabled in Phase 1. Phase 5 may enable with PII masking. |
| T-06-05 | Repudiation | User claims "I didn't consent" after events fired | mitigate | `decidedAt: ISO8601` persisted alongside decision — user can produce this record if queried. Phase 5 adds full privacy-policy + audit trail. |
</threat_model>

<verification>
1. `pnpm build` succeeds with Sentry wrap
2. `pnpm test lib/analytics/` green (4 gate tests)
3. Manual (CRITICAL — Pitfall 12 proof): open localhost:3000 in incognito, open DevTools Network tab, filter by "posthog" — observe ZERO requests. Click Accept on the banner, observe PostHog init requests. Reload — consent persists, banner does not reappear.
4. Manual (D-21 proof): throw an Error in a test component, visit the page, observe it hits `global-error.tsx` UI and Sentry receives the event (or in dev mode with `enabled: false`, verify the code path would have fired)
5. Manual: banner Accept and Decline buttons visually identical (screenshot comparison)
</verification>

<success_criteria>
- D-20: Consent banner with neutral copy + equal-weight buttons
- Pitfall 12 BLOCKER: PostHog does NOT load until consent=accepted (test-verified + manual incognito check)
- D-21: Sentry initialized for client + server + edge runtimes
- app/global-error.tsx captures exceptions
- `track()` wrapper safe by default (no-op when consent absent)
- All prior plans' tests remain green
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-06-SUMMARY.md` with:
- Incognito network-tab observation (Pitfall 12 proof): "0 PostHog requests before consent, N requests after Accept"
- Consent banner screenshot (light mode) showing equal-weight buttons
- Sentry project ref confirmed connected (DSN set)
- Gate test count (4) passing
</output>
