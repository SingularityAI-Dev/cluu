# Status

> Updated: 2026-07-08

## Where we are
Phase 01.1 (visual style + Cluu feel) active: Wave 1 shipped, Wave 2 halted awaiting human art production in Aseprite. Phase 01 scaffold functionally complete, awaiting the manual cross-browser smoke run (OPS-04). Alongside the repo, a standalone browser game "CLUU" (steampunk side-scroller that teaches Claude Code) is being iterated as a Claude artifact; it lives outside this codebase (see auto-memory: project_codewood_game).

## Recent
- Phase 01.1 Wave 1: `lib/design/tokens.ts` (14 palette tokens, spacing, radii, `hexToInt`) + `docs/encounter-object-authoring.md` (sprite authoring spec, Sunflower worked example)
- Phase 01 scaffold: all 8 plans complete (repo scaffold, Supabase auth, Zustand SSR, Phaser mount, anchor+Cluu, consent analytics, sign-out persistence, smoke checklist); Supabase config reverted to match remote
- 2026-07-08: standalone CLUU artifact game reached v3 (steampunk theme, 5 levels with warden boss duels, lesson shutters that gate every question, deep parallax); v4 (3-plane depth lanes, lane-hunter enemies, camera dolly) built, verification in progress

## Next
- Phase 01.1 Wave 2: human art production (Cluu Content pose + idle sheet, Meadow grass tile, Withered Sunflower before/after, `design/style-guide.png`)
- Phase 01 OPS-04: human cross-browser smoke run (`.planning/phases/01-scaffold/MANUAL-SMOKE.md`)
- Phase 01.1 Wave 3: wire art into Phaser (BootScene + Cluu idle anim + palette audit Vitest)
- Phase 02 walking skeleton: Withered Sunflower encounter end-to-end (Sonnet generation + Haiku grading + LOGIC.md compiler). Project lives or dies here.
- Later: Phase 03 Meadow biome + Library Markdown export (Core Value) + first alpha; Phase 04 remaining biomes; Phase 05 launch hardening; v1.1 backlog (paid cosmetics, branded SMTP, Playwright E2E)
