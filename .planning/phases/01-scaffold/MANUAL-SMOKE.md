# Phase 1 Manual Smoke — Cross-Browser Magic-Link Gate

**Owner:** human (see OPS-04)
**Runs against:** local `pnpm dev` OR deployed preview / production URL
**Gate closes:** OPS-04 only when all 5 browsers pass Steps 1-9. Step 10 (cross-device magic-link) is informational — not a hard gate for v1 (Safari ITP is a known-hard problem; track, do not block).

---

## Pre-flight

Before you start clicking, confirm the starting point is clean. Evidence below was captured at executor run time (commit `bfdbc24`, 2026-04-21).

### Green chain at scaffold close

| Check | Result | Notes |
|-------|--------|-------|
| Node version | `v24.15.0` | via nvm (`Herd/config/nvm`) |
| pnpm version | `9.15.0` | |
| `pnpm typecheck` | 0 errors | `tsc --noEmit` clean |
| `pnpm test` | 65 passed / 4 skipped (11 files passed, 1 file skipped) | Vitest 4.1.4 |
| `pnpm lint` | 0 errors, 6 warnings | Warnings are pre-existing `noNonNullAssertion` on env-var reads; non-blocking baseline carried from Plans 01-02/01-06 |
| `pnpm build` | Compiled successfully in 4.0s; 7 routes (`/`, `/_not-found`, `/api/migrate-anonymous`, `/auth/callback`, `/auth/signin`, `/play`, + Proxy middleware) | Turbopack stable default on Next 16.2.4 |
| Grep gate: `grep -rn 'getSession' lib/ app/ proxy.ts` | **0 matches** | D-17 maintained — `supabase.auth.getUser()` is the only server-side probe |

### Dev server boot sanity

| Check | Result |
|-------|--------|
| `pnpm dev` boot time | 347ms (Next.js 16.2.4 Turbopack, Ready) |
| `curl http://localhost:3001/` | **HTTP 200**, 13.5 KB body, HTML renders with Next app shell |

> Note: port 3001 was used because port 3000 was occupied by another process during executor run. When **you** start smoke testing, expect to be on `http://localhost:3000` unless you have another dev server running.

### What you need before clicking anything

- [ ] **Dev server up:** `pnpm install && pnpm dev` running on `http://localhost:3000` (or your preview URL)
- [ ] **Supabase remote dashboard configured** (flagged as user setup in 01-02 SUMMARY):
  - [ ] Anonymous sign-ins enabled (`Auth → Providers → Anonymous`)
  - [ ] Magic-link email enabled (`Auth → Providers → Email`)
  - [ ] `http://localhost:3000/auth/callback` added to **Allowed Redirect URLs**
  - [ ] (If testing deploy) preview / production URL `https://<deploy>/auth/callback` also added
- [ ] **Real email inbox** reachable from each test device (or at least from the same network) for magic-link delivery
- [ ] **DevTools open** on every browser — Network tab + Console tab — so you can capture evidence for failing cells
- [ ] **Incognito / private window** per run — avoids bleed-through from previous session cookies

### Deploy under test (fill in before you start)

- [ ] URL: `____________________`
- [ ] Commit SHA: `____________________` (`git rev-parse HEAD`)
- [ ] Date run: `____________________`
- [ ] Tester: `____________________`

---

## Browser matrix (fill in as you go)

Mark each cell with `✓` (pass), `✗` (fail, add note below), or `—` (deferred / skipped, add reason).

| Browser             | Device / OS                 | S1 Landing | S2 Canvas≤3s | S3 Anon session | S4 Touch move | S5 Keyboard move | S6 Magic-link email | S7 Same-browser callback + 1× migrate | S8 Refresh persists | S9 Sign-out clears | S10 Cross-device link | Overall |
|---------------------|-----------------------------|:----------:|:------------:|:---------------:|:-------------:|:----------------:|:-------------------:|:-------------------------------------:|:-------------------:|:------------------:|:---------------------:|:-------:|
| iOS Safari          | iPhone SE 2020 / iOS 17+    |            |              |                 |               |        N/A       |                     |                                       |                     |                    |                       |         |
| Android Chrome      | Any Android 12+             |            |              |                 |               |        N/A       |                     |                                       |                     |                    |          N/A          |         |
| Desktop Chrome      | macOS or Windows            |            |              |                 |      N/A      |                  |                     |                                       |                     |                    |          N/A          |         |
| Desktop Firefox     | macOS or Windows            |            |              |                 |      N/A      |                  |                     |                                       |                     |                    |          N/A          |         |
| Desktop Safari      | macOS only                  |            |              |                 |      N/A      |                  |                     |                                       |                     |                    |          N/A          |         |

**Legend:** S = Step. `N/A` means "not applicable to this platform" (e.g., touch on desktop, keyboard on mobile). `—` means "deferred" with a justification. Anything else, see Step 10 row for iOS Safari only.

---

## Steps (run in order per browser)

### Step 1 — Landing renders; SettingsMenu visible

**Action:** Navigate to `/` in a fresh private window.

**Pass criteria:**
- HTTP 200 HTML renders
- `<SettingsMenu>` icon is visible **top-right** of the viewport
- No red console errors (amber/yellow warnings OK; note anything unusual)
- Cookie-consent banner appears on first load; Network tab shows **zero** PostHog requests before you accept

**Capture:** screenshot of landing; console log if any red entries.

---

### Step 2 — `/play` link → canvas renders within 3s (WORLD-01 gate)

**Action:** Click the `/play` link from landing (or navigate to `/play` directly).

**Pass criteria:**
- The Phaser canvas appears in the viewport within **3 seconds** on broadband
- No "Error loading game" fallback
- Canvas is non-blank (you see the Meadow background tiles or Cluu)

**Capture:** stopwatch the time from URL commit → first visible canvas pixel. Note on low-end device if worse than 3s.

---

### Step 3 — First-load anonymous session established

**Action:** With Network tab open from Step 1, observe the initial request flow.

**Pass criteria:**
- Network tab shows an Anonymous Sign-In call: `POST` to Supabase `auth/v1/token?grant_type=signup` **OR** the `signInAnonymously` RPC. (Request body will contain `"is_anonymous": true` or be a signup with no email.)
- After it resolves, `localStorage` (Application tab → Local Storage → your origin) contains a key matching `sb-*-auth-token` with a JWT value
- The Supabase response has `user.is_anonymous: true`

**Capture:** the auth request URL + response status (200 expected). Paste the localStorage key name (no value — token is sensitive).

---

### Step 4 — Touch (mobile only): tap canvas → anchor + Cluu walk (WORLD-02, CLUU-01)

**Action:** On iOS Safari and Android Chrome only — tap any point on the canvas.

**Pass criteria:**
- The anchor moves to the tap location
- Cluu walks toward the new anchor position (not instant teleport; you see intermediate frames)
- Stopping distance ≈ 24px radius from anchor (STOP_RADIUS per 01-05 decisions)

**Capture:** short video if possible; note jank / frame drops.

**N/A on:** Desktop Chrome / Firefox / Safari (these browsers have no touch on this device matrix).

---

### Step 5 — Keyboard (desktop only): W/A/S/D or arrow keys (WORLD-03)

**Action:** On Desktop Chrome / Firefox / Safari only — press any of W, A, S, D, ArrowUp, ArrowDown, ArrowLeft, ArrowRight while the canvas has focus.

**Pass criteria:**
- The anchor moves continuously while the key is held
- Cluu follows the anchor with the same seek behavior as touch
- Diagonal combinations (e.g., W+D) produce diagonal anchor movement

**Capture:** note if keys don't register when focus is on address bar; this is expected — click canvas first.

**N/A on:** iOS Safari / Android Chrome.

---

### Step 6 — Request magic-link email

**Action:** Click the SettingsMenu icon (top-right) → click **"Sign in with email"** → enter a real email address you can read on this device → submit.

**Pass criteria:**
- Submit button shows loading state, then confirmation ("Check your email" or similar)
- **Magic-link email arrives within ~1 minute** from Supabase
- Email contains a link with host matching your deploy URL and path `/auth/callback?code=...`
- No red console errors on submit

**Capture:** screenshot of email header (sender, subject, timestamp). If email doesn't arrive within 2 min, try spam folder; if still nothing, FAIL this step and note which SMTP provider Supabase is configured with.

---

### Step 7 — Magic-link callback in SAME browser; migration POSTs exactly once (AUTH-03 gate)

**Action:** With Network tab still recording, click the magic-link inside the same browser you requested it from.

**Pass criteria:**
- URL lands on `/auth/callback?code=...` then redirects to `/play`
- Network tab shows the callback → `POST /api/migrate-anonymous` fires **EXACTLY ONCE** (not zero, not twice)
- After redirect, Cluu's position (from Step 4/5) is preserved — state did not reset
- `supabase.auth.getUser()` (run from DevTools console if you're comfortable: `await window.__supa?.auth.getUser()` or via the Network response) reports `is_anonymous: false` and has your email attached

**Capture:** filter Network tab by `migrate-anonymous` and confirm **count = 1**. This is the AUTH-03 idempotency gate — any other value is a blocker. Note the response body status: `{ migrated: true }` or `{ migrated: false, reason: 'already-processed' }` are both valid (the latter proves the idempotency guard engaged on a re-fired `USER_UPDATED` event).

---

### Step 8 — Hard refresh `/play` → session persists (AUTH-04 end-to-end)

**Action:** Hard refresh (Cmd+Shift+R on macOS, Ctrl+Shift+F5 on Windows, or mobile: pull-to-refresh).

**Pass criteria:**
- You remain signed in — no magic-link re-prompt
- Cluu's position is preserved (or reasonably close — pixel-perfect not required, but should be in the same scene region)
- Canvas renders
- `supabase.auth.getUser()` still reports non-anonymous user with email attached

**Capture:** response of `auth.getUser()` — confirm `is_anonymous: false` and `email: "<yours>"`.

---

### Step 9 — Sign-out clears session; fresh anonymous session on next refresh

**Action:** Click SettingsMenu → **"Sign out"**. Then refresh.

**Pass criteria:**
- Redirect lands on `/` (landing)
- `sb-*-auth-token` key is removed from localStorage (or replaced)
- Supabase auth cookies on the domain are cleared (Application tab → Cookies → look for `sb-*` entries)
- After refresh, a **new** anonymous session is created — `localStorage` has a fresh `sb-*-auth-token`, and the user UUID differs from the one you had in Step 3

**Capture:** before-and-after user UUIDs (safe to record — these are non-sensitive opaque ids). Confirm they differ.

---

### Step 10 — Cross-device magic-link (iOS Safari only; informational)

**Action:** On **iOS Safari**, request a magic-link as in Step 6. Then open the link on a **different** browser (e.g., Desktop Chrome on another machine).

**Pass criteria:**
- Best case: link opens, auth completes on the second browser, first browser remains anonymous
- Acceptable case: link opens but auth fails with a clear error ("open in original browser")
- Fail case: silent failure or session corruption

**Capture:** document whatever happens — this is a known-hard problem with Safari ITP and our PKCE flow. **Not a hard gate for v1.** If it fails, file a v1.1 follow-up, do not block the phase.

**N/A on:** all non-iOS Safari rows.

---

## Failure notes

For each `✗` cell in the matrix, add a section here:

### Failure 1 — `<Browser>` Step `<N>`

- **Browser / device / OS:**
- **Step where it failed:**
- **Console error (paste exact message):**
- **Network request status (if relevant):**
- **Reproducible?** (yes / intermittent / one-off)
- **Workaround tried:**
- **Suspected root cause (optional):**

*(Duplicate this block per failure.)*

---

## Blocking failures rollup

Fill in after the matrix is complete. A BLOCKER is any failure on **iOS Safari**, **Android Chrome**, or **Desktop Chrome** in Steps 1-9 — these three cover the top-3 mobile + desktop share for v1's target audience.

| Browser | Blocking failure? | Step(s) affected | Reference to failure note |
|---------|:-----------------:|------------------|--------------------------|
| iOS Safari       |   |   |   |
| Android Chrome   |   |   |   |
| Desktop Chrome   |   |   |   |
| Desktop Firefox  |   |   |   |
| Desktop Safari   |   |   |   |

---

## Ship gate

- [ ] **All 5 browsers pass Steps 1-9** → OPS-04 closes. Commit this file with `docs(01): manual smoke passed — 5/5 pass` and proceed to orchestrator follow-up (close OPS-04, flip Phase 01 to complete in ROADMAP.md, bump STATE.md to 8/8).
- [ ] **4 of 5 pass AND all blockers fixed in next patch** → OPS-04 closes with a noted caveat; file the remaining browser's issue as a v1.1 follow-up.
- [ ] **Fewer than 4 pass OR any BLOCKER remains on iOS Safari / Android Chrome / Desktop Chrome** → OPS-04 **does NOT close**. Fix, re-deploy, re-run the full matrix.

Step 10 (cross-device) is noted but **never** a hard gate in v1.

---

## After you finish

When the smoke is complete:

1. Fill in the matrix + failure notes + blocking rollup above.
2. Fill in the ship-gate checkboxes.
3. Ask Claude (or run `/gsd-execute-phase` again) to do the closeout:
   - Mark OPS-04 complete in `.planning/REQUIREMENTS.md` (via `gsd-tools requirements mark-complete OPS-04`)
   - Flip Phase 01 status to complete in `.planning/ROADMAP.md`
   - Bump `.planning/STATE.md` to 8/8 (100%)
   - Commit as `docs(01): phase 01 scaffold complete — OPS-04 closed, smoke 5/5`

---

## Reference

- **Requirement:** OPS-04 — "Magic-link authentication works on iOS Safari, Android Chrome, desktop Chrome/Firefox/Safari"
- **Plan:** `.planning/phases/01-scaffold/01-08-cross-browser-smoke-PLAN.md`
- **Phase close-out:** `.planning/phases/01-scaffold/01-08-SUMMARY.md`
- **Design doc §8 (stack lock):** see `.planning/PROJECT.md`
- **D-17 grep gate (auth probe):** `supabase.auth.getUser()` is the only server-side probe; `getSession()` is forbidden — grep-gated at 0 matches in `lib/ app/ proxy.ts`
