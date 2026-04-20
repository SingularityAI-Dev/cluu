---
phase: 01-scaffold
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - pnpm-workspace.yaml
  - pnpm-lock.yaml
  - .nvmrc
  - .gitignore
  - .npmrc
  - tsconfig.json
  - next.config.ts
  - biome.json
  - vitest.config.ts
  - vercel.json
  - app/layout.tsx
  - app/page.tsx
  - app/globals.css
  - README.md
  - .env.example
  - .github/workflows/ci.yml
autonomous: true
requirements:
  - OPS-04
user_setup:
  - service: vercel
    why: "Host the Next.js app + preview deploys; cluu.game domain wiring"
    env_vars:
      - name: VERCEL_PROJECT_ID
        source: "Vercel Dashboard -> Project Settings -> General"
      - name: VERCEL_ORG_ID
        source: "Vercel Dashboard -> Account -> Settings -> General"
    dashboard_config:
      - task: "Create Vercel project by importing the GitHub repo"
        location: "Vercel Dashboard -> Add New Project"
      - task: "Point cluu.game DNS to Vercel (optional in Phase 1 — preview URL acceptable per D-19)"
        location: "Vercel Dashboard -> Domains"

must_haves:
  truths:
    - "Fresh `git clone` + `pnpm install` produces a working dev server via `pnpm dev` with Turbopack"
    - "Node 24 LTS is pinned via .nvmrc"
    - "TypeScript strict mode is on; `pnpm typecheck` exits 0"
    - "Vitest runs and reports 0 tests (scaffold only)"
    - "Biome lint/format runs clean on scaffold files"
    - "Pushing to `main` branch triggers a Vercel preview deployment"
    - "pnpm workspace is configured so `@logic-md/core` can be linked later with `workspace:*` (Phase 2)"
  artifacts:
    - path: "package.json"
      provides: "Pinned dependency versions + scripts"
      contains: "\"next\": \"16.2.4\""
    - path: "pnpm-workspace.yaml"
      provides: "Workspace configuration (packages/* ready for @logic-md/core)"
      contains: "packages:"
    - path: ".nvmrc"
      provides: "Node 24 LTS pin"
      contains: "24"
    - path: "next.config.ts"
      provides: "Next 16 config with reactStrictMode + output standalone"
      contains: "reactStrictMode: true"
    - path: "biome.json"
      provides: "Lint + format config (D-23 Claude discretion)"
      contains: "\"$schema\""
    - path: "vitest.config.ts"
      provides: "Vitest config wired with jsdom + path aliases"
      contains: "defineConfig"
    - path: ".github/workflows/ci.yml"
      provides: "CI gate: typecheck + lint + test"
      contains: "pnpm test"
    - path: "vercel.json"
      provides: "Vercel build config (Node 24)"
      contains: "24"
  key_links:
    - from: "package.json"
      to: "pnpm-workspace.yaml"
      via: "workspace packages directive"
      pattern: "packages:"
    - from: ".github/workflows/ci.yml"
      to: "pnpm test + pnpm typecheck"
      via: "CI step"
      pattern: "pnpm (test|typecheck|lint)"
---

<objective>
Stand up the monorepo skeleton on the pinned 2026 stack: Next.js 16.2.4 + React 19.2.0 + TypeScript 5.6 strict, pnpm workspace (per D-02), Turbopack enabled (per D-03, Next 16 default), Node 24 LTS, Vitest + Biome, and a minimal Vercel deploy config so the first push produces a preview URL (per D-19).

This plan forks the layout of `phaserjs/template-nextjs` (per D-01) — specifically the directory conventions — but upgrades Next from 15.3.1 to 16.2.4 and React to 19.2.0. No Phaser code is written here; that lives in Plan 04. No Supabase code here; that lives in Plan 02.

Purpose: Every subsequent plan assumes this toolchain is in place. Getting the versions pinned right eliminates an entire class of "it works on my machine" bugs in week 2+.
Output: A committable repo root that `pnpm install && pnpm dev` runs cleanly on, deploys to Vercel on push, and passes CI.
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@docs/cluu-v1-design.md

<interfaces>
<!-- Pinned versions from STACK.md "Installation (copy-paste-ready)" block — executor uses these exactly -->

From STACK.md:
```
next@16.2.4 react@19.2.0 react-dom@19.2.0
typescript@5.6 @types/node @types/react @types/react-dom
vitest@^2 @vitest/ui
```

Next 16 defaults that matter:
- Turbopack is the default bundler (keep it)
- React 19.2 is required (Next 16 refuses <19)
- Middleware file renamed from `middleware.ts` → `proxy.ts` in Next 16 (skill note above) — BUT the Supabase SSR docs still use `middleware.ts` and it works. Choose `middleware.ts` in Plan 02 for compatibility with Supabase docs; do NOT rename now.

From ARCHITECTURE.md "Recommended Project Structure":
```
cluu/
├── app/           # Next.js App Router
├── game/          # ALL Phaser code (never imported from server) — created in Plan 04
├── ui/            # React components (client-only overlay) — created in Plan 03+
├── lib/           # Isomorphic / server-only utilities — created in Plan 02+
├── state/         # Zustand stores — created in Plan 03
├── public/        # Sprites, audio, fonts
├── supabase/      # Migrations — created in Plan 02
└── packages/      # pnpm workspace root for @logic-md/core (Phase 2)
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Initialize repo root with pinned toolchain</name>
  <files>package.json, pnpm-workspace.yaml, .nvmrc, .npmrc, .gitignore, tsconfig.json, next.config.ts, .env.example, README.md</files>

  <read_first>
    - .planning/research/STACK.md — "Installation (copy-paste-ready)" block (lines ~74-105) AND "Version compatibility matrix" (lines ~222-235)
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-01, D-02, D-03, D-19
    - .planning/research/ARCHITECTURE.md — "Recommended Project Structure" section
    - docs/cluu-v1-design.md — §8 "Technical stack" (as amended 2026-04-20)
  </read_first>

  <action>
Run from repo root `/Users/rainierpotgieter/development/cluu`:

1. Create `.nvmrc` with exact content:
```
24
```

2. Create `.npmrc` with exact content:
```
engine-strict=true
auto-install-peers=true
```

3. Create `pnpm-workspace.yaml` with exact content (D-02 — workspace from day 1 so `@logic-md/core` can be linked in Phase 2):
```yaml
packages:
  - 'packages/*'
```

4. Create `package.json`. Use exactly these pinned versions from STACK.md (do NOT use `latest` anywhere):
```json
{
  "name": "cluu",
  "version": "0.0.1",
  "private": true,
  "engines": { "node": ">=24.0.0", "pnpm": ">=9.0.0" },
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "16.2.4",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "5.6.3",
    "vitest": "^2.1.8",
    "@vitest/ui": "^2.1.8"
  }
}
```

5. Create `tsconfig.json`. Strict mode on per STACK.md; paths aliases match ARCHITECTURE.md directory layout:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"],
      "@/app/*": ["./app/*"],
      "@/game/*": ["./game/*"],
      "@/ui/*": ["./ui/*"],
      "@/lib/*": ["./lib/*"],
      "@/state/*": ["./state/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "packages/*/node_modules"]
}
```

6. Create `next.config.ts`. reactStrictMode must be true per Pitfall 5 prevention strategy #3. `output: 'standalone'` per STACK.md bundle note.
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // Phaser module handling — Phaser touches window at import time
    // Plan 04 will add it via next/dynamic ssr:false; no config needed here
  },
};

export default nextConfig;
```

7. Create `.env.example` (placeholders only — actual values filled in Plans 02, 06):
```
# Supabase (Plan 02)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# PostHog (Plan 06)
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# Sentry (Plan 06)
SENTRY_AUTH_TOKEN=
NEXT_PUBLIC_SENTRY_DSN=
```

8. Create `.gitignore` (Next.js defaults + Vercel + pnpm + test output):
```
node_modules/
.next/
.vercel/
out/
dist/
build/
*.log
.env
.env.local
.env.*.local
.DS_Store
coverage/
.vitest/
.turbo/
next-env.d.ts
```

9. Create `README.md` with minimal project info pointing to PROJECT.md + design doc. One-paragraph overview, then "Getting started" with `pnpm install && pnpm dev`, then links to `.planning/PROJECT.md` and `docs/cluu-v1-design.md`.

10. Run `pnpm install` to generate `pnpm-lock.yaml`.
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu && pnpm install --frozen-lockfile=false &amp;&amp; pnpm typecheck</automated>
  </verify>

  <acceptance_criteria>
    - `package.json` contains the exact string `"next": "16.2.4"` (grep: `grep -q '"next": "16.2.4"' package.json`)
    - `package.json` contains `"react": "19.2.0"`
    - `.nvmrc` contains exactly `24` (single line)
    - `pnpm-workspace.yaml` exists and contains `packages:`
    - `tsconfig.json` contains `"strict": true`
    - `next.config.ts` contains `reactStrictMode: true`
    - `pnpm typecheck` exits 0
    - `pnpm-lock.yaml` exists after install
  </acceptance_criteria>

  <done>Toolchain pinned, installs cleanly, typechecks green, workspace ready for `packages/*`.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Wire Vitest, Biome, CI workflow, and minimal app shell</name>
  <files>vitest.config.ts, biome.json, .github/workflows/ci.yml, app/layout.tsx, app/page.tsx, app/globals.css, vercel.json</files>

  <read_first>
    - .planning/research/STACK.md — "Dev & CI" section (Vitest, Biome choices); "Integration gotchas" §7 (Zustand store factory note — affects app/layout.tsx structure)
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-23 (Vitest from day 1), D-24 (Playwright deferred)
    - package.json from Task 1 — confirms installed versions
    - next.config.ts from Task 1 — confirms reactStrictMode
  </read_first>

  <action>
1. Create `vitest.config.ts`. jsdom environment for React component tests. Path aliases mirror `tsconfig.json`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'packages/*/node_modules'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/app': path.resolve(__dirname, './app'),
      '@/game': path.resolve(__dirname, './game'),
      '@/ui': path.resolve(__dirname, './ui'),
      '@/lib': path.resolve(__dirname, './lib'),
      '@/state': path.resolve(__dirname, './state'),
    },
  },
});
```

2. Create `biome.json`. Use Biome (not ESLint+Prettier) because STACK.md notes it's faster, and solo builder benefits from one tool. This is the D-23-adjacent "Claude's discretion" choice — documented here:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignore": ["node_modules", ".next", "out", "dist", "build", "coverage"] },
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "noNonNullAssertion": "off" },
      "suspicious": { "noExplicitAny": "warn" }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "always", "trailingCommas": "all" }
  }
}
```

3. Create `.github/workflows/ci.yml`. Minimal gate: install + typecheck + lint + test. No Playwright (D-24 defers).
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
```

4. Create `app/layout.tsx` (Server Component — minimal, no providers yet; providers added in Plan 03 StoreProvider and Plan 06 ConsentGate):
```tsx
import type { Metadata } from 'next';
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
      <body>{children}</body>
    </html>
  );
}
```

5. Create `app/page.tsx` (Server Component — temporary landing so the dev server renders something):
```tsx
export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Cluu</h1>
      <p>Scaffolding in progress. Play at <a href="/play">/play</a> (Plan 04).</p>
    </main>
  );
}
```

6. Create `app/globals.css`. Minimal reset:
```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #faf8f3; color: #2d2a26; }
```

7. Create `vercel.json` (explicit Node 24 pin; Fluid Compute is default on Vercel 2026 — no flag needed):
```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "outputDirectory": ".next",
  "regions": ["cdg1"]
}
```
(Note: `cdg1` = Paris, closest to South African target audience per PROJECT.md. If wrong, executor picks nearest EU region.)

8. Run verification:
```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu && pnpm typecheck &amp;&amp; pnpm lint &amp;&amp; pnpm test &amp;&amp; pnpm build</automated>
  </verify>

  <acceptance_criteria>
    - `vitest.config.ts` exists with `environment: 'jsdom'`
    - `biome.json` exists with `"$schema"` field
    - `.github/workflows/ci.yml` exists and runs `pnpm test`
    - `app/layout.tsx` exists and exports default `RootLayout`
    - `app/page.tsx` exists and exports default `HomePage`
    - `pnpm build` succeeds (exit 0)
    - `pnpm test` exits 0 with "No test files found" (empty pass — Plan 03 adds the first real tests)
    - `pnpm lint` exits 0
  </acceptance_criteria>

  <done>Next 16 dev server runs, builds cleanly, CI workflow ready to execute on first push, Vercel config in place for preview deploys.</done>
</task>

</tasks>

<verification>
Final checks before this plan is done:
1. `pnpm install --frozen-lockfile` works from a clean checkout
2. `pnpm dev` starts Turbopack dev server on port 3000 and renders the placeholder home page
3. `pnpm build` completes without errors
4. `pnpm test` runs (empty but green — Plan 03 adds the first actual test)
5. Git push triggers Vercel preview deploy (manual verification at push time)
6. Node version is 24 LTS (enforced by .nvmrc + engines field)
</verification>

<success_criteria>
- Clean clone + `pnpm install` produces working dev server
- TypeScript strict mode + Biome lint both pass on scaffold files
- CI workflow runs typecheck + lint + test
- Vercel config pins Node 24 and uses pnpm
- pnpm workspace ready for `packages/@logic-md/core` in Phase 2
- Zero runtime errors at the placeholder landing page
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-01-SUMMARY.md` with:
- Installed versions (from `pnpm-lock.yaml`)
- Any deviations from the pinned list (should be none)
- Vercel preview URL after first push
- Known issues for Plan 02+ to handle
</output>
