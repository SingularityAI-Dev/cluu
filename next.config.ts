import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // Pitfall 5 prevention #4 — catches Phaser scene-leak bugs in dev
  output: 'standalone', // smaller Docker artifact (Phase 5 bundle target)
  // Turbopack is the Next 16 default bundler — do NOT add `experimental.turbo: false` (D-03).
  // Plan 06 will wrap this export with `withSentryConfig(...)` — do not add Sentry here.
};

export default nextConfig;
