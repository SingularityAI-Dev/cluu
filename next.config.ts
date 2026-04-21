import path from 'node:path';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Pitfall 5 prevention #4 — catches Phaser scene-leak bugs in dev
  output: 'standalone', // smaller Docker artifact (Phase 5 bundle target)
  // Turbopack is the Next 16 default bundler — do NOT add `experimental.turbo: false` (D-03).
  // Pin the Turbopack root so Next does not pick up a stray lockfile in a parent directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

// D-21: @sentry/nextjs wraps the Next config to enable source-map upload + tunnel route.
// When SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT are missing, the wrapper emits a warning
// but does not fail the build — that is the expected dev-time behavior.
// Note: `disableLogger` and `automaticVercelMonitors` were deprecated in @sentry/nextjs 10.x
// under Turbopack. Phase 5 will re-enable automatic monitors via the webpack-style option
// once Turbopack support lands.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  tunnelRoute: '/monitoring-tunnel', // helps with ad-blockers swallowing Sentry requests
});
