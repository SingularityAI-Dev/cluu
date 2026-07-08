# Phase 02 Walking Skeleton Implementation Plan

> **For Hermes:** Use `subagent-driven-development` to implement this plan task-by-task. Keep tasks small, run tests after each task, and do not move on until the current task passes typecheck/tests.

**Goal:** Build the first end-to-end Withered Sunflower encounter loop: Cluu can approach the sunflower, open a prompt input, submit a prompt, grade it against a `.logic.md` contract, swap the sunflower sprite on success/flair, and offer to save the prompt to the Library.

**Architecture:** Keep the walking skeleton thin and real. Phaser owns the world interaction and sprite swap. React owns the prompt modal and save prompt UI. A Node.js route handler owns validation, contract loading, grading, and persistence. The first implementation should use a deterministic local grader when Anthropic keys are absent, with the API response shape ready for Sonnet generation + Haiku grading once keys/config are available.

**Tech Stack:** Next.js 16.2.4 App Router, Phaser 3.90.0, Zustand, Supabase Postgres, Zod, Vitest, Biome, TypeScript.

---

## Task 1: Add the Withered Sunflower `.logic.md` contract and parser tests

**Objective:** Create the first authorable encounter contract and prove it can be parsed into a typed runtime object.

**Files:**
- Create: `encounters/meadow_withered_sunflower.logic.md`
- Create: `lib/encounters/types.ts`
- Create: `lib/encounters/loadContract.ts`
- Create: `lib/encounters/loadContract.test.ts`

**Contract content:**

```markdown
---
id: meadow_withered_sunflower
biome: meadow
mechanic: describe
difficulty: 1
reward:
  cosmetic: petal_pin
  xp: 10
  library_eligible: true
grading:
  model: claude-haiku-4-5
  temperature: 0.2
---

# Encounter: Withered Sunflower

## Context
The player has walked Cluu to a withered plant at the meadow's edge.
They must describe what the plant should become.

## Player prompt input
{{user_prompt}}

## Claude's task
Generate a short 30 to 60 word description of the plant now, based on the player's prompt.
The description will be shown in-game as flavour text.

## Grading contract
Pass requires all three:
- SPECIFICITY: User prompt contains at least 2 concrete visual nouns.
- DETAIL: User prompt contains at least 2 descriptive adjectives.
- CONSISTENCY: Claude's generated description does not contradict the user prompt.

Flair also requires:
- EVOCATIVE: User prompt uses sensory or atmospheric language beyond bare visual detail.

## Reward messaging
- Pass: The sunflower unfurls. A bee arrives.
- Flair: The sunflower unfurls, petals trembling. Three bees arrive.
- Fail: The plant stirs, but doesn't quite wake. Try describing it more.
```

**Parser requirements:**
- Parse YAML frontmatter and markdown body without adding a YAML dependency in Task 1.
- Expose `loadEncounterContract(slug: string): Promise<EncounterContract>` from `lib/encounters/loadContract.ts`.
- Resolve contracts from `encounters/${slug}.logic.md`.
- Validate required fields with Zod.
- Export types for `EncounterContract`, `EncounterReward`, and `EncounterGrading`.

**Step 1: Write failing test**
Add tests in `lib/encounters/loadContract.test.ts` that call `loadEncounterContract('meadow_withered_sunflower')` and assert:
- `id === 'meadow_withered_sunflower'`
- `biome === 'meadow'`
- `mechanic === 'describe'`
- `reward.cosmetic === 'petal_pin'`
- `reward.library_eligible === true`
- `body.includes('Claude's task')`

Expected: FAIL — file/parser does not exist yet.

**Step 2: Implement parser**
Implement minimal frontmatter splitter:
- Split on the first `\n---\n` after the opening `---`.
- Parse the small YAML subset used by encounter contracts (`key: value`, nested `reward`, `grading`, booleans, numbers, strings).
- Keep the markdown body untouched.

**Step 3: Run test**
Run:

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/vitest run lib/encounters/loadContract.test.ts --exclude '.claude/worktrees/**' --pool=forks
```

Expected: PASS.

**Step 4: Run typecheck**
Run:

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/tsc --noEmit
```

Expected: PASS.

---

## Task 2: Add deterministic local grader for the Withered Sunflower contract

**Objective:** Provide a no-key grading path so the walking skeleton is testable locally while preserving the future Anthropic adapter boundary.

**Files:**
- Create: `lib/encounters/grade.ts`
- Create: `lib/encounters/grade.test.ts`

**Required API:**

```ts
export type GradeResult = {
  verdict: 'fail' | 'pass' | 'flair';
  pass: boolean;
  flair: boolean;
  generatedResponse: string;
  assertions: Record<string, boolean>;
  tokensUsed: number;
  cached: boolean;
};

export async function gradeEncounterAttempt(input: {
  contract: EncounterContract;
  userPrompt: string;
  generatedResponse?: string;
}): Promise<GradeResult>;
```

**Grading rules for the first encounter:**
- Normalize prompt to lowercase.
- `SPECIFICITY`: at least 2 terms from `sunflower | stem | petals | petal | leaves | leaf | bloom | bud | soil | bee | gold | yellow | green | cracked | droop | tall`.
- `DETAIL`: at least 2 terms from `tall | cracked | golden | yellow | green | fragile | wilted | drooping | bright | fresh | morning | warm | soft | trembling | sea | wind | dawn | glowing`.
- `EVOCATIVE`: at least 1 term from `morning | warm | soft | trembling | sea | wind | dawn | glowing | golden | fragile | fresh`.
- `CONSISTENCY`: always true when `generatedResponse` is absent or does not contain `contradict` / `not`.
- Verdict: `fail` unless SPECIFICITY + DETAIL + CONSISTENCY; `flair` when those pass and EVOCATIVE passes; otherwise `pass`.
- `generatedResponse`: if absent, return a short deterministic response based on verdict.
- `tokensUsed`: return a stable estimate, e.g. `Math.max(1, Math.ceil((userPrompt.length + generatedResponse.length) / 4))`.
- `cached`: false.

**Step 1: Write failing tests**
Tests should cover:
- Sparse prompt `"fix it"` => `fail`.
- Specific prompt `"a tall golden sunflower with cracked stem and fresh green leaves"` => `pass`.
- Flair prompt `"a tall golden sunflower with cracked stem, trembling petals, and warm morning light"` => `flair`.
- `generatedResponse: 'The plant stays dead.'` => `fail` for consistency.

Expected: FAIL before implementation.

**Step 2: Implement grader**
Keep it dependency-free and pure except for the async boundary.

**Step 3: Run tests**

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/vitest run lib/encounters/grade.test.ts --exclude '.claude/worktrees/**' --pool=forks
```

Expected: PASS.

---

## Task 3: Add the encounter attempt API route

**Objective:** Add a Node runtime route that validates prompt input, loads the contract, grades the attempt, and returns a typed response.

**Files:**
- Create: `app/api/encounter/attempt/route.ts`
- Create: `app/api/encounter/attempt/route.test.ts`

**Request shape:**

```ts
{
  encounterId: string;
  userPrompt: string;
  generatedResponse?: string;
}
```

**Response shape:**

```ts
{
  encounter: Pick<EncounterContract, 'id' | 'biome' | 'mechanic' | 'reward'>;
  grade: GradeResult;
}
```

**Validation:**
- `encounterId`: string, non-empty.
- `userPrompt`: string, trimmed, 1 to 500 chars.
- Reject unknown encounter with 404.
- Reject invalid body with 400.

**Runtime:** `export const runtime = 'nodejs';`

**Step 1: Write failing tests**
Test:
- POST `meadow_withered_sunflower` + flair prompt returns 200 and `grade.verdict === 'flair'`.
- POST sparse prompt returns 200 and `grade.verdict === 'fail'`.
- POST unknown encounter returns 404.
- POST prompt longer than 500 chars returns 400.

Expected: FAIL.

**Step 2: Implement route**
Use `loadEncounterContract`, `gradeEncounterAttempt`, and `NextResponse`.

**Step 3: Run tests**

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/vitest run app/api/encounter/attempt/route.test.ts --exclude '.claude/worktrees/**' --pool=forks
```

Expected: PASS.

**Step 4: Run route-focused typecheck**

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/tsc --noEmit
```

Expected: PASS.

---

## Task 4: Add React encounter prompt modal state and component

**Objective:** Add the React overlay UI for opening the sunflower prompt, submitting a prompt, and showing pass/flair/fail feedback.

**Files:**
- Modify: `state/gameStore.ts`
- Modify: `state/types.ts`
- Create: `ui/EncounterPromptModal.tsx`
- Create: `ui/EncounterPromptModal.test.tsx`

**Store additions:**
- `currentEncounterId: string | null`
- `encounterResult: { verdict: 'fail' | 'pass' | 'flair'; message: string } | null`
- `openEncounter(encounterId: string): void`
- `closeEncounter(): void`
- `setEncounterResult(result: { verdict: 'fail' | 'pass' | 'flair'; message: string }): void`

**Component behavior:**
- Render nothing when `currentEncounterId` is null.
- Show a modal with:
  - title "Withered Sunflower"
  - prompt textarea max 500 chars
  - char counter
  - Submit button
  - feedback area after result
- On submit, POST to `/api/encounter/attempt` with `{ encounterId: currentEncounterId, userPrompt }`.
- On success, call `setEncounterResult` using reward messaging from the response.
- Disable submit while loading.
- Handle network error with a visible message.

**Step 1: Write failing component tests**
Use Testing Library:
- No modal when store is closed.
- Modal opens when `openEncounter('meadow_withered_sunflower')`.
- Submit disabled while loading.
- Shows feedback after store result is set.

Expected: FAIL.

**Step 2: Implement component**
Keep it client-only and simple. Avoid global singleton Zustand usage.

**Step 3: Run tests**

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/vitest run ui/EncounterPromptModal.test.tsx --exclude '.claude/worktrees/**' --pool=forks
```

Expected: PASS.

---

## Task 5: Add Phaser sunflower object and interaction

**Objective:** Place the Withered Sunflower in MeadowScene, let Cluu approach it, and open the React prompt modal when the player is close and presses Space/Enter or taps/clicks.

**Files:**
- Modify: `game/bridge/EventBus.ts`
- Modify: `game/scenes/MeadowScene.ts`
- Modify: `game/scenes/MeadowScene.test.ts` or create focused tests if needed
- Modify: `app/play/GameClient.tsx`
- Modify: `game/config.ts` if interaction constants belong there

**Phaser behavior:**
- Preload `encounter_meadow_sunflower_withered` and `encounter_meadow_sunflower_revived` in `BootScene`.
- Add sunflower sprite near the center, e.g. `(worldW / 2 - 96, worldH / 2)`.
- Add a small invisible trigger zone around it.
- On update, if Cluu is within 48 px of the sunflower and the player presses Space/Enter or pointer taps/clicks near it, emit `encounter:open` with `{ encounterId: 'meadow_withered_sunflower' }`.
- Listen for `encounter:resolved` from React and swap the sunflower texture to `encounter_meadow_sunflower_revived`.

**EventBus additions:**
- `encounter:open`: `{ encounterId: string }`
- `encounter:resolved`: `{ encounterId: string; spriteKey: string }`

**React bridge:**
- In `GameClient`, subscribe to `encounter:open` and call store `openEncounter`.
- After successful modal submit, emit `encounter:resolved` with the revived sprite key.

**Step 1: Write failing Phaser tests**
Test:
- MeadowScene preloads both sunflower textures.
- Opening event fires when Cluu is close and Space is pressed.
- `encounter:resolved` swaps the texture.

Expected: FAIL.

**Step 2: Implement Phaser scene changes**
Keep the first implementation minimal and deterministic.

**Step 3: Run tests**

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/vitest run game/scenes/MeadowScene.test.ts --exclude '.claude/worktrees/**' --pool=forks
```

Expected: PASS.

---

## Task 6: Persist successful attempts and Library eligibility

**Objective:** Insert successful encounter attempts into Supabase and surface Library eligibility in the API response.

**Files:**
- Modify: `app/api/encounter/attempt/route.ts`
- Modify: `app/api/encounter/attempt/route.test.ts`
- Modify: `lib/supabase/types.ts` if needed

**Behavior:**
- If user is authenticated, insert into `encounter_attempts` on every attempt.
- If grade is `pass` or `flair` and `reward.library_eligible` is true, include `libraryOffer: true` in the response.
- Do not block local no-key testing: tests can mock Supabase or assert shape without a live DB.

**Step 1: Write failing tests**
Mock `createServerClient` and assert insert is called with:
- `encounter_id`
- `verdict`
- `prompt_hash`
- `tokens_used`
- `cached`

**Step 2: Implement persistence**
Use SHA-256 from `node:crypto` for prompt hash.

**Step 3: Run tests and typecheck**

Expected: PASS.

---

## Task 7: End-to-end smoke checklist

**Objective:** Verify the walking skeleton manually in the browser.

**Files:**
- Create or update: `docs/phase-02-walking-skeleton-smoke.md`

**Checklist:**
1. Start dev server.
2. Open `/play`.
3. Accept consent.
4. Walk/tap toward the sunflower.
5. Open prompt modal.
6. Submit sparse prompt and confirm fail feedback.
7. Submit specific prompt and confirm pass feedback.
8. Submit flair prompt and confirm flair feedback + sunflower texture swap.
9. Confirm no console errors.
10. Confirm `/api/encounter/attempt` returns expected JSON for the three prompt classes.

**Step 1: Run automated verification**
Run:

```bash
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/biome lint .
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/tsc --noEmit
PATH="$HOME/.local/bin:$PATH" sh ./node_modules/.bin/next build
PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH" sh ./node_modules/.bin/vitest run --exclude '.claude/worktrees/**' --testTimeout=15000 --pool=forks
```

Expected: lint warnings only for existing intentional Supabase env non-null assertions; typecheck/build/tests pass.

**Step 2: Manual smoke**
Run dev server and follow checklist.

Expected: `/play` remains usable and the sunflower resolves on flair.

---

## Risks / Tradeoffs / Open Questions

- Anthropic keys are not present in the repo, so the first walking skeleton should not require live model calls to run locally.
- Supabase may be unavailable locally; route tests should mock persistence and manual smoke should tolerate read-only play if DB insert fails.
- Phaser tests in jsdom need careful mocking; keep scene tests focused on event emission and texture swap, not full engine rendering.
- Do not add paid cosmetics, mood decay, or multi-encounter content in Phase 2. The walking skeleton is one encounter, one biome object, one API route, one modal.
