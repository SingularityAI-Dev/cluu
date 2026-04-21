// sentry.server.config.ts
// Sentry Node.js runtime init. D-21.
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'nodejs'.
// Phase 2 grading route will wrap Server Actions in `Sentry.withServerActionInstrumentation`.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  });
}
