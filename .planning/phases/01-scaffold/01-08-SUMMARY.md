---
phase: 01-scaffold
plan: 08
subsystem: ops
tags: [smoke-test, cross-browser, magic-link, manual-gate, ops-04]

# Dependency graph
requires:
  - phase: 01-scaffold
    provides: landing + /play + SettingsMenu + anon-sign-in + migrate-anonymous + sign-out + session-refresh (from Plans 01-01 through 01-07 cumulatively)
provides:
  - MANUAL-SMOKE.md — human-executed cross-browser checklist covering landing render, anon session, touch/keyboard move, magic-link request, callback-with-single-migrate (AUTH-03 gate), session refresh (AUTH-04), sign-out, and fresh-anon-on-reload
  - Green-chain preflight evidence pinned at commit bfdbc24 (typecheck 0, test 65 pass / 4 skipped, lint 0 errors / 6 pre-existing warnings, build 4.0s 7 routes, grep-gate getSession=0, dev-server HTTP 200)
  - 10-step per-browser protocol with per-step pass criteria, evidence-capture instructions, and explicit N/A semantics for touch-vs-keyboard splits
  - Ship-gate ladder (5/5, 4/5 with follow-up, or <4/5 blocker) so OPS-04 closure is deterministic from the filled matrix
affects: [02-walking-skeleton, 05-launch-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual-gate plans ship a checklist template + preflight evidence; closure is a second pass after the human fills in pass/fail marks"
    - "Preflight evidence is a table of exact tool outputs (versions + counts), NOT full log dumps — enough to prove clean baseline, small enough to scan"
    - "Smoke steps are labeled to requirements (AUTH-03 gate on Step 7, AUTH-04 on Step 8, WORLD-01/02/03 on Steps 2/4/5, CLUU-01 on Step 4) so a failing cell traces directly to a REQ-ID"

key-files:
  created:
    - .planning/phases/01-scaffold/MANUAL-SMOKE.md
    - .planning/phases/01-scaffold/01-08-SUMMARY.md
  modified:
    - .planning/STATE.md (status updated to "awaiting manual smoke"; plan counter NOT advanced yet)

key-decisions:
  - "MANUAL-SMOKE.md content expanded beyond plan-spec verbatim text — the plan's <action> contained a minimal 5-column table + 10-step prose list; executor added the 10-column matrix + N/A semantics + per-step pass criteria + evidence-capture guidance because the plan-spec template would require the tester to improvise pass criteria per browser. Expanded version follows the intent (human-gated smoke template) and the user-facing prompt's explicit Steps 1-10 structure."
  - "Preflight evidence captured live from the executor's own green-chain run (typecheck/test/lint/build/grep-gate/dev-HTTP-200) and pasted into MANUAL-SMOKE.md pre-flight section. Pinned to commit bfdbc24 so if something drifts between executor close and human smoke start, the tester knows which state was known-clean."
  - "Dev server was observed on port 3001 (3000 occupied by another process during executor run); MANUAL-SMOKE.md notes this explicitly so tester isn't surprised if their local setup differs. Curl still returned HTTP 200 with 13.5KB HTML body — root route renders."
  - "OPS-04 is NOT closed by this executor run. The plan carries autonomous: false; checklist is the gate, human is the gater. Closure is a follow-up (/gsd-execute-phase re-invocation) after MANUAL-SMOKE.md is filled in."
  - "Plan 01-08 Task 2 (Vercel deploy reachability curl) was NOT run as-spec — the user's direction is to smoke against local pnpm dev first. Substituted a local dev-server HTTP-200 check via curl http://localhost:3001/ which returned 200 with a 13.5KB HTML body. If the user later wants deploy-level smoke, that's an additional pass; local-dev smoke is sufficient for OPS-04's wording (magic-link works on 5 browsers — dev vs deploy is a deployment question, not a browser-compatibility question)."

patterns-established:
  - "Green-chain pinning: before handing off to a human gate, run typecheck/test/lint/build once and paste the counts (not the logs) into the gate document. Human knows baseline is clean."
  - "Manual-gate two-phase close: (1) executor ships template + preflight; (2) human fills in; (3) orchestrator closes REQ-ID + flips ROADMAP + bumps STATE. Keeps the commit graph honest — no autonomous commit claims work the autonomous agent didn't verify."
  - "Grep-gate re-verification at phase close: D-17 (getSession banned) was introduced in 01-02, reinforced in 01-04, maintained in 01-07. Plan 01-08 confirmed it's STILL zero matches at bfdbc24 — the gate has held through 7 plans."

requirements-completed: []

# Metrics
duration: 7min
completed: 2026-04-21
---

# Phase 1 Plan 08: Cross-Browser Smoke Gate Summary

**MANUAL-SMOKE.md template with embedded green-chain preflight evidence; OPS-04 remains open until a human runs the 10-step protocol across 5 browsers and fills in the matrix.**

## Performance

- **Duration:** ~7 min (executor-side only; human smoke time not included)
- **Started:** 2026-04-21T03:54:00Z
- **Completed:** 2026-04-21T04:01:27Z
- **Tasks:** 1 of 3 fully auto-executable (Task 1 written, Task 2 substituted with local dev-server probe, Task 3 belongs to the human post-smoke)
- **Files created:** 2 (MANUAL-SMOKE.md, this SUMMARY)
- **Files modified:** 1 (STATE.md — status note + session-continuity update; plan counter NOT advanced)

## Accomplishments

- **MANUAL-SMOKE.md** written at `.planning/phases/01-scaffold/MANUAL-SMOKE.md` — 10-step per-browser protocol, browser matrix (5 browsers × 10 steps + overall column with N/A semantics for touch-vs-keyboard splits), failure-note template, blocking-failures rollup, and ship-gate ladder.
- **Green-chain preflight evidence** pasted into the pre-flight section so the human tester knows the baseline at hand-off:
  - `pnpm typecheck`: 0 errors
  - `pnpm test`: 65 passed / 4 skipped (11 files passed, 1 file skipped) — Vitest 4.1.4
  - `pnpm lint`: 0 errors, 6 pre-existing warnings (non-blocking `noNonNullAssertion` on env-var reads, baseline from Plans 01-02/01-06)
  - `pnpm build`: 4.0s, 7 routes (`/`, `/_not-found`, `/api/migrate-anonymous`, `/auth/callback`, `/auth/signin`, `/play`, + Proxy middleware)
  - `grep -rn 'getSession' lib/ app/ proxy.ts`: **0 matches** — D-17 grep gate still holds at bfdbc24
  - Dev server boot: `pnpm dev` on port 3001 (3000 occupied), Ready in 347ms, `curl /` returned **HTTP 200** with 13.5KB HTML body
- **Requirement-to-step mapping** embedded in the checklist:
  - Step 2 → WORLD-01 (canvas ≤ 3s)
  - Step 4 → WORLD-02 + CLUU-01 (touch move + Cluu follows)
  - Step 5 → WORLD-03 (keyboard move)
  - Step 7 → AUTH-03 (migrate-anonymous POSTs exactly once; idempotency gate)
  - Step 8 → AUTH-04 (refresh persists session)
  - Step 6 + Step 7 → OPS-04 (magic-link works per browser)
- **Ship-gate ladder** specifies 5/5 → OPS-04 closes; 4/5 + follow-up → closes with caveat; <4/5 or blocker on top-3 → does not close.
- **Step 10 (cross-device)** explicitly noted as informational, not a hard gate — Safari ITP + PKCE is a known-hard problem and is correctly deferred to v1.1 if it fails.

## Task Commits

This plan's final artifact is ONE atomic commit (per user direction):

1. **Task 1: MANUAL-SMOKE.md written** + STATE.md status updated + this SUMMARY — combined in the single phase-metadata commit below.

**Plan metadata commit:** `a29398a` (docs(01-08): MANUAL-SMOKE checklist + preflight evidence — awaiting user browser run)

_Note: per the user's explicit direction, this plan does not produce task-level commits — the manual-gate nature means the work is a single document hand-off._

## Files Created/Modified

- **Created:** `.planning/phases/01-scaffold/MANUAL-SMOKE.md` — human-executable cross-browser smoke checklist with 10-step protocol, 5-browser matrix, preflight green-chain evidence, failure-note template, blocking rollup, and ship-gate ladder
- **Created:** `.planning/phases/01-scaffold/01-08-SUMMARY.md` — this file
- **Modified:** `.planning/STATE.md` — `status: awaiting-manual-smoke`, `stopped_at` updated to reflect that 01-08 is scaffolded but OPS-04 closure is pending human execution; **progress stays at 7/8 (87.5%)** because plan 01-08 is not fully closed until the human fills in MANUAL-SMOKE.md

## Decisions Made

See `key-decisions` in frontmatter. Summary:

1. Expanded MANUAL-SMOKE.md content beyond the plan's verbatim block to match the user-facing prompt's explicit Steps 1-10 + 10-column matrix structure. Plan's template was minimal; user's prompt was specific. Prompt wins when more specific.
2. Substituted Task 2's Vercel reachability curl with a local `pnpm dev` + `curl localhost:3001/` check. Local-dev smoke is sufficient for OPS-04 wording.
3. Did NOT close OPS-04 in REQUIREMENTS.md — per user's direct instruction, human closes it post-smoke.
4. Did NOT advance plan counter to 8/8 — progress stays at 7/8 until MANUAL-SMOKE.md is filled in and OPS-04 is marked complete.

## Deviations from Plan

**1. [Rule 3 - Blocking-ish / Scope-Interpretation] Expanded MANUAL-SMOKE.md content beyond verbatim plan template**
- **Found during:** Task 1
- **Issue:** The plan's `<action>` contained a minimal template (5-column matrix, 10-step prose list without per-step pass criteria). The user-facing prompt was much more specific: 10 explicit steps with pass criteria per step, mapping each step to a specific REQ-ID, and listing a full pre-flight evidence block that the plan's template did not include.
- **Fix:** Wrote MANUAL-SMOKE.md against the user-prompt specification (strict superset of the plan's minimal template). All of the plan's acceptance criteria still pass (the literal strings are all present; the matrix has 5 data rows; `grep -c '^|'` returns 27, well above the required 7).
- **Files modified:** `.planning/phases/01-scaffold/MANUAL-SMOKE.md`
- **Verification:** Ran acceptance criteria grep checks; all 7 required literal strings found; 27 pipe-starting lines (header + divider + 5 data rows + many lower tables) — exceeds the 7 minimum by 20.
- **Committed in:** part of the plan-metadata commit.

**2. [Rule 1 - Bug / Environment] Substituted Vercel-deploy reachability check with local dev-server probe**
- **Found during:** Task 2
- **Issue:** Plan Task 2 attempts `vercel ls --scope <team-or-user>` + `curl https://$DEPLOY_URL/`. The user's direction is explicit: smoke runs against local `pnpm dev`, not a Vercel deploy. Running `vercel ls` and attempting to ping a deploy URL would either error out or probe an unrelated URL.
- **Fix:** Booted `pnpm dev` in background, curled `http://localhost:3001/` (port 3000 was occupied by another process during executor run), captured HTTP 200 + 13.5KB body, killed dev server cleanly. Pasted the result into MANUAL-SMOKE.md pre-flight.
- **Files modified:** none (only ephemeral dev server process)
- **Verification:** HTTP 200 confirmed; Next.js 16.2.4 Turbopack "Ready in 347ms" in dev log; HTML body contains the expected Next app shell markup.
- **Committed in:** N/A (evidence captured in MANUAL-SMOKE.md pre-flight, no source changes).

**3. [Rule 2 - Scope / Instruction-Following] Did NOT close OPS-04 in REQUIREMENTS.md**
- **Found during:** Task 3 / closeout
- **Issue:** Plan Task 3 describes committing the filled-in MANUAL-SMOKE.md; the natural post-step would be to close OPS-04 via `gsd-tools requirements mark-complete OPS-04`. But OPS-04 requires the human-verified cross-browser pass — the executor cannot verify this.
- **Fix:** Did NOT run `requirements mark-complete OPS-04`. Left it open with the note that MANUAL-SMOKE.md is the gate. The `requirements-completed: []` frontmatter field in this SUMMARY reflects this.
- **Files modified:** none (REQUIREMENTS.md untouched)
- **Verification:** `.planning/REQUIREMENTS.md` still shows `- [ ] **OPS-04**: ...` — unchanged.
- **Committed in:** N/A (no change made).

---

**Total deviations:** 3 (1 scope-interpretation, 1 environment substitution, 1 gate-preserving no-op)
**Impact on plan:** All deviations preserve plan intent while aligning to the user's direct instructions. No scope creep. Phase 1 closure remains properly gated.

## Issues Encountered

- **Port 3000 occupied** by an unrelated process during the local dev-server probe — Next fell back to 3001 automatically. Noted in MANUAL-SMOKE.md so the human tester isn't surprised if their setup differs. HTTP 200 still achieved.
- **No other issues.** Green chain was already clean at commit bfdbc24; no fixes needed.

## User Setup Required

**External services already configured in Plan 01-02, but re-confirm before smoke:**

- Supabase remote dashboard:
  - Anonymous sign-ins ENABLED
  - Magic-link email ENABLED
  - Allowed Redirect URLs include `http://localhost:3000/auth/callback` (and your deploy URL if testing deploy)
- A real email inbox reachable from each of the 5 test devices

Full checklist is in MANUAL-SMOKE.md § "What you need before clicking anything".

## Next Phase Readiness

**Phase 1 is not yet complete.** The path to close is:

1. **User runs manual smoke** across 5 browsers per MANUAL-SMOKE.md Steps 1-9 (Step 10 informational).
2. **User fills in the matrix** (`✓` / `✗` / `—`), failure notes per blocker, and blocking-failures rollup.
3. **User (or next `/gsd-execute-phase`) closes the phase** by:
   - Running `node gsd-tools.cjs requirements mark-complete OPS-04`
   - Flipping Phase 01 status in `.planning/ROADMAP.md` to complete
   - Bumping `.planning/STATE.md` from 7/8 (87.5%) → 8/8 (100%)
   - Committing as `docs(01): phase 01 scaffold complete — OPS-04 closed, smoke N/5 pass`

**What Phase 2 needs from Phase 1** (all ready, independent of the smoke outcome):

- Next 16.2.4 + React 19.2 + Phaser 3.90 + Vitest 4 pinned stack ✓
- Supabase auth + migration route + schema + RLS ✓
- Proxy.ts + store factory + Phaser mount + anchor/Cluu ✓
- Consent + analytics + Sentry ✓
- Sign-out + session persistence + AuthAwareShell ✓
- Grep gate `getSession = 0` maintained ✓

Phase 2 (walking-skeleton — first encounter end-to-end) can begin as soon as OPS-04 closes.

## Self-Check: PASSED

- `.planning/phases/01-scaffold/MANUAL-SMOKE.md` — FOUND on disk
- `.planning/phases/01-scaffold/01-08-SUMMARY.md` — FOUND on disk
- Commit `a29398a` — FOUND in git log (`docs(01-08): MANUAL-SMOKE checklist + preflight evidence — awaiting user browser run`)
- `.planning/STATE.md` frontmatter: `status: awaiting-manual-smoke`, `completed_plans: 7`, `percent: 87.5` (gate-preserving, not falsely advanced)
- REQUIREMENTS.md OPS-04: still `- [ ]` (correctly open)

---
*Phase: 01-scaffold*
*Plan: 08*
*Completed: 2026-04-21 (executor side only — human smoke still pending)*
