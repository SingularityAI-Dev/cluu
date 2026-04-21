## 2026-04-21 — Plan 01-06 scope boundary  — RESOLVED by Plan 01-07

- **ui/SettingsMenu.test.tsx** references `./SettingsMenu` which does not yet exist. This file belongs to Plan 01-07 (running in parallel). Plan 06 does not touch it. TypeScript will resolve once Plan 07 lands `ui/SettingsMenu.tsx`.
- **Status (2026-04-21 closed by 01-07):** resolved — `ui/SettingsMenu.tsx` shipped in commit `e512ade`. Typecheck and test passes on main.

## 2026-04-21 — Plan 01-06 scope boundary (pt 2)  — RESOLVED by Plan 01-05

- **app/play/GameClient.test.tsx** — Phaser teardown throws an unhandled error during test suite shutdown ("StrictMode double-invoke does not leak" completes successfully, but a downstream error surfaces on module disposal). Origin: `game/entities/Cluu.ts:19` (Plan 01-05). All 65 tests pass and all 16 Plan 06 tests pass; this is a cross-plan teardown artifact, not a Plan 06 regression.
- **Status (2026-04-21 closed by 01-05):** resolved — Plan 05 extended the Phaser stub to cover `GameObjects.Container`, `GameObjects.Sprite`, `Physics.Arcade.Sprite`, `Physics.Arcade.Body`, and `Input.Keyboard.KeyCodes` in commit `4e72784`. Full `pnpm test` under Plan 07's green-chain exits 0 cleanly (65 passed / 4 skipped).

## 2026-04-21 — Plan 01-05 scope boundary  — RESOLVED by Plan 01-06

- **Plan 01-05 FIXED the Phaser-teardown error above** by extending the Phaser stub in `app/play/GameClient.test.tsx` to cover `GameObjects.Container`, `GameObjects.Sprite`, `Physics.Arcade.Sprite`, `Physics.Arcade.Body`, and `Input.Keyboard.KeyCodes`. The fix was in scope because Plan 05's new Cluu / PlayerAnchor imports are what exposed the stub gap (Rule 3 auto-fix). Full `pnpm test` now exits 0 with 65 passed / 4 skipped / 0 errors.
- **`ui/ConsentBanner.tsx(78,7): error TS17002`** — unclosed JSX `<section>` in Plan 01-06's ConsentBanner blocks `pnpm typecheck` and `pnpm lint`. NOT in Plan 01-05's `files_modified`. Plan 05's own files pass per-file lint (`pnpm biome lint <8 files>` → clean) and the game/ module graph typechecks cleanly (verified before Plan 06's files landed).
- **`pnpm build`** not re-run at end of Plan 05 because the pre-existing ConsentBanner syntax error would fail the build regardless of Plan 05's changes. Plan 05's own contribution is confirmed green via per-file lint + full `pnpm test` pass + targeted `pnpm typecheck` earlier in execution.
- **Status (2026-04-21 closed by 01-06):** resolved — `ui/ConsentBanner.tsx` at line 78 now correctly closes with `</section>` on main. `pnpm typecheck`, `pnpm lint`, and `pnpm build` all exit 0 under Plan 07's green-chain.
