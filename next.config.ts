import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Pitfall 5 prevention #4 — catches Phaser scene-leak bugs in dev
  output: 'standalone', // smaller Docker artifact (Phase 5 bundle target)
  // Turbopack is the Next 16 default bundler — do NOT add `experimental.turbo: false` (D-03).
  // Pin the Turbopack root so Next does not pick up a stray lockfile in a parent directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Plan 06 will wrap this export with `withSentryConfig(...)` — do not add Sentry here.
};

export default nextConfig;
