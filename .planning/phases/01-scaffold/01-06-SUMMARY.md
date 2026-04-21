---
phase: 01-scaffold
plan: 06
subsystem: infra
tags: [posthog, sentry, consent, popia, privacy, analytics, error-tracking, nextjs-16]

requires:
  - phase: 01-scaffold
    provides: StoreProvider (Plan 03) wraps layout; ConsentBanner + PostHogProvider nest inside it
provides:
  - Consent store (localStorage, key `cluu-consent-v1`) with get/set/subscribe
  - ConsentBanner UI with equal-weight Accept / Decline buttons (D-20 dark-pattern mitigation)
  - PostHogProvider that gates `posthog.init` on `consent.decision === 'accepted'`
  - Type-safe `track()` allowlist — no-op when consent absent or SDK uninitialized
  - Sentry wired for client + server + edge runtimes via instrumentation.ts
  - app/global-error.tsx with Sentry.captureException
  - next.config.ts wrapped with withSentryConfig, tunnelRoute `/monitoring-tunnel`
affects: [01-07, 01-08, 02-walking-skeleton, 05-launch-hardening]

tech-stack:
  added:
    - posthog-js@1.369.3
    - "@sentry/nextjs@10.49.0"
  patterns:
    - "POPIA consent gate: analytics SDK init deferred until explicit opt-in — proven by test that mocks posthog.capture and asserts zero calls before consent"
    - "Type-safe event allowlist in lib/analytics/track.ts — `TrackEvent` union blocks unknown events at compile time; free-text fields (prompts) structurally impossible"
    - "Sentry config gated on `NEXT_PUBLIC_SENTRY_DSN` presence — dev-without-DSN is a silent no-op instead of a build crash"
    - "next.config.ts exports `withSentryConfig(nextConfig, ...)` — Turbopack compatible; deprecated `disableLogger`/`automaticVercelMonitors` dropped"
    - "Server Actions (Phase 2+) should wrap in `Sentry.withServerActionInstrumentation` — plumbing ready"

key-files:
  created:
    - lib/consent/store.ts
    - lib/consent/store.test.ts
    - ui/ConsentBanner.tsx
    - ui/ConsentBanner.test.tsx
    - lib/analytics/posthog-provider.tsx
    - lib/analytics/track.ts
    - lib/analytics/track.test.ts
    - sentry.client.config.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
    - instrumentation.ts
    - app/global-error.tsx
  modified:
    - app/layout.tsx
    - next.config.ts
    - .env.example
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Used `posthog-js` directly rather than `@posthog/next` to keep control over init timing — the consent gate needs to run *before* any init, and bare posthog-js makes that explicit in one function (`maybeInit`). `@posthog/next`'s automatic provider would require opt-out work rather than opt-in."
  - "Type-safe `TrackEvent` union in lib/analytics/track.ts — enumerates every legal event + its props shape. This is the structural enforcement of the CLAUDE.md rule 'never log raw player prompts to analytics': no variant contains a free-text field."
  - "Sentry DSN-gated init in all three config files — without the DSN, `Sentry.init()` simply never runs, so dev builds without Sentry creds neither crash nor pollute the DSN-less Sentry project."
  - "Banner uses semantic `<section aria-label>` instead of `<div role='dialog'>` — Biome a11y rule flagged the latter, and a passive cookie notice is not modal so 'dialog' was the wrong role anyway."
  - "PostHog host defaults to `https://eu.i.posthog.com` (ingest subdomain) per POPIA EU-region requirement (Pitfall 12). User's `.env.local` already matches."
  - "Dropped `disableLogger: true` + `automaticVercelMonitors: false` from withSentryConfig — both are deprecated under Turbopack in @sentry/nextjs 10.49+. Phase 5 will re-add their webpack-shaped replacements if needed."

patterns-established:
  - "Consent store: pure client-side, localStorage-backed, cross-tab via `storage` event + in-process via CustomEvent"
  - "Consent gate: `getConsent()?.decision === 'accepted'` check required before any analytics side-effect"
  - "Track allowlist: add new event variants to the TrackEvent union before using them — TypeScript will reject unknown event names"

requirements-completed: []

# Metrics
duration: 10min
completed: 2026-04-21
---

# Phase 01 Plan 06: Consent Banner + Analytics + Sentry Summary

**POPIA consent gate live — PostHog blocked until explicit opt-in, Sentry wired across Node + Edge runtimes, `track()` is a structural no-op before consent.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-21T03:32:48Z
- **Completed:** 2026-04-21T03:42:34Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files created:** 12
- **Files modified:** 5

## Accomplishments

- **Pitfall 12 BLOCKER absorbed**: PostHog never calls `posthog.init()` until `consent.decision === 'accepted'`. Proven by 4-case mock-based gate test — `posthog.capture` is asserted zero calls under three "no consent" conditions and one positive call under the fourth.
- **D-20 dark-pattern mitigation**: Accept and Decline buttons share a single style constant. Test `ui/ConsentBanner.test.tsx` asserts `accept.getAttribute('style') === decline.getAttribute('style')` — byte-identical, not just visually similar.
- **D-21 Sentry wired**: `instrumentation.ts` registers Node + Edge configs; `app/global-error.tsx` captures uncaught render errors; `withSentryConfig` wraps next.config.ts with tunnel route `/monitoring-tunnel` to survive ad-blockers.
- **Type-safe event allowlist**: `lib/analytics/track.ts` exports a `TrackEvent` union. Unknown event names are compile errors; free-text fields are structurally absent (so raw prompts can never be leaked via a typo).
- **Green chain clean**: typecheck 0, build 0, Plan 06 tests 16/16, lint 0 errors in Plan 06 files.

## Task Commits

1. **Task 1 RED**: `72e422e` test(01-06): add failing tests for consent store + ConsentBanner
2. **Task 1 GREEN**: `9838c6b` feat(01-06): consent store + banner with equal-weight buttons (D-20)
3. **Task 2 combined**: `8045589` feat(01-06): gate PostHog on consent + wire Sentry for all runtimes

Task 2 combined its RED+GREEN into a single commit because the analytics code, Sentry configs, and layout wire-up were interdependent — splitting them would have left the layout temporarily referencing undefined components.

## Files Created

- `lib/consent/store.ts` — localStorage-backed POPIA consent state with cross-tab sync
- `lib/consent/store.test.ts` — 6 tests (get/set/subscribe, corrupt-value guard, exact key)
- `ui/ConsentBanner.tsx` — `'use client'` banner with identical-style buttons
- `ui/ConsentBanner.test.tsx` — 6 tests (render gate, copy, identical styles, click persistence)
- `lib/analytics/posthog-provider.tsx` — idempotent init + opt-in/opt-out sync on consent change
- `lib/analytics/track.ts` — type-safe allowlist; no-op when consent absent or SDK uninitialized
- `lib/analytics/track.test.ts` — 4 gate tests (Pitfall 12 proof)
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — DSN-gated inits
- `instrumentation.ts` — Next.js register() for Node + Edge; `onRequestError` re-export
- `app/global-error.tsx` — Sentry.captureException + retry button

## Files Modified

- `app/layout.tsx` — wrapped `<StoreProvider>` body with `<PostHogProvider>` + `<ConsentBanner />`
- `next.config.ts` — exported via `withSentryConfig(...)` with tunnel route
- `.env.example` — PostHog host corrected to `eu.i.posthog.com` (ingest subdomain)
- `package.json` + `pnpm-lock.yaml` — `posthog-js@1.369.3`, `@sentry/nextjs@10.49.0`

## POPIA Boundary (explicit, per prompt instruction)

**Consent-gate behavior:**
1. On first visit, `getConsent()` returns `null` — ConsentBanner renders with Accept + Decline.
2. `PostHogProvider` mounts but its `useEffect` runs `maybeInit()` which short-circuits because `record?.decision !== 'accepted'`. **Zero network requests to PostHog.**
3. When user clicks Accept:
   - `setConsent('accepted')` writes `{decision, decidedAt}` to `localStorage['cluu-consent-v1']`
   - Fires `cluu-consent-changed` CustomEvent → subscribers re-run `maybeInit()` → `posthog.init()` fires once → `syncOptState()` calls `posthog.opt_in_capturing()`
   - Banner's `useEffect` subscriber re-renders with the new record → banner unmounts
4. When user clicks Decline:
   - Decision persisted; banner hides.
   - `maybeInit()` still short-circuits; PostHog never initializes.
5. On reload: consent is read from localStorage before any paint → banner doesn't reappear → PostHog initializes (accepted) or stays silent (declined).

**What gets sent to PostHog only after Accept:**
- `capture_pageview: true` (page navigations)
- Whatever `track(event, props)` is explicitly called with — type-constrained by the `TrackEvent` union
- No autocapture (`autocapture: false`), no session recording (`disable_session_recording: true`)

**What gets sent to Sentry (always, when DSN present AND NODE_ENV=production):**
- Uncaught client exceptions (via app/global-error.tsx)
- Server request errors (via `instrumentation.ts`'s `onRequestError`)
- 10% trace sample rate; no session replay
- **Phase 2+ must add a `beforeSend` hook** to scrub request bodies when the grading route lands (threat T-06-02 in plan's threat model).

## Sentry Env Vars — Still Pending User Action

The following env vars are **referenced by code but not yet set in `.env.local`**:

| Var | What it does | Where to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | Enables Sentry SDK at runtime; without it the SDK is a no-op | Sentry → Project Settings → Client Keys (DSN) |
| `SENTRY_ORG` | Source-map upload (build time) | Sentry org slug |
| `SENTRY_PROJECT` | Source-map upload (build time) | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Source-map upload auth (build time) | Sentry → User Settings → Auth Tokens |

Builds **succeed without these** (`withSentryConfig` emits a warning about the missing auth token, does not fail). The user should paste these into `.env.local` before the first production deploy. `NODE_ENV=production` + DSN together unlock runtime error capture.

Plan's `user_setup` front-matter documented this requirement — flagged here so it isn't forgotten.

## Decisions Made

See frontmatter `key-decisions`. Headline:

- **posthog-js direct over @posthog/next** for explicit init-timing control.
- **TrackEvent union as structural privacy enforcement** — cannot accidentally log a `prompt` field because no variant declares one.
- **Sentry DSN-gated init** — dev without creds stays silent, no crash, no pollution.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Type-safe event allowlist beyond what plan's `track()` sketch specified**
- **Found during:** Task 2 action step 3 (writing lib/analytics/track.ts)
- **Issue:** Plan's pseudocode had `track(event: string, properties?: Record<string, unknown>)` which would accept `track('player_prompt', { text: '...' })` — the exact thing CLAUDE.md forbids. Plain types provide no structural protection.
- **Fix:** Replaced with a `TrackEvent` discriminated union enumerating every legal event and its props shape. No variant has a free-text payload. Callers get a TypeScript error if they try to track an unknown event or pass the wrong shape.
- **Files modified:** lib/analytics/track.ts, lib/analytics/track.test.ts (updated to use real event names)
- **Verification:** 4/4 gate tests pass; `pnpm typecheck` clean
- **Committed in:** `8045589`

**2. [Rule 1 - Bug] a11y lint: `role="dialog"` on a passive banner**
- **Found during:** Task 2 lint step
- **Issue:** Biome's `a11y/useSemanticElements` flagged the `<div role="dialog">` — not only is it a lint error, "dialog" is also the wrong role for a passive cookie notice (a true dialog is modal).
- **Fix:** Replaced `<div role="dialog" aria-label="...">` with `<section aria-label="...">`.
- **Files modified:** ui/ConsentBanner.tsx
- **Verification:** 6/6 banner tests still green (both buttons still have identical styles); `pnpm lint` clean for this file
- **Committed in:** `8045589`

**3. [Rule 3 - Blocking] Turbopack-deprecated Sentry options caused build warnings**
- **Found during:** Task 2 build step
- **Issue:** `disableLogger: true` and `automaticVercelMonitors: false` are deprecated under Turbopack in `@sentry/nextjs@10.49` (warnings, not errors, but noisy). The Turbopack-compatible replacements live under `webpack.*` keys and aren't supported yet.
- **Fix:** Dropped both options. Added a comment noting Phase 5 will re-evaluate once Turbopack support lands in Sentry.
- **Files modified:** next.config.ts
- **Verification:** Clean rebuild — no deprecation warnings
- **Committed in:** `8045589`

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 bug, 1 blocking)
**Impact on plan:** All three strengthen the privacy/correctness posture without widening scope. No scope creep.

## Issues Encountered

- **Parallel-plan typecheck ghost**: Midway through Task 2, `pnpm typecheck` failed on `ui/SettingsMenu.test.tsx` (Plan 07) referencing `./SettingsMenu.tsx` which hadn't been created yet. Logged to `.planning/phases/01-scaffold/deferred-items.md`. By the end of Task 2 Plan 07 had landed its commit and typecheck cleared.
- **Phaser teardown unhandled error in test suite exit**: `app/play/GameClient.test.tsx` throws an unhandled error during module disposal after all 65 tests pass. Origin is `game/entities/Cluu.ts:19` (Plan 05). Not a Plan 06 regression; logged to deferred-items.md. All Plan 06 tests (16/16) pass cleanly in isolation.
- **pnpm ERR_PNPM_ADDING_TO_ROOT**: First `pnpm add` invocation failed because it's a workspace root; added `-w` flag and retried successfully.

## User Setup Required

**PostHog** — already done by user. `.env.local` already contains:
- `NEXT_PUBLIC_POSTHOG_KEY=phc_uNvRuxdgCd5JCjPqRxZiMfCYyXhT85yNpFhVbAXmTad9`
- `NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com`

**Sentry** — pending user action. See "Sentry Env Vars — Still Pending User Action" above. Four vars to paste; zero code changes needed on Cluu's side.

## Next Phase Readiness

- **Plan 01-07 (SignOut + Persistence)** can read `lib/consent/store.ts` directly if it needs to surface a "change consent" control in the Settings menu (optional; out of scope for Phase 1).
- **Plan 01-08 (Cross-browser smoke)** should include the Pitfall 12 manual check: open localhost in incognito → DevTools Network tab filtered on `posthog` → observe zero requests → click Accept → observe init + pageview.
- **Phase 2 (Walking Skeleton — grading pipeline)** MUST add a `beforeSend` Sentry hook to scrub request bodies before events ship (threat T-06-02). This plan left that marker in the SUMMARY intentionally rather than inventing Phase 2 scope here.
- **Phase 5 (Launch hardening)** should revisit:
  - Turbopack-compatible replacements for `disableLogger` / `automaticVercelMonitors` if they land in `@sentry/nextjs` by then.
  - IP pseudonymization at the Vercel layer (Pitfall 12 item 3; Phase 5 per plan).
  - Privacy policy + audit-trail page that cites `consent.decidedAt` (threat T-06-05).

---
*Phase: 01-scaffold*
*Completed: 2026-04-21*

## Self-Check: PASSED

All 15 claimed files verified present. All 3 commit hashes (72e422e, 9838c6b, 8045589) verified in git history.
