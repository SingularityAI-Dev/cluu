---
phase: 01-scaffold
plan: 08
type: execute
wave: 3
depends_on: [02, 03, 04, 05, 06, 07]
files_modified:
  - .planning/phases/01-scaffold/MANUAL-SMOKE.md
autonomous: false
requirements:
  - OPS-04

must_haves:
  truths:
    - "The magic-link authentication flow completes successfully on iOS Safari (OPS-04)"
    - "The magic-link authentication flow completes successfully on Android Chrome (OPS-04)"
    - "The magic-link authentication flow completes successfully on desktop Chrome (OPS-04)"
    - "The magic-link authentication flow completes successfully on desktop Firefox (OPS-04)"
    - "The magic-link authentication flow completes successfully on desktop Safari (OPS-04)"
    - "Anonymous → authed migration preserves Zustand state on every browser tested (AUTH-03 validated end-to-end)"
    - "Cluu is visible and follows the anchor via touch on mobile browsers and keyboard on desktop browsers (CLUU-01, WORLD-02, WORLD-03)"
    - "Results are captured in MANUAL-SMOKE.md with pass/fail per browser + reproducible failure notes"
  artifacts:
    - path: ".planning/phases/01-scaffold/MANUAL-SMOKE.md"
      provides: "Human-executed smoke checklist; filled in during the gate, committed alongside phase completion"
      exports: []
  key_links:
    - from: "MANUAL-SMOKE.md"
      to: "OPS-04"
      via: "checklist → REQ-ID"
      pattern: "OPS-04"
---

<objective>
Final gate for Phase 1: a human runs the magic-link auth flow on five browser/device combinations and records pass/fail in `MANUAL-SMOKE.md`. This is the ONLY plan in Phase 1 with `autonomous: false` — the executor creates the checklist template but cannot check the boxes; a human must.

Purpose: close OPS-04 with real-world verification. All the infrastructure to make this pass was built in Plans 01–07; this plan proves it across the browser matrix the design doc commits to.

Output: `MANUAL-SMOKE.md` in the phase directory, with every browser row either filled in (✓/✗ + notes) by a human before Phase 1 can be considered done, OR explicitly deferred with a signed-off note (e.g., "iOS Safari deferred to Phase 5 launch hardening — no iOS device available this week").
</objective>

<execution_context>
@/Users/rainierpotgieter/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-scaffold/01-CONTEXT.md

**Phase dependencies:** This plan runs LAST in Wave 3, after every other Phase 1 plan ships. The deploy must be live on a preview URL (or `cluu.game`) before the smoke can run — the test is against real, deployed HTTPS magic-link emails.

**Why it's a full plan and not a task in another plan:** The human-gated nature means the executor's job is bounded: create the checklist template, verify the deploy is reachable, then stop. The human then fills in the checklist and pushes the result. Mixing autonomous work with a manual gate in the same plan produces confusion about who owns the commit.
</context>

<tasks>

<task id="1">
  <action>
    Create `.planning/phases/01-scaffold/MANUAL-SMOKE.md` with the exact content below. Do NOT fill in the check results — those are the human's job. The executor's job is to produce the template in a deterministic, reviewable form.

    Content to write verbatim:

    ```markdown
    # Phase 1 Manual Smoke — Cross-Browser Magic-Link Gate

    **Owner:** human (see OPS-04)
    **Runs against:** the currently deployed preview or production URL (check below)
    **Minimum to pass the phase:** 3 of 5 browsers pass; any failures documented with reproducible notes.

    ## Deploy under test

    - [ ] URL: `____________________` (fill in)
    - [ ] Commit SHA: `____________________` (fill in — run `git rev-parse HEAD`)
    - [ ] Date run: `____________________`

    ## Browser matrix

    Fill in each row with ✓ (pass), ✗ (fail), or — (deferred, with a note). Include device model + OS version.

    | Browser              | Device / OS                | Anon play | Magic-link email arrives | Sign-in completes | Anon→authed migration keeps state | Sign-out works | Refresh persists session | Notes |
    |----------------------|----------------------------|:---------:|:------------------------:|:-----------------:|:--------------------------------:|:--------------:|:------------------------:|-------|
    | iOS Safari           | iPhone SE 2020 / iOS 17+   |           |                          |                   |                                  |                |                          |       |
    | Android Chrome       | Any Android 12+            |           |                          |                   |                                  |                |                          |       |
    | Desktop Chrome       | macOS or Windows           |           |                          |                   |                                  |                |                          |       |
    | Desktop Firefox      | macOS or Windows           |           |                          |                   |                                  |                |                          |       |
    | Desktop Safari       | macOS only                 |           |                          |                   |                                  |                |                          |       |

    ## Flow under test (per browser row)

    1. Open the deploy URL in a fresh private/incognito window.
    2. Accept the cookie-consent banner (verify it appears; verify no PostHog request fired before acceptance — open DevTools Network tab).
    3. Confirm anonymous play works: anchor moves via touch or keyboard, Cluu follows. Note any jank or frame drops.
    4. Open the settings menu (top-right icon). Click "Sign in".
    5. Enter an email address you can check on the same device. Submit.
    6. Check email. Click magic link. Confirm redirect lands back in the game.
    7. Verify Cluu position and any locally-persisted state is preserved — not reset to origin.
    8. Refresh the browser. Confirm you remain signed in (no magic-link re-prompt).
    9. Open settings menu. Click "Sign out". Confirm redirect to landing page.
    10. Refresh. Confirm anonymous state is re-established (new `auth.users` row, game resumes fresh).

    ## Failure notes template

    For any ✗ cell, add a section below with:
    - **Browser:** ...
    - **Step where it failed:** (e.g., "Step 6 — magic link 404")
    - **Console/network error (copy the exact message):** ...
    - **Reproducible?** (yes / intermittent / one-off)
    - **Workaround tried:** (if any)

    ## Decision

    - [ ] **3/5 or more pass with no BLOCKER failures** → Phase 1 complete. Commit this file with "docs(01): manual smoke passed" and proceed.
    - [ ] **Fewer than 3 pass OR any BLOCKER failure on desktop Chrome/Firefox** → Phase 1 NOT complete. File bug(s), fix, re-deploy, re-run this gate.

    ## BLOCKER definition

    A BLOCKER is any failure that would prevent a first-time player from completing the onboarding flow on one of the top-3 browsers by worldwide mobile market share (iOS Safari, Android Chrome, desktop Chrome). Other browsers can fail and be patched in Phase 5 launch-hardening.
    ```
  </action>
  <read_first>
    - `.planning/phases/01-scaffold/01-CONTEXT.md` §Phase Boundary and §Deploy + ops decisions (D-19, D-20, D-22)
    - `.planning/REQUIREMENTS.md` entry for OPS-04 (exact wording)
  </read_first>
  <acceptance_criteria>
    - `.planning/phases/01-scaffold/MANUAL-SMOKE.md` exists
    - File contains the literal string `Phase 1 Manual Smoke`
    - File contains the literal string `iOS Safari`, `Android Chrome`, `Desktop Chrome`, `Desktop Firefox`, `Desktop Safari` (browser matrix rows)
    - File contains the literal string `OPS-04` in the front section
    - File contains exactly one table with exactly five data rows (browser matrix)
    - `grep -c '^|' .planning/phases/01-scaffold/MANUAL-SMOKE.md` returns 7 or more (table header + divider + 5 data rows)
  </acceptance_criteria>
</task>

<task id="2">
  <action>
    Verify the deploy is reachable before the human starts. Run:

    ```bash
    DEPLOY_URL=$(vercel ls --scope <team-or-user> 2>/dev/null | grep 'cluu' | head -1 | awk '{print $2}')
    if [ -z "$DEPLOY_URL" ]; then
      echo "ERROR: no Vercel deploy found. Run 'vercel deploy' or provide the URL manually in MANUAL-SMOKE.md."
      exit 1
    fi
    curl -sS -o /dev/null -w "%{http_code}" "https://$DEPLOY_URL/" > /tmp/cluu-deploy-status.txt
    STATUS=$(cat /tmp/cluu-deploy-status.txt)
    if [ "$STATUS" != "200" ] && [ "$STATUS" != "307" ] && [ "$STATUS" != "308" ]; then
      echo "ERROR: deploy at https://$DEPLOY_URL/ returned HTTP $STATUS — cannot run smoke test."
      exit 1
    fi
    echo "Deploy reachable at https://$DEPLOY_URL/ (HTTP $STATUS)"
    ```

    If the URL cannot be auto-detected, print a message telling the human to fill in the URL manually in `MANUAL-SMOKE.md` under "Deploy under test" and to skip the reachability check.

    This task is `autonomous: true` (the check) wrapped in an `autonomous: false` plan (the gate).
  </action>
  <read_first>
    - The `MANUAL-SMOKE.md` file created in task 1 (for the placeholder field being filled)
  </read_first>
  <acceptance_criteria>
    - Command exits 0 with "Deploy reachable" message, OR prints a clear "fill in manually" fallback
    - If the curl runs, HTTP status is one of: 200, 307, 308 (200 = landing served; 307/308 = redirect to `/play` or auth, both acceptable)
    - No secrets are printed to stdout (no API keys, no session tokens)
  </acceptance_criteria>
</task>

<task id="3">
  <action>
    After a human fills in `MANUAL-SMOKE.md` with at least 3 rows passing and all cells populated (✓, ✗, or —), commit the file:

    ```bash
    node "/Users/rainierpotgieter/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(01): manual smoke completed — N/5 pass" --files .planning/phases/01-scaffold/MANUAL-SMOKE.md
    ```

    Replace `N/5` with the actual pass count. If the pass count is <3 or there are BLOCKER failures on iOS Safari / Android Chrome / desktop Chrome, do NOT commit as "completed" — commit as "docs(01): manual smoke partial — blockers logged" and file a follow-up issue.
  </action>
  <read_first>
    - `.planning/phases/01-scaffold/MANUAL-SMOKE.md` (filled in by human)
  </read_first>
  <acceptance_criteria>
    - Git log contains a commit with message matching `docs(01): manual smoke (completed|partial)`
    - `grep -c '^|.*✓' .planning/phases/01-scaffold/MANUAL-SMOKE.md` returns 3 or more for a completed run, OR a partial-run commit message is used
    - No TODO/placeholder text remains in the "Deploy under test" section — URL, commit SHA, and date are all filled
  </acceptance_criteria>
</task>

</tasks>

<verification>
- [ ] `.planning/phases/01-scaffold/MANUAL-SMOKE.md` exists and contains the browser matrix
- [ ] Deploy URL is reachable (HTTP 200/307/308) or explicitly flagged as "fill in manually"
- [ ] At least 3 of 5 browser rows pass (✓) with no BLOCKER failures on iOS Safari / Android Chrome / desktop Chrome
- [ ] File is committed with a message starting `docs(01): manual smoke`
- [ ] OPS-04 can be traced from REQUIREMENTS.md → this plan's `requirements` field → a passing row in `MANUAL-SMOKE.md`
</verification>
