# Changelog

> Last 20 changes. Full history in git.

- 2026-07-10: duel impact sfx (wire hits/scrapes), boss-death riser + thud, UI interaction sounds (terminal chatter/confirm/glitch), plane-transition whooshes
- 2026-07-10: mite variants (sizes + patrol/skitter/sleeper/stalker modes), boss defeat is now a collapse cinematic with iris wipe into the next biome, new Undersluice sewer level (biome route: yards > sluice > fair > woods > summit)
- 2026-07-09: sampled audio: unique looping music per level mapped to biome, boss/level piano stingers, stride-synced footsteps; synth music retired
- 2026-07-09: real planes: under-floor pit scenes at grates (Down), crawl-space through wall doorways (Up); post-boss travel cinematics; dramatic drifting boss camera; biome journey with 3 new painted plates
- 2026-07-09: cinematic movement weight (glide, heavy turns, drifting camera), global 3-lane depth strip (Up/Down), Space-only jump, boss camera tilt
- 2026-07-09: Gemini image pipeline unlocked (user-funded prepay): 6 painted plates + title key art generated in the LN grade, wired as mirror-tiled wall layer with level crossfade
- 2026-07-09: full LN art rebuild: Cluu redesigned (jug helmet, spindly limbs), puppet-crawler enemies, dolls/marionettes/set density, baked textures, cinematic cold-open (6-agent authoring workflow)
- 2026-07-09: 2.5D diorama renderer from measured LN3 reference data: perspective floor at the lane anchor, floor light pools, measured teal palette, low-res-upscale DOF, boss wall-shadow reveal (3-analyst + 5-judge workflows)
- 2026-07-08: Little Nightmares visual regrade pass 1: teal near-black grade, furniture silhouettes, hanging dolls, moonlight shafts, tilt-shift bands
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
