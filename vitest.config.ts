// vitest.config.ts
// Vitest 4.1.x (D-23 revised). Node 24 required (STACK.md compat matrix).
// v4 renamed `workspace` -> `projects`; Phase 1 does not need projects.
// V8 coverage is now AST-based in v4 (coverage numbers differ from v2) — Phase 1 does not enforce coverage %.
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom', // Plans 03/04/06/07 test components + localStorage
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 15_000, // RLS test hits a local Postgres; 15s headroom
    // No `projects` key — single-project is correct for Phase 1.
    // No coverage threshold — Phase 5 will add one.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'), // matches tsconfig.json paths
      // Next.js ships `server-only` as a guard that throws if imported by client
      // bundles. During Vitest the module isn't reachable, so alias it to a no-op
      // stub. The guard is still enforced at Next's build time.
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
});
