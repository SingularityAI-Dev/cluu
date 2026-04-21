// instrumentation.ts
// Next.js 16 automatically invokes `register()` once per runtime on server boot.
// D-21 + D-22: wire Sentry for Node (default) and Edge (placeholder).
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
