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
  - .env.example
  - tsconfig.json
  - next.config.ts
  - biome.json
  - vitest.config.ts
  - vitest.setup.ts
  - vercel.json
  - app/layout.tsx
  - app/page.tsx
  - app/globals.css
  - sanity.test.ts
  - README.md
autonomous: true
requirements:
  - OPS-04

user_setup:
  - service: vercel
    why: "Hosting + preview deploys from day 1 (D-19). Production domain `cluu.game` wired when DNS ready; preview URL is acceptable Phase-1 gate."
    env_vars:
      - name: VERCEL_TOKEN
        source: "Vercel -> Account Settings -> Tokens -> Create Token (scope: full)"
      - name: VERCEL_ORG_ID
        source: "Vercel -> any project -> Settings -> General -> Project ID (see `vercel link`)"
      - name: VERCEL_PROJECT_ID
        source: "Vercel -> project -> Settings -> General -> Project ID"
    dashboard_config:
      - task: "Create a new Vercel project linked to this repo (or run `vercel link` locally once repo is pushed)"
        location: "vercel.com -> Add New -> Project -> Import Git Repository"
      - task: "(Optional) Add custom domain cluu.game once DNS is ready (Phase 5 can finalize)"
        location: "Vercel -> project -> Settings -> Domains"

must_haves:
  truths:
    - "`pnpm install` from a clean clone completes without error and produces a resolvable lockfile (D-02)"
    - "`pnpm typecheck` exits 0 on a fresh scaffold (no type errors in starter code)"
    - "`pnpm build` exits 0 with Next 16.2.x + React 19.2.x + Turbopack (default) (D-01, D-03)"
    - "`pnpm test` exits 0 — Vitest 4.1.x is installed and runs the sanity test (D-23 revised)"
    - "`vitest --version` reports a 4.1.x version (NOT 2.x.y — D-23 revised) — proves the pin landed"
    - "Node version pin in `.nvmrc` is `24` (Vitest 4 requires Node >= 20; Vercel Fluid default is Node 24)"
    - "pnpm workspaces are enabled so `@logic-md/core` can be linked via `workspace:*` in Phase 2 without restructuring (D-02)"
    - "Turbopack is the bundler (Next 16 default — not disabled in `next.config.ts`) (D-03)"
    - "React StrictMode is ON in `next.config.ts` (Pitfall 5 prevention #4 — scene-leak catch in dev)"
    - "Linter/formatter is chosen and wired to `pnpm lint` + `pnpm format` (Biome per Claude's Discretion)"
    - "Vercel project link exists locally (.vercel/project.json gitignored) OR `vercel.json` declares preview/production settings"
    - "A placeholder root route (`/`) and `layout.tsx` render without errors — foundation for Plans 03/04/06/07 to extend"
    - "Plan 02 owns `proxy.ts` (Next 16 convention per D-25) — Plan 01 does NOT scaffold any middleware.ts or proxy.ts file"
  artifacts:
    - path: "package.json"
      provides: "Root workspace manifest with Phase-1 runtime + dev deps, pinned per STACK.md + D-23 revised"
      contains: '"vitest":'
    - path: "pnpm-workspace.yaml"
      provides: "Workspaces config — ready for `@logic-md/core` workspace link in Phase 2"
      contains: "packages:"
    - path: ".nvmrc"
      provides: "Node 24 pin"
      contains: "24"
    - path: "next.config.ts"
      provides: "Next 16 config — reactStrictMode ON, Turbopack default, output standalone"
      contains: "reactStrictMode: true"
    - path: "tsconfig.json"
      provides: "TS 5.6+ strict config with `@/*` path alias and Next 16 plugin"
      contains: "\"strict\": true"
    - path: "vitest.config.ts"
      provides: "Vitest 4 config with jsdom env (no `projects` key needed Phase 1)"
      contains: "defineConfig"
    - path: "vitest.setup.ts"
      provides: "Testing-library jest-dom extension + crypto.randomUUID polyfill"
    - path: "biome.json"
      provides: "Biome v1 config — lint + format (Claude's Discretion)"
    - path: ".env.example"
      provides: "Placeholder envs; Plan 02 expands Supabase section"
      contains: "SUPABASE"
    - path: "app/layout.tsx"
      provides: "Minimal root layout — Plan 03 adds StoreProvider, Plan 06 adds ConsentBanner + PostHogProvider"
      contains: "RootLayout"
    - path: "app/page.tsx"
      provides: "Placeholder landing — Plan 07 expands with SettingsMenu"
    - path: "vercel.json"
      provides: "Vercel project settings (framework=nextjs, Cape Town region for POPIA)"
      contains: "framework"
    - path: "sanity.test.ts"
      provides: "Three-test tripwire: Vitest runs, Node 24 confirmed, jsdom active"
      contains: "describe"
    - path: "README.md"
      provides: "Minimal dev-run instructions (pnpm install, pnpm dev, tests)"
  key_links:
    - from: "package.json"
      to: "vitest@^4.1"
      via: "devDependencies pin"
      pattern: "\"vitest\":\\s*\"\\^4\\.1"
    - from: "package.json"
      to: "next@16.2.x"
      via: "dependencies pin"
      pattern: "\"next\":\\s*\"\\^?16\\.2"
    - from: "next.config.ts"
      to: "reactStrictMode: true"
      via: "Pitfall 5 prevention #4"
      pattern: "reactStrictMode:\\s*true"
    - from: ".nvmrc"
      to: "Node 24"
      via: "runtime pin"
      pattern: "^24"
---

<objective>
Fork `phaserjs/template-nextjs` and upgrade it to produce the repo scaffold every downstream Phase-1 plan assumes exists: Next 16.2.x + React 19.2.x + Turbopack + pnpm workspaces + Vitest 4.1.x + Biome (lint/format) + `.env.example` + minimal `app/layout.tsx` + `app/page.tsx` stubs + Vercel project link. The phase exits Plan 01 with `pnpm install && pnpm typecheck && pnpm test && pnpm build` all green.

This plan implements **D-01** (fork Phaser template, upgrade to Next 16.2.x + React 19.2.x), **D-02** (pnpm + workspaces), **D-03** (Turbopack stays on), and **D-23 revised** (Vitest pinned to `^4.1`, NOT `^2.x.y`). It deliberately does NOT create `proxy.ts`, `middleware.ts`, or any Supabase helper files — those belong to Plan 02 per D-25/D-26/D-27. Plan 02 owns the Next 16 `proxy.ts` convention, the `createProxyClient` helper, and the cookie-sync pattern.

Requirement claim: **OPS-04** (magic-link cross-browser support). The scaffold enables OPS-04 — the manual smoke in Plan 08 runs against this scaffold. Plan 01 is the foundation that makes OPS-04 achievable; Plans 02/07/08 execute and verify it.

Lint/format choice (per CONTEXT.md "Claude's Discretion"): **Biome** — faster than ESLint+Prettier, single tool, single config file, single install. Documented in this plan's Task 2. An executor who prefers ESLint flat config + Prettier may substitute (alternative block provided in Task 2 action).

Purpose: every subsequent plan's `pnpm` commands work from a clean clone. Pitfalls absorbed preemptively: Vitest major-version surprise (locked to 4.1.x so Plans 03/05/06/07 don't hit a v2->v4 migration mid-phase), Next 14 EOL (upgraded to 16.2.x), React 18->19 (upgraded to 19.2.x).

Output: green CI-shaped chain (`pnpm install && pnpm typecheck && pnpm test && pnpm build`) on a laptop; Vercel preview URL reachable (or Vercel link at minimum).
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
@/Users/rainierpotgieter/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-scaffold/01-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md

<interfaces>
<!-- Pinned versions from STACK.md — Plan 01 lands all of these at install time.
     Plan 02 does NOT re-install any of the dependencies in this block. -->

```
next@16.2.4
react@19.2.0
react-dom@19.2.0
typescript@^5.6.0
@types/node
@types/react
@types/react-dom
```

<!-- D-23 REVISED (2026-04-20) — Vitest bumped v2 -> v4.1. THIS IS THE CRITICAL DELTA. -->

```
vitest@^4.1           # D-23 revised: NOT ^2.1.8, NOT ^2.x.y
@vitest/ui@^4.1       # D-23 revised
jsdom                 # Vitest 4 environment for Plans 03/04/06/07 tests
```

<!-- Plan 04 installs @testing-library/react@^16 + @testing-library/jest-dom@^6 later.
     Plan 01 does NOT install them — vitest.setup.ts guards that import. -->

<!-- Workspaces (D-02) — lets Phase 2 link `@logic-md/core` as `workspace:*` -->

```yaml
# pnpm-workspace.yaml
packages:
  - '.'
  # Phase 2 will add:
  # - packages/logic-md-core
```

<!-- Turbopack (D-03) — the Next 16 default. Do NOT disable. -->

```ts
// next.config.ts — skeleton
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,      // Pitfall 5 prevention #4
  output: 'standalone',       // smaller Docker artifact; helps Phase 5 bundle target
  // No `experimental.turbo` needed — Turbopack is the default bundler in Next 16.
};

export default nextConfig;
```

<!-- From CONTEXT.md (revised) — Plan 02 owns proxy.ts. Plan 01 must NOT scaffold it. -->
<!-- D-25: Next 16 file is `proxy.ts` (not `middleware.ts`). Plan 02 creates it. -->
<!-- D-27: `lib/supabase/proxy.ts` (not `middleware.ts`) with `createProxyClient`. Plan 02 creates it. -->
<!-- This plan leaves a `# See Plan 02` pointer in `.env.example` for Supabase envs. -->

<!-- Vitest 4 migration surface (from CONTEXT.md D-23) -->
<!-- Phase 1's three planned tests (Plans 03/04/06/07 add more) do NOT touch these, -->
<!-- so the v4 bump is a clean pin with no code rewrites: -->
<!--   - V8 coverage is now AST-based (coverage numbers differ from v2)                 -->
<!--   - `workspace` config option renamed to `projects`                                 -->
<!--   - Browser provider config accepts an object (not string)                          -->

<!-- Pinned Node version per STACK.md Compatibility Matrix: Node 24 LTS (Vercel Fluid default) -->
```
.nvmrc contents: 24
```

<!-- Biome (chosen lint/format per Claude's Discretion) pin -->
```
@biomejs/biome@^1.9.0
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Fork phaserjs/template-nextjs, upgrade to Next 16.2.x + React 19.2.x, pnpm workspaces, Node 24 pin</name>
  <files>package.json, pnpm-workspace.yaml, .nvmrc, .gitignore, tsconfig.json, next.config.ts, .env.example, app/layout.tsx, app/page.tsx, app/globals.css, README.md</files>

  <read_first>
    - https://github.com/phaserjs/template-nextjs — the canonical Phaser + Next starting point (D-01). Executor clones/forks this as the base. Note: the template ships Next 15.3.1 — we upgrade to 16.2.x in this task.
    - https://nextjs.org/docs/app/guides/upgrading/version-16 — official Next 15->16 upgrade notes. Read the file-convention changes (especially `middleware.ts` -> `proxy.ts`) so Plan 02 lands it correctly.
    - .planning/research/STACK.md — "Installation (copy-paste-ready)" block + "Critical deviations from design doc section 8" (Next 14 -> 16.2.x, Phaser 3.80 -> 3.90.0)
    - .planning/phases/01-scaffold/01-CONTEXT.md — D-01, D-02, D-03, D-19 (Vercel from day 1), D-23 revised (Vitest 4)
    - .planning/research/ARCHITECTURE.md — "Recommended Project Structure" (app/, game/, ui/, lib/, state/ layout — Plans 02-07 populate these; Plan 01 creates only app/)
  </read_first>

  <action>
1. **Bootstrap by forking `phaserjs/template-nextjs`.** From a clean checkout directory of the project root:
```bash
# From /Users/rainierpotgieter/development/cluu
# The repo already contains docs/ and .planning/ — preserve them.
cd /tmp
git clone --depth 1 https://github.com/phaserjs/template-nextjs.git cluu-template
# Copy everything except .git, node_modules, README.md, package-lock.json (we use pnpm).
# Do NOT overwrite docs/, .planning/, CLAUDE.md, or any existing .gitignore entries related to planning.
rsync -a --exclude='.git' --exclude='node_modules' --exclude='package-lock.json' --exclude='README.md' cluu-template/ /Users/rainierpotgieter/development/cluu/
cd /Users/rainierpotgieter/development/cluu
rm -rf /tmp/cluu-template
```

2. **Rewrite `package.json`** (the template ships Next 15 — we target Next 16). Full contents:
```json
{
  "name": "cluu",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write .",
    "format": "biome format --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "next": "16.2.4",
    "phaser": "3.90.0",
    "react": "19.2.0",
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitest/ui": "^4.1.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.0",
    "vitest": "^4.1.0"
  }
}
```

Phaser 3.90.0 lives in dependencies so `pnpm install` pulls it; Plans 04/05 actually USE it. Pinning the version in Plan 01 lets those plans assume the library is installed.

3. **Create `pnpm-workspace.yaml`** (D-02 — workspaces ready for Phase 2 `@logic-md/core` link):
```yaml
packages:
  - '.'
  # Phase 2 will add:
  # - packages/logic-md-core
```

4. **Create `.nvmrc`** — Node 24 pin (one line, no trailing whitespace):
```
24
```

5. **Update `.gitignore`** — ensure Next/pnpm/Vercel artifacts are ignored. If the template's `.gitignore` is missing any of these, append:
```
# dependencies
node_modules/
.pnpm-store/

# next.js
.next/
out/

# vercel
.vercel/

# testing
coverage/

# env files (never commit real values)
.env
.env.local
.env.production.local
.env.development.local
.env.test.local

# OS
.DS_Store

# editor
.vscode/
.idea/

# phaser / assets build output
build/

# typescript
*.tsbuildinfo

# vitest
.vitest-cache/
```

6. **Rewrite `next.config.ts`** — Next 16.2.x with React StrictMode ON (Pitfall 5 prevention #4), standalone output, Turbopack implicit default (D-03):
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,        // Pitfall 5 prevention #4 — catches Phaser scene-leak bugs in dev
  output: 'standalone',         // smaller Docker artifact (Phase 5 bundle target)
  // Turbopack is the Next 16 default bundler — do NOT add `experimental.turbo: false` (D-03).
  // Plan 06 will wrap this export with `withSentryConfig(...)` — do not add Sentry here.
};

export default nextConfig;
```

7. **Rewrite `tsconfig.json`** — TS 5.6 strict, Next 16 plugin, `@/*` path alias (used by every later plan):
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
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "build", "coverage"]
}
```

8. **Rewrite `.env.example`** — placeholder envs. Supabase vars are Plan 02's responsibility; this plan leaves a commented pointer:
```env
# Cluu environment variables
# Fill real values in .env.local (gitignored). Never commit real secrets.

# Supabase — owned by Plan 02 (see .planning/phases/01-scaffold/01-02-supabase-auth-PLAN.md).
# Values come from Supabase Dashboard -> Project Settings -> API after Plan 02 runs.
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# PostHog — owned by Plan 06 (consent-gated; no events fire until user clicks Accept).
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com

# Sentry — owned by Plan 06.
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=

# Vercel — used by the platform itself; set in Vercel dashboard, not here.
# VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID live in CI secrets only.
```

9. **Create `app/layout.tsx`** — minimal root layout. Plan 03 wraps children in `<StoreProvider>`, Plan 06 adds `<PostHogProvider>` + `<ConsentBanner />`:
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

10. **Create `app/page.tsx`** — placeholder landing. Plan 07 replaces with a real landing + SettingsMenu:
```tsx
export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Cluu</h1>
      <p>
        <a href="/play">Start playing</a>
      </p>
    </main>
  );
}
```

11. **Create `app/globals.css`** — minimal reset (preserve anything the template ships; append if needed):
```css
html,
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  color: #2d2a26;
  background: #faf8f3;
}

* {
  box-sizing: border-box;
}

a {
  color: #2d6a4f;
}
```

12. **Create `README.md`** (minimal — the planning docs are source of truth):
```markdown
# Cluu

A cozy browser game that teaches prompting through gameplay.

## Quick start

nvm use          # Node 24
pnpm install
pnpm dev         # http://localhost:3000

## Scripts

- pnpm dev — Next.js dev server (Turbopack)
- pnpm build — production build
- pnpm test — Vitest once (CI shape)
- pnpm test:watch — Vitest in watch mode
- pnpm typecheck — tsc --noEmit
- pnpm lint / pnpm lint:fix / pnpm format — Biome

## Where the rest of the docs live

- .planning/PROJECT.md — project constraints and decisions
- .planning/ROADMAP.md — phase plan
- .planning/phases/01-scaffold/ — Phase 1 plans
- .planning/research/ — STACK, ARCHITECTURE, PITFALLS research docs
- docs/cluu-v1-design.md — locked design spec
```

13. **Install dependencies**:
```bash
cd /Users/rainierpotgieter/development/cluu
pnpm install
```

Must resolve cleanly. `packageManager` field in `package.json` pins pnpm version.

14. **Sanity check — Vitest 4 version MUST report 4.1.x**:
```bash
pnpm exec vitest --version
# Expected: vitest/4.1.x ... (NOT 2.x.y)
```

If this prints 2.x.y, the pin did NOT take — re-check `package.json` line `"vitest": "^4.1.0"`.
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu && test -f package.json && test -f pnpm-workspace.yaml && test -f .nvmrc && test -f next.config.ts && test -f tsconfig.json && test -f .env.example && test -f app/layout.tsx && test -f app/page.tsx && grep -q '"next": "16.2' package.json && grep -q '"react": "19.2' package.json && grep -q '"vitest": "\^4\.1' package.json && ! grep -q '"vitest": "\^2' package.json && grep -q 'reactStrictMode: true' next.config.ts && grep -qx '24' .nvmrc && pnpm install && pnpm typecheck && pnpm exec vitest --version | grep -E 'vitest/4\.1'</automated>
  </verify>

  <acceptance_criteria>
    - `package.json` pins `"next": "16.2.x"` — grep: `grep -E '"next":\s*"\^?16\.2' package.json` matches
    - `package.json` pins `"react": "19.2.0"` AND `"react-dom": "19.2.0"`
    - `package.json` pins `"vitest": "^4.1.0"` AND `"@vitest/ui": "^4.1.0"` (D-23 revised — both MUST be `^4.1`)
    - `package.json` contains NO `"vitest": "^2` entry — grep: `! grep -q '"vitest": "\^2' package.json` — proves the old pin is gone
    - `.nvmrc` contents equal exactly `24` (one line, no whitespace)
    - `pnpm-workspace.yaml` exists with a `packages:` key (D-02)
    - `next.config.ts` contains `reactStrictMode: true` (Pitfall 5 prevention #4)
    - `next.config.ts` does NOT contain `experimental: { turbo: false }` or any Turbopack-disabling config (D-03)
    - `tsconfig.json` has `"strict": true` AND a `@/*` path alias
    - `.env.example` contains the placeholder `NEXT_PUBLIC_SUPABASE_URL=` line (with ownership pointer to Plan 02)
    - `.env.example` contains ZERO references to `middleware.ts` (Plan 02 owns proxy.ts per D-25)
    - `app/layout.tsx` exports default `RootLayout` rendering `<html><body>{children}</body></html>`
    - `app/page.tsx` renders a placeholder landing (Plan 07 replaces)
    - `pnpm install` completes without error
    - `pnpm typecheck` exits 0
    - `pnpm exec vitest --version` output matches `vitest/4.1` (proves D-23 revised pin is live, not 2.x)
    - NO file `middleware.ts` OR `proxy.ts` exists at repo root — Plan 02 owns that: `! test -f middleware.ts && ! test -f proxy.ts`
    - NO `lib/supabase/` directory exists — Plan 02 owns it: `! test -d lib/supabase`
  </acceptance_criteria>

  <done>Fresh clone + `pnpm install` + `pnpm typecheck` succeed. Next 16.2.x + React 19.2.x + Vitest 4.1.x pins land exactly as written. Turbopack default and StrictMode ON. pnpm workspaces ready for Phase 2. Zero Supabase/proxy files created — Plan 02 owns them.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Wire Vitest 4.1, Biome lint/format, sanity test, Vercel config, and green `pnpm build`</name>
  <files>vitest.config.ts, vitest.setup.ts, biome.json, sanity.test.ts, vercel.json</files>

  <read_first>
    - https://vitest.dev/guide/ — Vitest 4 docs (executor reads LIVE because Vitest 4.1 is new). Specifically: v4 changelog for the `workspace` -> `projects` rename and V8 coverage AST shift. CONTEXT.md D-23 flags these.
    - https://biomejs.dev/guides/getting-started/ — Biome v1 docs for `biome init` + config shape.
    - .planning/phases/01-scaffold/01-CONTEXT.md — "Claude's Discretion" line about lint/format choice; D-19 (Vercel from day 1)
    - package.json (Task 1) — scripts block — verify `test` and `lint` scripts reference the tools this task installs.
  </read_first>

  <behavior>
    - Test 1 (sanity): `expect(1 + 1).toBe(2)` passes — proves Vitest runs at all.
    - Test 2 (version guard): a test asserting `parseInt(process.versions.node.split('.')[0], 10) >= 24` — proves Node 24+ is the runtime (Vitest 4 requirement).
    - Test 3 (jsdom smoke): a test that does `document.createElement('div')` and asserts it works — proves the jsdom environment is wired (Plans 03/04/06/07 need this).
  </behavior>

  <action>
1. **Create `vitest.config.ts`** — Vitest 4.1 config with jsdom environment. Phase 1 does NOT use multi-project (`projects` key, renamed from `workspace` in v4) — single config is enough:
```ts
// vitest.config.ts
// Vitest 4.1.x (D-23 revised). Node 24 required (STACK.md compat matrix).
// v4 renamed `workspace` -> `projects`; Phase 1 does not need projects.
// V8 coverage is now AST-based in v4 (coverage numbers differ from v2) — Phase 1 does not enforce coverage %.
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',        // Plans 03/04/06/07 test components + localStorage
    setupFiles: ['./vitest.setup.ts'],
    // No `projects` key — single-project is correct for Phase 1.
    // No coverage threshold — Phase 5 will add one.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),   // matches tsconfig.json paths
    },
  },
});
```

2. **Create `vitest.setup.ts`** — jsdom polyfills + optional `@testing-library/jest-dom` matchers (Plan 04 installs the library; this setup file gracefully no-ops if not yet installed):
```ts
// vitest.setup.ts
// Runs before every test file. Adds jsdom polyfills used by Plans 03-07.

// crypto.randomUUID polyfill — jsdom includes crypto but older Node APIs might miss randomUUID.
// State store (Plan 03) uses it for idempotency keys.
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.randomUUID !== 'function') {
  // @ts-expect-error — minimal shim
  globalThis.crypto = globalThis.crypto ?? {};
  // @ts-expect-error — minimal shim
  globalThis.crypto.randomUUID = () => `test-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

// @testing-library/jest-dom matchers are loaded lazily — Plan 04 installs the package.
// Guard the import so this file does not crash if run before that install.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jd = require('@testing-library/jest-dom/vitest');
  void jd;   // Import registers matchers as a side effect.
} catch {
  // Not yet installed (pre-Plan-04) — skip silently.
}
```

3. **Create `sanity.test.ts` at repo root** — three tiny tests that prove the test pipeline works end-to-end:
```ts
// sanity.test.ts
// Phase 1 Plan 01 sanity tests. Kept through Phase 1 as a tripwire —
// if this ever goes red, the toolchain regressed. Phase 2 can delete.
import { describe, it, expect } from 'vitest';

describe('Vitest 4.1 sanity (D-23 revised)', () => {
  it('runs at all', () => {
    expect(1 + 1).toBe(2);
  });

  it('runs on Node 24+ (Vitest 4 requirement)', () => {
    const major = parseInt(process.versions.node.split('.')[0], 10);
    expect(major).toBeGreaterThanOrEqual(24);
  });

  it('jsdom environment is active (needed by Plans 03/04/06/07)', () => {
    const el = document.createElement('div');
    el.textContent = 'ok';
    expect(el.textContent).toBe('ok');
  });
});
```

4. **Initialize Biome** (chosen per "Claude's Discretion"):
```bash
pnpm exec biome init
```

This generates `biome.json`. Overwrite it with the minimal Next 16 + TS config:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noNonNullAssertion": "warn"
      },
      "suspicious": {
        "noExplicitAny": "warn"
      },
      "correctness": {
        "useExhaustiveDependencies": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "files": {
    "ignore": [".next", "build", "coverage", "node_modules", ".pnpm-store", ".vercel"]
  }
}
```

**Alternative** (if Biome install fails or executor prefers ESLint+Prettier): install ESLint flat config + Prettier per Next 16 defaults:
```bash
pnpm add -D eslint@^9 @next/eslint-plugin-next eslint-config-next prettier
```
Then create `eslint.config.mjs` following the Next 16 flat config template, and update `package.json` scripts accordingly. Document the alternative choice in the phase SUMMARY.

5. **Create `vercel.json`** — minimal project settings so preview deploys inherit the right defaults (D-19):
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "outputDirectory": ".next",
  "regions": ["cpt1"]
}
```

The `"regions": ["cpt1"]` (Cape Town) aligns with POPIA — keeps latency low for the South African audience. Phase 5 revisits if wider regional rollout is needed.

6. **(Optional) Link the Vercel project.** If `vercel` CLI is logged in:
```bash
pnpm dlx vercel link --yes --project cluu
```
Writes `.vercel/project.json` (already gitignored). If CLI isn't available, document the manual step in the phase SUMMARY and move on — Plan 08's smoke can run against localhost for Phase 1.

7. **Run the full green chain**:
```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

All five MUST exit 0. The `pnpm build` step confirms Next 16 + React 19 + Turbopack produce a valid bundle against the minimal `app/layout.tsx` + `app/page.tsx`.
  </action>

  <verify>
    <automated>cd /Users/rainierpotgieter/development/cluu && test -f vitest.config.ts && test -f vitest.setup.ts && test -f biome.json && test -f sanity.test.ts && test -f vercel.json && pnpm test sanity.test.ts && pnpm lint && pnpm build</automated>
  </verify>

  <acceptance_criteria>
    - `vitest.config.ts` exists and uses `defineConfig` from `vitest/config`
    - `vitest.config.ts` sets `environment: 'jsdom'` (needed by Plans 03/04/06/07 tests)
    - `vitest.config.ts` contains NO `workspace:` key (renamed to `projects` in v4; Phase 1 needs neither)
    - `vitest.setup.ts` exists with crypto.randomUUID polyfill + guarded `@testing-library/jest-dom/vitest` import
    - `biome.json` exists with `linter.enabled: true` and `formatter.enabled: true`
    - `sanity.test.ts` exists at repo root with three passing tests (runs-at-all, Node 24+, jsdom active)
    - `pnpm test sanity.test.ts` exits 0 with 3/3 passing
    - `pnpm lint` exits 0 (Biome accepts the scaffold with no violations)
    - `pnpm build` exits 0 — proves Next 16.2.x + React 19.2.x + Turbopack default boot cleanly
    - `vercel.json` exists with `"framework": "nextjs"` and `"regions": ["cpt1"]`
  </acceptance_criteria>

  <done>Vitest 4.1 pipeline is live and green on a real sanity test. Biome lints the scaffold clean. `pnpm build` succeeds on Next 16 + React 19 + Turbopack. Vercel config in place for preview deploys. D-23 revised pin proven live by `vitest --version` reporting 4.1.x.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Dev laptop -> npm registry | Package install — supply chain trust (pnpm lockfile mitigates) |
| Source repo -> Vercel build | Build environment trust (env vars only in Vercel dashboard) |
| Vercel -> public internet | Preview/production deploys are public by default in Phase 1 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Tampering | Malicious package in pnpm dependency tree | mitigate | Pinned versions in `package.json` (exact for phaser@3.90.0; tight caret for others). `pnpm install` without `--no-frozen-lockfile` in CI (Phase 5 adds). |
| T-01-02 | Information Disclosure | `.env` or `.env.local` committed by accident | mitigate | `.gitignore` explicitly excludes all `.env*` files except `.env.example`. Acceptance criteria verifies the .gitignore entries. |
| T-01-03 | Information Disclosure | Secrets leaked to client bundle via `NEXT_PUBLIC_*` | accept | Plan 01 does not define any `NEXT_PUBLIC_*` SECRETS — only public URLs/keys. Plan 02+ owns real env vars; threat model repeats there. |
| T-01-04 | Elevation of Privilege | Vercel CLI token with too-wide scope leaks from a dev machine | accept | Documented in `user_setup` — user chooses scope. Phase 5 hardens with per-project tokens. |
| T-01-05 | Denial of Service | Vercel build loop burns compute on a bad commit | accept | Phase 1 has low traffic; Vercel ships bandwidth/build caps by default. Phase 5 adds budget alerts. |
| T-01-06 | Spoofing | Dev laptop clones wrong template (e.g. a typosquatted fork of phaserjs/template-nextjs) | accept | Canonical URL (`github.com/phaserjs/template-nextjs`) is in read_first + action block. Manual verification. |
</threat_model>

<verification>
1. `pnpm install` from a clean clone completes without error
2. `pnpm exec vitest --version` reports 4.1.x (proves D-23 revised pin is live)
3. `pnpm typecheck` exits 0
4. `pnpm test` exits 0 (sanity.test.ts 3/3 passing)
5. `pnpm lint` exits 0 (Biome accepts the scaffold)
6. `pnpm build` exits 0 (Next 16 + React 19 + Turbopack produces a valid bundle against `app/layout.tsx` + `app/page.tsx`)
7. `pnpm dev` starts without error; `http://localhost:3000` renders the placeholder landing
8. `! test -f middleware.ts && ! test -f proxy.ts` — Plan 02 owns the proxy.ts; Plan 01 must not create it
9. `! test -d lib/supabase` — Plan 02 owns it; Plan 01 must not create it
10. `grep -q '"vitest": "\^4\.1' package.json && ! grep -q '"vitest": "\^2' package.json` — D-23 revised proof
11. Vercel preview URL reachable (or `vercel link` completed locally); deploy-on-branch-push working from day 1 (D-19)
</verification>

<success_criteria>
- D-01: Fork `phaserjs/template-nextjs`; upgrade to Next 16.2.x + React 19.2.x
- D-02: pnpm workspaces enabled (ready for `@logic-md/core` link in Phase 2)
- D-03: Turbopack stays on (no `experimental.turbo: false`)
- D-19: Vercel project linked or `vercel.json` declares preview/prod settings
- D-23 revised: Vitest pinned to `^4.1` (NOT `^2.x.y`); `vitest --version` reports 4.1.x
- `pnpm install && pnpm typecheck && pnpm test && pnpm lint && pnpm build` all exit 0
- React StrictMode ON in `next.config.ts` (Pitfall 5 prevention #4)
- Node 24 pinned in `.nvmrc`
- Plan 02 ownership preserved: NO middleware.ts, NO proxy.ts, NO lib/supabase/ created by this plan
- OPS-04 foundation in place — scaffold enables the cross-browser smoke in Plan 08
</success_criteria>

<output>
After completion, create `.planning/phases/01-scaffold/01-01-SUMMARY.md` with:
- Exact Vitest version that landed (output of `pnpm exec vitest --version`) — proof of D-23 revised
- Exact Next/React versions that landed (output of `pnpm list --depth=0 | grep -E "next@|react@"`)
- Lint/format tool chosen (Biome — or ESLint+Prettier if the alternative was taken; document which)
- `pnpm build` exit status and bundle size summary
- Whether `vercel link` was completed locally or deferred
- Confirmed: no middleware.ts, no proxy.ts, no lib/supabase/ exist (Plan 02 ownership preserved)
- Known issues: none expected; if Biome init had friction, note the fallback
</output>
