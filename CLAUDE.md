<!-- GSD:project-start source:PROJECT.md -->
## Project

**Cluu**

A cozy browser game that teaches prompting and Claude fluency through gameplay. The player walks their Cluu companion around a small island, solves described-into-existence encounters, and saves winning prompts to a real Library they keep forever. Built for curious students aged 15–22 by Single Source Studios as a solo project, and designed to dogfood LOGIC.md in a consumer product.

**Core Value:** **The Library is the tether between game and real life.** Every great prompt a player writes in an encounter becomes a real, exportable tool they can use in Cursor, Claude Code, and Cowork. Without the Library, Cluu is a toy. With the Library, Cluu is a tool. If everything else ships and the Library export doesn't work, the project has failed.

### Constraints

- **Tech stack**: Next.js 16.2.x App Router + Phaser.js 3.90.x (Canvas renderer) + Supabase (Auth + Postgres) + Vercel — locked per design doc §8 as amended 2026-04-20. Further deviations require explicit revision of the doc.
- **LLM providers**: Claude Sonnet 4.6 for generation, Claude Haiku 4.5 for grading, via Anthropic API. No alternative providers in v1.
- **Platform**: Browser-first (desktop + mobile web). Touch and keyboard input from day one. Native wrappers deferred to v1.2.
- **Input sanitization**: Max 500 chars on player prompts, XML-like tag stripping, grader system prompt must explicitly ignore meta-instructions from user input.
- **Rate limiting**: Per-user daily cap (20 encounter attempts) via Upstash Redis; identical-prompt cache required before hitting the model.
- **Performance**: 60fps on iPhone SE 2020; initial bundle <2MB.
- **Timeline**: 4–6 month target, 7–9 month realistic ceiling. If behind at month 3, drop Tide Pools (save for v1.1). Never cut the Library export.
- **Team**: Solo. Every line owned. No parallel human contributors in v1.
- **Privacy**: POPIA-compatible analytics; never log raw player prompts to analytics without explicit opt-in.
- **Grading reliability**: Each encounter must achieve ≥95% human/Haiku grading agreement over a 50-prompt test suite before it ships.
- **Business model**: Free core game in v1. No paid cosmetics until v1.1. A "founders' pack" ($5, unlimited attempts + 3 exclusive hats) is under consideration but not committed.
- **Monetisation guardrails**: No leaderboards, streaks, push notifications, or social-proof metrics — ever. The mood system is relational, not a retention lever.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Critical deviations from design doc §8
| Locked spec | Reality (2026-04-20) | Required action | Confidence |
|---|---|---|---|
| Next.js 14 App Router | **Next.js 14 reached EOL on 2025-10-26.** No security patches. Vercel templates and Supabase/Phaser docs target 15+/16. | **Use Next.js 16.2.x (current Active LTS).** Fallback: 15.x (Maintenance LTS) only if 16 migration friction blocks Week 1. | HIGH |
| Phaser.js 3.80+ | Current stable is Phaser **3.90.0 "Tsugumi"** (2025-05-23). Phaser 4 at RC7 — not production-ready. | **Use Phaser 3.90.x.** Do NOT adopt Phaser 4 until stable release + 3 months burn-in. | HIGH |
## Recommended Stack
### Core Technologies
| Technology | Version (pin) | Purpose | Why This Exact Version |
|---|---|---|---|
| **Next.js** | `16.2.4` (App Router) | Framework, routing, SSR for landing + share card OG, API routes for grading | 16 is Active LTS until ~2028; 14 is EOL; Turbopack is now stable default; React 19.2 shipped; `ImageResponse` moved to `next/og` with 2-20× speedup. Official Phaser template uses 15.3.1, but 16 is a safe upgrade for greenfield. |
| **React** | `19.2.x` | UI layer inside Next.js | Shipped with Next 16; `useEffectEvent`, Activity, View Transitions available. Next 16 pins this. |
| **Phaser** | `3.90.0` ("Tsugumi") | 2D game engine — scenes, input, animation, tweens, Arcade Physics | Current stable. Includes EXPAND scale mode fixes for ultra-wide, text-rendering fix for Chrome/Edge 134, physics fixes relevant to tile collisions. Phaser 4 is not production-ready. |
| **TypeScript** | `5.6.x` or later | Type safety everywhere | Next 16 + Phaser template ships with TS 5. Use `strict: true`. |
| **Supabase (Postgres + Auth)** | self-hosted service | `player_state`, `library_entries`, `users`, `cosmetic_catalogue`, auth | Design-doc locked. POPIA story, Postgres + RLS, magic-link OTP built in. |
| **Anthropic API** | via SDK `0.90.x` | Generation (Sonnet 4.6) + Grading (Haiku 4.5) | Design-doc locked. SDK is actively maintained (last published hours before research date). |
| **Vercel** | (Fluid Compute, Node 24 LTS) | Hosting, deploy, OG generation, cron (if needed) | Design-doc locked. Fluid Compute is the 2026 default — do NOT enable Edge runtime for grading. |
### Client SDKs and Libraries
| Library | Pin | Purpose | When to Use |
|---|---|---|---|
| **`@anthropic-ai/sdk`** | `^0.90.0` | Official TypeScript client for Claude API | Both generation and grading calls. Streaming supported. Prompt caching now automatic via `cache_control` (no beta header). |
| **`@supabase/supabase-js`** | `^2.103.3` | Core Supabase client (browser-side reads, auth in client components) | Import from client components only; server paths use `@supabase/ssr`. |
| **`@supabase/ssr`** | `^0.10.2` | SSR-safe cookie-based Supabase clients for App Router | `createBrowserClient`, `createServerClient` helpers. Required for Next.js App Router. PKCE is default. |
| **`phaser`** | `3.90.0` (exact) | Game engine (see Core) | Pin exact — minor versions change renderer behaviour. |
| **`zustand`** | `^5.0.12` | Client state (mood, current encounter, inventory UI) | **Use the Store Factory pattern + `<StoreProvider>`** — global singleton leaks across requests in App Router. See "Integration gotchas". |
| **`@upstash/redis`** | `^1.34.x` | Redis client (HTTP/REST — works on Node runtime and Edge) | Backend for rate limiter and prompt-hash cache. |
| **`@upstash/ratelimit`** | `^2.0.x` | Sliding-window / token-bucket rate limiter | Wrap the grading endpoint. 20 attempts/day/user per design doc. |
| **`next/og`** (built-in, from Next 16) | bundled | Share-card PNG generation (1200×630) | Use `ImageResponse` from `next/og` — **do not** install `@vercel/og` separately on Next 16+. |
| **`@sentry/nextjs`** | `^10.48.x` | Error tracking — client, server, edge | `withSentryConfig` wrap in `next.config.ts`; instrument Server Actions with `Sentry.withServerActionInstrumentation`. |
| **`@posthog/next`** (preferred) or `posthog-js` + `posthog-node` | latest | Analytics (events, funnels, POPIA-friendly) | `@posthog/next` bundles App Router support, RSC capture, middleware. Set `defaults: '2026-01-30'`. |
| **`gray-matter`** | `^4.0.3` | YAML front-matter parse for `.logic.md` files | Used by the LOGIC.md compiler path (`@logic-md/core`). Stable, no changes needed. |
| **`zod`** | `^3.23.x` | Runtime schema validation for grading contracts + API boundaries | Validate Haiku's JSON grade response, encounter front-matter, player input shape. |
| **`@logic-md/core`** | internal, `workspace:*` | The studio's flagship grading compiler | Not on public npm — link via workspace (pnpm/npm workspaces) or private registry. Dogfood: expect 10% build time feeding fixes back to the lib. |
### Game-adjacent tooling
| Tool | Purpose | Notes |
|---|---|---|
| **Aseprite** | Sprite authoring (32×32 tiles, 48×48 Cluu) | Design-doc §8 / §13. Export frames + JSON Hash. |
| **`phaser3-parcel-template`-style dev loop** | Not needed | Next.js already provides HMR via Turbopack. Use the official `phaserjs/template-nextjs` patterns for the Phaser bridge. |
| **Phaser Editor 2D** (optional) | Scene/tilemap WYSIWYG | Supports 3.90. Skip for v1 if you're comfortable with code-first scenes — saves tool-learning time. |
### Dev & CI
| Tool | Purpose | Notes |
|---|---|---|
| **pnpm** | Package manager | Faster installs; workspace support needed for `@logic-md/core`. |
| **GitHub Actions** | CI | Design-doc locked. |
| **Vitest** | Unit tests (grading contract, compiler, utils) | Pairs well with Next 16 + TS. Not Jest. |
| **Playwright** | E2E smoke (auth flow, first encounter, library export) | Overkill for v1 MVP; add at Week 22 (launch prep). |
| **Biome** or **ESLint + Prettier** | Lint/format | Biome is faster; either works. Next 16 ships ESLint flat config defaults. |
## Installation (copy-paste-ready)
# Core framework
# Game engine
# Supabase
# Anthropic
# State + utilities
# Rate limit + cache
# Analytics + errors
# LOGIC.md (private/workspace link)
# Dev
## Integration gotchas (where two pieces couple)
### 1. Phaser inside Next.js App Router — client-only mount
- **Never** import `phaser` at module top-level of a server component. It references `window` at import time and will throw during build.
- Create `components/PhaserGame.tsx` with `'use client'` and import Phaser inside a `useEffect` to defer to the browser, OR use `next/dynamic` with `ssr: false` from a Server Component page.
- Recommended pattern (from official `phaserjs/template-nextjs`):
- Bundle note: Phaser adds ~1MB gzipped. Design-doc target is <2MB initial; this fits only if everything else is tight. Use `output: 'standalone'` + aggressive code-splitting.
### 2. Supabase magic-link + anonymous play migration
- Flow: on first visit, call `supabase.auth.signInAnonymously()` → get a user with `is_anonymous: true`. Save `player_state` row keyed on that user id.
- Later, the player hits "Save your island" → call `supabase.auth.updateUser({ email: "..." })` → Supabase sends magic link → on confirmation, the user's email identity is linked to the same `user_id`. `player_state.user_id` stays stable — **no migration needed** if you keep a single anonymous user from day one.
- **Do NOT** create a fresh user on signup and migrate rows — that's the 2023 pattern. Use anonymous → updateUser to upgrade in place.
- RLS policies: write `(auth.uid() = user_id)` — works identically for anon and email-confirmed users.
- Rate-limit anonymous-user creation at the edge. Anonymous users ARE real auth users; a malicious client can spawn many. Use `x-forwarded-for` + Upstash ratelimit on the "start a game" route if needed.
### 3. Next.js App Router + `@supabase/ssr` cookies
- Use `@supabase/ssr`'s `createBrowserClient` in client components, `createServerClient` in server components, route handlers, and middleware.
- **Never** mix `@supabase/auth-helpers-nextjs` (deprecated) with `@supabase/ssr`. Remove any legacy `createMiddlewareClient` / `createRouteHandlerClient` imports.
- Middleware pattern: read cookies → call `supabase.auth.getUser()` → refresh JWT if needed → pass through. This is the only reliable way to keep sessions alive in App Router.
- The callback for the magic link lands on `/auth/callback?code=…`. Handle with `exchangeCodeForSession` in a route handler.
### 4. Anthropic streaming on Vercel Fluid Compute
- **Use the Node.js runtime, NOT Edge.** Edge runtime is no longer recommended by Vercel as of the 2026 knowledge update. Fluid Compute runs on Node 24 LTS, default 300s timeout (up from 60s), and handles streaming natively.
- In your `app/api/encounter/grade/route.ts`:
- **Prompt caching**: put the fat `.logic.md` contract text (~2-8k tokens) under `cache_control: { type: 'ephemeral' }` in the system block. Min 1024 tokens to be cacheable for Haiku/Sonnet. Savings: ~90% cost on repeat grading calls against the same encounter. 5-min default TTL is fine; 1-hour TTL costs extra.
- **Structured outputs**: Haiku 4.5 supports native structured outputs (JSON-schema-constrained). Use this for the grading verdict — don't rely on prose-parsing.
- Model IDs (verified 2026-04-20):
### 5. Share card: `next/og` + Phaser sprite reuse
- `next/og` (from Next 16) generates PNG at edge or node. It does NOT have access to Phaser — it renders JSX/HTML → image via Satori.
- To include Cluu's current outfit on the share card, **don't reuse the Phaser canvas**. Instead, keep the cosmetic spritesheet frames as static PNG files in `public/`; compose them with JSX `<img>` or CSS background in the OG route.
- Route: `app/og/library/[entryId]/route.tsx` — fetch entry from Supabase, render `ImageResponse` 1200×630, serve. Cache via `Cache-Control: public, s-maxage=31536000, immutable`.
### 6. Upstash ratelimit — use Node, not Edge
- Edge runtime was the old "reason" to reach for Upstash (Redis TCP didn't work). With Fluid Compute on Node 24, you can ALSO use the standard `redis` node client — but `@upstash/redis` over HTTP is still fine and simpler.
- Place rate limit check inside the grading API route (not in middleware), so you can reject cleanly with a 429 and a body the client can render as "come back tomorrow" UI. Middleware rate-limiting is too blunt for per-encounter attempts.
- Pattern:
### 7. Zustand + SSR — store factory is mandatory
- A top-level `create()` will leak state between concurrent SSR requests. In App Router this means player A can briefly see player B's mood.
- Use `createStore` + `<StoreProvider>` at the layout boundary. Next.js documents this in the Zustand guide.
- Phaser state is the source of truth for in-world position/animation; Zustand holds UI state (encounter modal open?, current prompt draft, library filter). Do not sync every Phaser tick into Zustand — use the EventBus and update Zustand only on scene transitions / encounter open.
### 8. LOGIC.md compiler integration (`@logic-md/core`)
- Since this is the studio's own flagship, treat it as a local workspace dependency during build. Expect API churn — the design doc explicitly budgets 10% of build time for LOGIC.md feedback.
- Author `.logic.md` files in `/content/encounters/**/*.logic.md`. Parse at build time with `gray-matter`, hand off the body + contract to `@logic-md/core` at request time.
- Cache compiled contracts in memory per serverless instance (Fluid reuses instances → a Map{} works). Invalidate on deploy.
- Validate compiled contract shape with Zod before handing to the grading path.
## What NOT to Use
| Avoid | Why | Use Instead |
|---|---|---|
| **Next.js 14** | EOL 2025-10-26; no security patches; many libraries have dropped compatibility | Next.js 16.2.x (Active LTS) |
| **Phaser 4** | Still RC7 as of 2026-03; unstable API; known bugs being filed weekly | Phaser 3.90.0 stable |
| **Phaser WebGL renderer** | Design-doc locked on Canvas for simpler debugging; 2D sprite art doesn't need WebGL at this scale; Canvas is easier to screenshot for share cards | Phaser Canvas (`type: Phaser.CANVAS`) |
| **Edge runtime for grading/API routes** | Vercel 2026 guidance: Fluid Compute on Node is the default. Edge has compatibility issues (no full Node APIs) and the old "streaming only works on Edge" limitation is gone. | `runtime: 'nodejs'` on Fluid Compute (default) |
| **`@supabase/auth-helpers-nextjs`** | Deprecated; supabase team migrated everything to `@supabase/ssr`. Mixing the two breaks auth. | `@supabase/ssr` exclusively |
| **`@vercel/og` as a separate package (on Next 16)** | Now bundled as `next/og`. Installing it separately creates two copies of Satori and bloats bundle. | `import { ImageResponse } from 'next/og'` |
| **Pages Router** | Design-doc locks App Router. Going mixed creates two routing mental models + two auth client setups. | App Router only |
| **Redux / Redux Toolkit** | Overkill for this game's small client state; Zustand is simpler and App-Router-native with the factory pattern | Zustand 5 with Store Factory |
| **Firebase** | Design-doc §8 rejected: worse POPIA posture, not Postgres, no RLS. | Supabase |
| **Prisma** | Not needed. `player_state` is one JSONB column; Supabase client's query builder is enough. Adding Prisma = extra client generation + schema sync pain. | Supabase JS client directly |
| **Global singleton Zustand store** | SSR leak between requests in App Router | Store Factory + `<StoreProvider>` |
| **Loading Phaser from `<Script>` CDN** | Defeats tree-shaking, breaks TypeScript, loses HMR. | npm `phaser@3.90.0` + dynamic import |
| **Supabase Realtime for save state** | v1 is single-player; Realtime subscription is overhead. Just write on encounter complete. | `supabase.from('player_state').update(...)` on event |
| **Anthropic via OpenRouter / 3rd-party proxies** | Design-doc locks Anthropic direct. Adds latency, cost margin, and another point of failure. | Anthropic SDK direct OR Vercel AI Gateway (see below) |
## Stack patterns by variant
- Use **Vercel AI Gateway** + `@ai-sdk/anthropic`. Model string: `'anthropic/claude-sonnet-4.6'`, `'anthropic/claude-haiku-4.5'`. Routes through Vercel, adds logs/metrics, zero data retention.
- Trade-off: adds a small latency hop; locks to Vercel's gateway; harder to self-host later.
- **Recommendation for v1:** skip the gateway, call Anthropic SDK directly. Add the gateway in v1.1 once you have traffic worth observing.
- Fall back to `@ai-sdk/anthropic` + `streamText()` from the Vercel AI SDK — it normalizes streaming edge cases and handles backpressure cleanly. Costs an extra dependency (~80kb) but bulletproof.
- Move compiled `.logic.md` contracts out of filesystem and into Supabase Storage with signed URLs. v1's 27–37 encounters fit comfortably in the repo.
- Drop to `Phaser.CANVAS` explicitly (already design-doc choice — verify).
- Disable Arcade Physics world debug; ensure no `setInterval`-based tweens; use `scene.tweens` exclusively.
- Reduce sprite atlas count; atlas-pack everything per biome.
## Version compatibility matrix (verified)
| Package | Compatible with | Notes |
|---|---|---|
| Next.js 16.2.x | React 19.2.x | Pinned together. Next 16 will refuse to run on React <19. |
| Next.js 16.2.x | Node 22 / 24 LTS | Vercel Fluid default is Node 24. Node 18 is dead. Use `.nvmrc` = `24`. |
| Phaser 3.90.0 | Any modern browser (Safari 15+, Chrome 90+) | iPhone SE 2020 runs iOS 15+; compatible. |
| `@supabase/ssr` 0.10.x | `@supabase/supabase-js` 2.103.x | Always upgrade both together; they share internal client types. |
| `@anthropic-ai/sdk` 0.90.x | Node ≥18 | Works in Next 16 Node runtime. Streaming via ReadableStream works. |
| Zustand 5.x | React 18+ / 19+ | v5 supports React 19 concurrent features. No v4 breaking changes surface for simple stores. |
| `@upstash/ratelimit` 2.x | `@upstash/redis` 1.34+ | v2 changed analytics format; pair versions. |
| `@sentry/nextjs` 10.48+ | Next 16 | Turbopack source-map support; `turbopackReactComponentAnnotation` requires Next 16. |
## Confidence summary
| Item | Confidence | Evidence |
|---|---|---|
| Next.js 14 → 16 mandatory swap | HIGH | EOL confirmed by endoflife.date + Next.js docs. |
| Phaser 3.90.0 correct version | HIGH | phaser.io/download/stable, official template updated. |
| Phaser + Next.js integration pattern | HIGH | Official `phaserjs/template-nextjs` + generalist tutorial match. |
| Supabase anonymous → email upgrade flow | HIGH | Supabase docs + community-validated `updateUser({ email })` path. |
| Claude model IDs + pricing | HIGH | Anthropic blog posts, platform.claude.com model overview, Vercel AI Gateway listing all match. |
| Fluid Compute Node runtime for Anthropic streaming | HIGH | Vercel 2026 guidance in environment notes + Vercel docs confirm 300s streaming. |
| Prompt caching auto-enabled | HIGH | Anthropic docs, verified no beta header needed. |
| Haiku 4.5 structured outputs | HIGH | Anthropic blog post, platform docs. |
| Zustand store factory for App Router | HIGH | pmndrs/zustand official Next.js guide. |
| @posthog/next vs posthog-js | MEDIUM | Both viable; `@posthog/next` is newer and Vercel-blessed. Either ships. |
| `@logic-md/core` API stability | LOW | Studio-internal; expect churn. Budgeted per design doc §13. |
## Sources
- [Next.js EOL schedule — endoflife.date](https://endoflife.date/nextjs)
- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
- [Next.js Upgrading: Version 16 guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Phaser 3.90 release announcement](https://phaser.io/news/2025/05/phaser-v390-released)
- [Phaser 4 RC7 announcement (still not stable)](https://phaser.io/news/2026/03/phaser-v4-release-candidate-7)
- [Phaser + Next.js official template](https://github.com/phaserjs/template-nextjs) — Next 15.3.1 + Phaser 3.90.0
- [Anthropic Claude Sonnet 4.6 announcement (2026-02-17)](https://www.anthropic.com/news/claude-sonnet-4-6)
- [Anthropic Claude Haiku 4.5 announcement](https://www.anthropic.com/news/claude-haiku-4-5)
- [Claude API models overview](https://platform.claude.com/docs/en/about-claude/models/overview)
- [Claude prompt caching docs (automatic, no beta header)](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Claude structured outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [@anthropic-ai/sdk on npm (0.90.x)](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [@supabase/ssr on npm (0.10.2)](https://www.npmjs.com/package/@supabase/ssr)
- [@supabase/supabase-js on npm (2.103.3)](https://www.npmjs.com/package/@supabase/supabase-js)
- [Supabase Auth with Next.js App Router guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase ssr migration guide](https://supabase.com/docs/guides/troubleshooting/how-to-migrate-from-supabase-auth-helpers-to-ssr-package-5NRunM)
- [Zustand Next.js setup guide](https://zustand.docs.pmnd.rs/learn/guides/nextjs)
- [Zustand 5.0.12 on npm](https://www.npmjs.com/package/zustand)
- [@upstash/ratelimit GitHub](https://github.com/upstash/ratelimit-js)
- [Vercel Fluid Compute docs](https://vercel.com/docs/fluid-compute)
- [Vercel Functions streaming docs (300s limit)](https://vercel.com/docs/functions/streaming-functions)
- [Vercel AI Gateway — Claude Sonnet 4.6 live](https://vercel.com/changelog/claude-sonnet-4-6-is-live-on-ai-gateway)
- [Next.js ImageResponse (now `next/og`)](https://nextjs.org/docs/app/api-reference/functions/image-response)
- [@sentry/nextjs manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [PostHog Next.js App Router docs](https://posthog.com/docs/libraries/next-js)
- [Phaser + Next.js tutorial (generalistprogrammer, 2025)](https://generalistprogrammer.com/tutorials/phaser-nextjs-tutorial)
- [Next.js 16 vs 15 practical comparison](https://www.descope.com/blog/post/nextjs15-vs-nextjs16)
- [Magic Link + Supabase + Next.js SSR (2025 guide)](https://dev.to/nolliebigspin/building-magic-link-authentication-with-nextjs-server-side-rendering-and-supabase-45gn)
- `@logic-md/core` API — studio-internal, not independently verifiable.
- Exact bundle size of Phaser 3.90 with tree-shaking under Turbopack — measure at Week 1.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
