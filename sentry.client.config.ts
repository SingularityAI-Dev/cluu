// sentry.client.config.ts
// Sentry browser SDK init. D-21.
// Gated on DSN presence so dev builds without Sentry creds are a silent no-op.
// Phase 1 has ~zero error volume; this is plumbing for Phase 2's grading pipeline.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // No session replay in Phase 1 — POPIA, threat T-06-04 (DOM with email forms).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    integrations: [],
    enabled: process.env.NODE_ENV === 'production',
  });
}
