# Encounter Object Authoring Spec

Authoring contract for every encounter-object sprite in Phases 2–4.

| Key | Value |
| --- | --- |
| Phase introduced | 01.1 (Visual style + Cluu feel) |
| Applies to | Every encounter-object sprite ("Describe", "Request", "Contract", "Tool", capstone) across all biomes (Meadow, Village, Workshop, Tide Pools, Library) |
| Owner | Solo dev |
| Review cadence | Update alongside any new encounter mechanic (new state pair, new canvas constraint, new export setting) |
| Sibling artifacts | `lib/design/tokens.ts` (Plan 01.1-01), `design/style-guide.png` (Plan 01.1-03) |

This doc is the one source of truth a new encounter-sprite authoring task reads before touching Aseprite. If this spec is ambiguous, fix this spec — do not invent per-encounter conventions inline.

---

## Section 1: Canvas conventions

Canvas sizes are constrained by the tile grid (32 px) and Cluu's silhouette (48 px). Encounter objects sit inside the world at tile-grid centres.

| Canvas | When to use | Rationale |
| --- | --- | --- |
| **48×48** (default) | Every encounter-object sprite unless it legitimately needs more room — Sunflower, NPC stand-ins, small props | Matches `spacing.cluu = 48` in `lib/design/tokens.ts` and half-offsets cleanly across the 32-pixel tile grid |
| **64×64** (optional larger) | Workbenches, large props that physically occupy more than one tile | Still aligns to the 32 px tile grid — the object's centre must land on a tile centre (local coords `(16, 16)` relative to the 64×64 frame) |
| **48 × (48 × frame_count)** (multi-frame sheet) | Encounters whose before/after states are packed as vertically stacked frames on a single sheet | Frame index 0 = withered / default / broken state; frame index 1 = revived / resolved / repaired state. Additional frames reserved for per-encounter motion (e.g., petal unfurl) if ever added |

**Rationale anchor:** `spacing.encounter = 48` is exported from `lib/design/tokens.ts` (CONTEXT decision D-12). Changing the default canvas requires updating three places in lockstep: the `spacing.encounter` token, this spec, and every existing sprite authored against it. Treat 48×48 as load-bearing.

**Per D-21 + RESEARCH §Pitfall 4:** author at 1:1 display resolution. DO NOT author at 96×96 and downscale. See Section 6.

---

## Section 2: Palette discipline

RULE: every colour in an encounter sprite corresponds to a named token in `lib/design/tokens.ts`. No off-palette pigments. No raw pigment values anywhere in the sprite.

**Enforcement split:**

| Surface | Enforcement | Owner |
| --- | --- | --- |
| TS / TSX / CSS code referencing colours | Automated — the Vitest palette audit at `tests/design/palette-audit.test.ts` (Plan 05) fails the build if raw hex or `0x`-integer literals leak outside `lib/design/tokens.ts` | CI |
| Encounter sprite pixels | **Manual visual QA** against the style-guide PNG (per RESEARCH §Pitfall 7 — automated pixel-palette audit is out of scope for Phase 01.1; revisit in Phase 5) | Author |

**Cluu vs encounter palette split:**

- Cluu stays in the `cluu_body` token family across every biome. The Cluu is the focal point; biomes change around her, she does not colour-shift.
- Encounter objects live in the **biome's palette**. For v1 Meadow (Sunflower), that means the Meadow triad locked in CONTEXT D-09: `palette.meadow_grass_mid`, `palette.meadow_grass_highlight`, `palette.meadow_grass_shadow`.

**Example token mapping (Sunflower):**

| Sprite region | Token | Notes |
| --- | --- | --- |
| Petals (revived) | `palette.meadow_sunflower_petal` | NEW token — add to `lib/design/tokens.ts` when the authored sprite introduces this hue. Coordinate the addition with Plan 01.1-01 if it hasn't landed yet |
| Stem (healthy) | `palette.meadow_grass_shadow` | Existing Meadow triad token |
| Stem (withered) | `palette.meadow_grass_shadow` (desaturated via outline/dithering) | No new token — achieve "withered" through technique, not a new colour, when possible |
| Leaves (wilted) | `palette.ink_700` | Grey-green; cross-biome desaturated leaf token |
| Outline | `palette.ink_900` | Cross-biome deepest line token |

**When in doubt about adding a new token:** prefer expressing the shade through dithering / outline technique first. Only add a new token if the colour is genuinely new and will be reused (e.g., "sunflower yellow" will appear in every flower encounter forever).

---

## Section 3: Before/After state composition (for Describe encounters)

Describe encounters are the Phase 2 mechanic: Cluu approaches a broken thing, the player describes it back to life. The sprite flips from "problem" to "solved."

### Before state (withered / default / broken)

- Visual signal: "this is the problem." Communicates need via silhouette + palette — not text overlay.
- Sunflower reference: drooping head, grey-brown stem, no petals, leaves limp.
- Colour rule: Section 2 applies — desaturated tokens from the biome palette. No new pigments just for the "sad" state.

### After state (revived / resolved / repaired)

- Visual signal: "problem solved." Upright, saturated, healthy.
- Sunflower reference: upright stem, full yellow petals, bright green stem, optional celebration detail (a bee circling, a tiny sparkle) — keep detail subtle so it reads at 48×48.
- Colour rule: Section 2 applies — saturated biome tokens.

### Silhouette rule (non-negotiable)

The SAME silhouette bounding box applies to before + after. Same 48×48 cell, same approximate shape. Only the internal colour + detail changes between states.

**Why:** Phaser swaps the texture key in-place on encounter-resolve — `sprite.setTexture('encounter_meadow_sunflower_revived')`. If the silhouettes differ in footprint, the sprite's hit-area drifts, the physics body becomes wrong, and Cluu's pathfinding anchor misaligns. Silhouette discipline keeps the texture swap a visual-only change.

### Alignment rule (non-negotiable)

The base of the object (stem root, NPC feet, workbench bottom edge) pins to the bottom-centre pixel of the 48×48 frame. Consistent alignment means scene-side positioning code does not need per-encounter offsets.

**Concrete coordinates for 48×48:** base pixel at local `(24, 47)` (0-indexed, y increases downward). Every Describe sprite's root pin lands here, before AND after.

---

## Section 4: File naming convention

Pattern (verbatim — do not deviate): `encounter_<biome>_<id>_<state>.png`

| Slot | Allowed values | Notes |
| --- | --- | --- |
| `<biome>` | `meadow`, `village`, `workshop`, `tidepools`, `library` | Matches the biome slug used in LOGIC.md encounter front-matter |
| `<id>` | lowercase `snake_case` — matches the `.logic.md` encounter id authored in Phase 2+ | Example: `sunflower`, `lost_pigeon`, `cracked_kettle` |
| `<state>` | Encounter-type-specific — see table below | Exactly two states per encounter for v1 |

**State vocabulary (by encounter type):**

| Encounter type | State 0 | State 1 |
| --- | --- | --- |
| Describe | `withered` | `revived` |
| Request | `waiting` | `resolved` |
| Contract | `broken` | `repaired` |
| Tool | `full` | `empty` |
| Capstone | encounter-specific (document in the encounter's `.logic.md`) | encounter-specific |

**Concrete filenames (Sunflower):**

- `encounter_meadow_sunflower_withered.png`
- `encounter_meadow_sunflower_revived.png`

### File locations

| What | Where | Served to browser? |
| --- | --- | --- |
| Exported PNG (runtime asset) | `public/sprites/` | YES — Next.js serves `/public/` as static at `/sprites/<name>.png` |
| Aseprite source `.ase` file | `design/aseprite/encounter_<biome>_<id>.ase` | NO — `design/` is NOT under `public/`. Committed only for editability (CONTEXT decision D-20). |
| Optional sheet JSON (if using Aseprite-loader pipeline) | `public/sprites/<name>.json` | YES — loaded by Phaser via `this.load.aseprite(key, pngPath, jsonPath)` |

**Name the `.ase` once per encounter, not once per state.** A single `.ase` file holds both `withered` and `revived` frames as separate frames tagged appropriately (Aseprite tags map to frame ranges). Export via `--split-tags` to get two PNGs, or export once as a vertically stacked sheet. Describe encounters are state-swap (not animation), so two separate PNGs is simpler and matches Section 8's worked example.

---

## Section 5: Aseprite export settings (the 7-checkbox checklist)

Copy these settings VERBATIM from RESEARCH §Pattern 1 + §Pitfall 1. Missing any single checkbox produces broken sprites that appear to work but fail silently at runtime.

1. **`File → Export Sprite Sheet`** — open this dialog, not any of the other export menus.
2. **Layout tab:** Sheet type = **Packed**, Constraints = **None**, check **Merge Duplicates**.
3. **Sprite tab:** Layers = **Visible layers**, Frames = **All frames** (or a tag subset if exporting a slice of the timeline).
4. **Borders tab:** check **Trim Sprite** + **Trim Cells**; set Border Padding / Spacing / Inner Padding ≥ 1 (prevents texture-bleed at render time).
5. **Output tab:** tick **Output File** (the PNG), tick **JSON Data** (format = Hash or Array — Phaser 3.90 accepts both), in the Meta options section tick **Tags**, and set **Item Filename** = `{frame}` (no prefix, no suffix).
6. **Tags-required warning (RESEARCH §Pitfall 1):** if the sprite has ≥ 1 animation tag, the **Tags** meta checkbox in step 5 MUST be on. Otherwise `createFromAseprite` silently creates zero animations — the sprite loads, renders statically, and nothing in the console indicates what went wrong. Verification after export: `jq '.meta.frameTags | length' public/sprites/<name>.json` must return ≥ 1 for any tagged sprite.
7. **Post-export dimension sanity check:** `file public/sprites/<name>.png` should report the expected dimensions. For a vertically stacked sheet of N frames at 48×48, expect approximately `48 × (48 × N)`. Note: Packed layout (step 2) may reshuffle frames — the dimension check is a sanity floor, not a tight equality. For single-state PNGs (like Sunflower withered), expect exactly 48×48.

**CLI equivalent (optional, for re-export automation):**

```bash
aseprite -b design/aseprite/encounter_meadow_sunflower.ase \
  --sheet-type packed \
  --sheet public/sprites/encounter_meadow_sunflower.png \
  --data public/sprites/encounter_meadow_sunflower.json \
  --format json-hash \
  --list-tags \
  --trim \
  --border-padding 1 --shape-padding 1 --inner-padding 1
```

Or, for Describe encounters where each state ships as a separate PNG:

```bash
aseprite -b design/aseprite/encounter_meadow_sunflower.ase \
  --split-tags \
  --sheet public/sprites/encounter_meadow_sunflower.png
```

`--split-tags` produces one PNG per tag — name tags `withered` / `revived` and Aseprite writes `encounter_meadow_sunflower_withered.png` and `encounter_meadow_sunflower_revived.png` directly. This matches the naming convention in Section 4 for free.

---

## Section 6: Authoring at 1:1 display resolution

AUTHOR at the exact display size:

- **Cluu + encounter objects:** 48×48.
- **Tiles:** 32×32.

DO NOT author at 96×96 and downscale to 48×48. DO NOT author at 64×64 "for detail" and scale down. Pixel-art is the opposite discipline from 3D art or vector art — working at a larger resolution and shrinking makes every line un-crisp.

**Why this matters (per RESEARCH §Pitfall 4):**

Mixing `pixelArt: true` (the Phaser config currently locked in `game/config.ts`) with non-integer runtime scaling produces fuzzy edges that `pixelArt` mode was designed to prevent. Authoring at 2× and letting Phaser downscale stacks a downscale on top of whatever the display scale mode is doing. Authoring at 1:1 keeps the sprite sharp through FIT scaling.

If the loose-pixel aesthetic (CONTEXT D-07) needs genuine sub-pixel AA detail that cannot be achieved at 48×48 native, that is the trigger to re-evaluate the `pixelArt: true` flag — it is NOT a licence to author at 2× and downscale.

---

## Section 7: Commit convention

**Commit both the PNG (runtime asset) AND the `.ase` source (authoring asset). Never commit only the PNG.**

Future-you returning in six months to tweak a sprite needs the layered source, not just the flattened export. An `.ase` file is a few hundred KB — negligible against the repo's size budget. Losing it is unrecoverable.

Layout:

| What | Path | Notes |
| --- | --- | --- |
| Authoring source | `design/aseprite/encounter_<biome>_<id>.ase` | Committed. Never modified outside Aseprite. |
| Runtime PNG(s) | `public/sprites/encounter_<biome>_<id>_<state>.png` | Committed. Regenerated from the `.ase` via the export command in Section 5. |
| Optional JSON (Aseprite loader path) | `public/sprites/encounter_<biome>_<id>.json` | Committed when using `this.load.aseprite()` instead of `this.load.image()` |

**Gotcha (RESEARCH §Pitfall 3):** `.ase` files MUST NOT land under `public/`. Next.js serves everything under `public/` as a static asset — a stray `.ase` copy becomes a 500 KB download per page view and is an unnecessary information leak of the authoring source. Verification: `find public -name '*.ase'` must return zero results.

**`.gitignore` posture:** `design/aseprite/**/*.ase` is NOT ignored (committed per above). `public/sprites/**/*.ase` is effectively forbidden by convention — the `find` check above is the guard.

---

## Section 8: Worked example — Withered Sunflower

This is the Phase 2 unblock encounter. Every detail below is a template the next encounter copies.

### Files produced

| File | Size | Role |
| --- | --- | --- |
| `public/sprites/encounter_meadow_sunflower_withered.png` | 48×48 | Runtime asset — "before" state |
| `public/sprites/encounter_meadow_sunflower_revived.png` | 48×48 | Runtime asset — "after" state |
| `design/aseprite/encounter_meadow_sunflower.ase` | layered source | Authoring asset — 2 frames tagged `withered` and `revived` |

### Canvas + layers

- Canvas: 48×48, single frame per state (two separate PNGs rather than a stacked sheet — Describe encounters are state-swap, not animation, so sheet packing buys nothing).
- Aseprite layers (inside the one `.ase`): one `background` layer (transparent — Phaser composes over the scene), one `stem` layer, one `petals_revived` layer (hidden on the `withered` frame), one `leaves` layer, one `outline` layer.

### Alignment

- Stem root pinned at local coords `(24, 47)` on BOTH frames (Section 3 rule).
- Revived petals extend upward from around `(24, 20)` to `(24, 47)`. Withered head droops but occupies approximately the same bounding box so silhouette stays stable (Section 3 rule).

### Palette (Section 2 rule — tokens only)

| Region | Token |
| --- | --- |
| Petals (revived) | `palette.meadow_sunflower_petal` (new token, add via Plan 01.1-01 if absent) |
| Petal highlight | `palette.meadow_grass_highlight` (reused from Meadow triad) |
| Stem | `palette.meadow_grass_shadow` |
| Leaves | `palette.meadow_grass_mid` (revived) / `palette.ink_700` (withered — muted leaf token) |
| Outline | `palette.ink_900` |

### Phaser integration (out of scope for Phase 01.1 — shown as the contract for Phase 2)

```typescript
// In Phase 2's BootScene.preload():
this.load.image(
  'encounter_meadow_sunflower_withered',
  '/sprites/encounter_meadow_sunflower_withered.png',
);
this.load.image(
  'encounter_meadow_sunflower_revived',
  '/sprites/encounter_meadow_sunflower_revived.png',
);

// On encounter-resolve, Phase 2's MeadowScene does:
sprite.setTexture('encounter_meadow_sunflower_revived');
// Silhouette discipline (Section 3) means this is a texture swap only.
// No position change, no body resize, no anchor recalculation.
```

### Export

Run the `--split-tags` CLI command from Section 5 against `design/aseprite/encounter_meadow_sunflower.ase`. Produces the two PNGs in `public/sprites/` directly — no manual file renaming.

### Acceptance

- `test -f public/sprites/encounter_meadow_sunflower_withered.png` — exits 0
- `test -f public/sprites/encounter_meadow_sunflower_revived.png` — exits 0
- `test -f design/aseprite/encounter_meadow_sunflower.ase` — exits 0
- Visual QA against `design/style-guide.png` — author confirms silhouettes align + tokens match.

---

## Section 9: Out of scope (deferred references)

These concerns are NOT part of encounter-object authoring and live in separate deliverables:

| Concern | Where it lives | When |
| --- | --- | --- |
| Per-encounter audio cue | Separate audio-cues spec (not yet authored) | Phase 5 if ever; deferred in CONTEXT |
| Motion / tween feel (petals unfurling on revive, NPC idle bob, etc.) | Per-encounter decision in the encounter's Phase 2+ implementation plan | Author-time decision, not a sprite-spec decision |
| Automated pixel-palette audit (reads sprite PNG, verifies every pixel maps to a token) | Phase 5 polish if it ships; out of scope for Phase 01.1 | Relies on manual QA + the style-guide PNG until then |
| AI image-model prompt templates for generating candidate sprites | User discretion per CONTEXT D-18 — model choice is the author's call | Not specified here |
| LOGIC.md encounter contract format (grading rubric, prompt stubs) | Phase 2 authoring — separate concern from sprite art | Linked via the `<id>` slug convention in Section 4 |
| React-overlay visual restyle (landing page, consent banner, settings menu) | Deferred per CONTEXT D-05 until Phase 5 | Tokens file ready to consume when that phase starts |

---

## Footer

- Last updated: Phase 01.1 (2026-04-21)
- Next revision trigger: when the first non-Meadow biome adds an encounter (Phase 4 Village/Workshop/Tide Pools/Library) — that is when state-vocabulary conflicts or canvas-size edge cases will surface. Revisit Sections 1, 4, and 5 explicitly at that point.
- Reviewing authority: solo dev (this is a solo project; reviewer and author are the same person). Treat that as extra reason to keep this doc explicit — future-you is a different person than present-you.
