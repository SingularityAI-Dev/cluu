// lib/design/tokens.ts
//
// Canonical design tokens for Cluu.
//
// RULE: No raw hex codes (e.g. `#faf8f3`) and no raw 0x colour literals
// (e.g. `0xe8f4d7`) anywhere outside this file. The palette-audit test at
// tests/design/palette-audit.test.ts (Plan 01.1-05) grep-fails the build
// if a hex appears in any other .ts/.tsx/.css file (modulo an explicit
// allowlist for Phase 1 overlay files — see D-05 defer).
//
// Shape + naming:
//   - D-11: `export const palette = { ... } as const;` — literal narrowing.
//   - Tokens are role-based (`meadow_grass_shadow`), NOT pigment-based
//     (`green900`). Binds consumers to intent, not pigment.
//   - Every Phase 1 inline-style hex is preserved verbatim as a named
//     token so the deferred Phase 5 overlay restyle is a pure import
//     swap with zero visual diff.
//
// Locked decisions referenced:
//   - D-09: Meadow green triad (mid / highlight / shadow).
//   - D-10: Cluu base body colour family = warm cream/peach.
//   - D-11: Tokens file shape — `as const` literal objects.
//   - D-12: Spacing + radii also live here.
//   - D-22: Audit rule — no raw hex outside this file.

/**
 * Named colour palette — single source of truth for every colour the game renders.
 *
 * Consumers:
 *   - `game/config.ts` (Phaser scene background) via `hexToInt(palette.meadow_hint)` — Plan 04.
 *   - `tests/design/palette-audit.test.ts` (ALLOWLIST anchor) — Plan 05.
 *   - Phase 5 overlay restyle — swap inline hex literals for token imports.
 */
export const palette = {
  // --- Cross-biome cores (5) — preserve Phase 1 inline palette (D-11) ---
  ui_paper: '#faf8f3', // body background (app/globals.css:7)
  ink_900: '#2d2a26', // body text (app/globals.css:6)
  accent_green: '#2d6a4f', // anchor + primary CTA (app/globals.css:15, auth/signin/page.tsx:46, app/global-error.tsx:29)
  meadow_hint: '#e8f4d7', // Phaser scene background (game/config.ts:14, app/play/CanvasSkeleton.tsx:11)
  cluu_body: '#f4d1b5', // D-10 warm cream/peach — Cluu base body colour

  // --- Ink scale (preserved from Phase 1 inline styles — D-05 defer) ---
  ink_700: '#4a5240', // CanvasSkeleton text (app/play/CanvasSkeleton.tsx:15)
  ink_600: '#555555', // signin subtitle (app/auth/signin/page.tsx:17)
  ink_500: '#666666', // error copy + landing helper (app/global-error.tsx:23, app/page.tsx:14)
  ink_400: '#777777', // signin helper copy (app/auth/signin/page.tsx:20)
  white: '#ffffff', // CTA text + cards (app/global-error.tsx:30, app/auth/signin/page.tsx:47, ui/ConsentBanner.tsx:50, ui/SettingsMenu.tsx:60,80)
  stone_200: '#d9d6ce', // input + menu borders (app/auth/signin/page.tsx:34, ui/SettingsMenu.tsx:59,82)

  // --- Meadow biome (D-09 locked triad; extensions allowed in later plans) ---
  meadow_grass_mid: '#6fa872',
  meadow_grass_highlight: '#9bc49e',
  meadow_grass_shadow: '#42744b',

  // --- Encounter object accents (Phase 01.1 Withered Sunflower) ---
  sunflower_petal: '#f2c94c',
  sunflower_core: '#7a4a2a',
  sunflower_stem: '#5b8f45',
  sunflower_withered: '#a86f3a',

  // --- Cluu accent (Phase 01.1 Content pose) ---
  cluu_cheek: '#e8b8a0',
} as const;

/**
 * Discriminated-union key type for palette consumers.
 *
 * @example
 *   function setTint(token: PaletteToken) { ... }
 *   setTint('meadow_grass_mid'); // ok
 *   setTint('not_a_token');      // type error
 */
export type PaletteToken = keyof typeof palette;

/**
 * Literal hex-string type — every value in `palette` narrows to `#rrggbb`.
 */
export type PaletteHex = (typeof palette)[PaletteToken];

/**
 * Semantic spacing tokens (D-12).
 *
 * - `tile`: meadow tile edge length — Phase 1 D-10 lock.
 * - `cluu`: Cluu sprite edge length — Phase 1 D-13 lock.
 * - `encounter`: default encounter-object canvas edge — D-21 authoring spec default.
 */
export const spacing = {
  tile: 32,
  cluu: 48,
  encounter: 48,
} as const;

/**
 * Border-radius tokens (D-12).
 *
 * Forward-looking for Phase 5 UI polish. No Phase 01.1 consumer — shipped now
 * so Phase 5's overlay restyle sweeps imports in one pass.
 */
export const radii = {
  sm: 4,
  md: 8,
  lg: 16,
} as const;

/**
 * Convert a `#rrggbb` (or `#rgb` shorthand) string to the 24-bit integer
 * form Phaser's colour APIs accept (e.g. `setBackgroundColor`, `tint`).
 *
 * Kept framework-agnostic — this file must NOT import from `phaser` so tokens
 * stay consumable from test code + future non-Phaser contexts.
 *
 * @example
 *   hexToInt(palette.meadow_hint) // => 15267031 (0xe8f4d7)
 *   hexToInt('#fff')              // => 16777215 (0xffffff)
 */
export function hexToInt(hex: `#${string}`): number {
  const raw = hex.slice(1);
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw;
  return Number.parseInt(full, 16);
}
