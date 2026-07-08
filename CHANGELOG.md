# Changelog

> Last 20 changes. Full history in git.

- 2026-07-08: NIM timeout raised to 150s; free endpoint queue drifted past the 60s cap, causing silent local-grader fallback (caught via tokensUsed magnitude)
- 2026-07-08: hard pivot — arcade game replaces the Phaser/Next game; old stack deleted (71 files), repo is now static game at `/` + NIM grading API
- 2026-07-08: NVIDIA NIM grading adapter (z-ai/glm-5.2) with local fallback; verified live on production
- 2026-07-08: standalone CLUU arcade game added and deployed public on Vercel

- Design tokens module `lib/design/tokens.ts`: 14 palette tokens, semantic spacing (`tile=32`, `cluu=48`), radii, `hexToInt()` Phaser helper (01.1-01)
- Encounter-object authoring spec `docs/encounter-object-authoring.md`: canvas sizes, palette-token discipline, Aseprite export checklist, Sunflower worked example (01.1-02)
- Phase 01.1 plans: 5 plans across 3 waves for visual style + Cluu feel
- `SettingsMenu` mounted on landing + `AuthAwareShell` wraps `GameClient` (01-07)
- `useMigrateOnSignIn` client trigger for anon-to-authed migration (AUTH-03)
- Cluu 4-layer Container with seek-follow behavior (CLUU-01, D-11/D-13/D-14)
- `PlayerAnchor` + `InputSystem` + camera lerp follow (WORLD-02/03/04)
- Consent store + banner with equal-weight buttons (D-20 POPIA)
- PostHog gated on consent + Sentry wired for all runtimes (01-06)
- Supabase `config.toml` reverted to match remote (MFA on, OTP 8-char, strict rate limit)
- Phaser stub extended; Cluu test types tightened (Rule 3)
- CLAUDE.md GSD command namespace fixed to colon form (`/gsd:quick` etc.)
- `01-08-SUMMARY` hash reference pointed at correct commit (54858ad)
- Phase 01 Plan 07 signout-persistence complete (closes AUTH-01/04/05)
- Phase 01 Plan 05 anchor + Cluu complete (closes WORLD-02/03/04, CLUU-01)
- Phase 01 Plan 06 consent-analytics complete
