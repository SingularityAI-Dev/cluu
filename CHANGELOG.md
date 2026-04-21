# Changelog

> Rolling log of last 20 notable changes. Full history in git.

## [Unreleased]

### Added
- Design tokens module `lib/design/tokens.ts` — 14 palette tokens, semantic spacing (`tile=32`, `cluu=48`), radii, `hexToInt()` Phaser helper (01.1-01)
- Encounter-object authoring spec `docs/encounter-object-authoring.md` — canvas sizes, palette-token discipline, Aseprite export checklist, Sunflower worked example (01.1-02)
- Phase 01.1 plans — 5 plans across 3 waves for visual style + Cluu feel
- `SettingsMenu` mounted on landing + `AuthAwareShell` wraps `GameClient` (01-07)
- `useMigrateOnSignIn` client trigger for anon → authed migration (AUTH-03)
- Cluu 4-layer Container with seek-follow behavior (CLUU-01, D-11/D-13/D-14)
- `PlayerAnchor` + `InputSystem` + camera lerp follow (WORLD-02/03/04)
- Consent store + banner with equal-weight buttons (D-20 POPIA)
- PostHog gated on consent + Sentry wired for all runtimes (01-06)

### Changed
- Supabase `config.toml` reverted to match remote (MFA on, OTP 8-char, strict rate limit)
- Phaser stub extended; Cluu test types tightened (Rule 3)

### Fixed
- CLAUDE.md GSD command namespace — `/gsd-quick` / `/gsd-debug` / `/gsd-execute-phase` → `/gsd:quick` / `/gsd:debug` / `/gsd:execute-phase` (lines 235-237; runtime uses colon form)
- `01-08-SUMMARY` hash reference pointed at correct commit (54858ad)

## Phase 01 scaffold milestones

- Phase 01 Plan 07 signout-persistence complete — closes AUTH-01/04/05
- Phase 01 Plan 05 anchor + Cluu plan complete — closes WORLD-02/03/04, CLUU-01
- Phase 01 Plan 06 consent-analytics complete
- Phase 01 Plan 08 MANUAL-SMOKE checklist + preflight evidence shipped — awaiting human browser run
