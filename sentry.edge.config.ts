// sentry.edge.config.ts
// Minimal Edge-runtime init. CLAUDE.md says the project uses Fluid Compute (Node),
// not Edge, but @sentry/nextjs still expects this file to exist for the build.
// Treated as a no-op placeholder.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: process.env.NODE_ENV === 'production',
  });
}
