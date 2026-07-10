# Status

> Updated: 2026-07-10

## Where we are
The arcade game is feature-rich and live at cluu.vercel.app: LN-grade painted world across five distinct biomes, painted puppet bosses with fully dramatized duels and destruction cinematics, secondary planes (pits, crawl-spaces), a collectible economy (cog armor, rare brass moths), a complete sampled soundtrack with per-level music and title theme, and Keeper's Echoes: voiced monologues (local Kokoro TTS) at gramophones that teach real Claude Code practice. Levels lengthen progressively via init-time world extension.

## Recent
- Keeper's Echoes shipped: 10 voiced teachings, letterboxed cine, subtitles, music ducking; TTS pipeline is local (kokoro-onnx + models in assets/tts/, aged-voice ffmpeg chain)
- World extension: 400-1600px inserted before each arena at init; all authored coordinates shift via extendWorld; new stretches filled with content
- Audio matured: synth engine deleted, everything sample-based; user actively curates (voiced jump huffs tried and reverted same day)

## Next
- Sloped walk-line refactor (30-degree inclines) still promised; touches every GY-anchored system, needs a dedicated pass
- Wire encounters to /api/encounter/attempt for live prompt grading (Library thesis, still the product core)
- Chatterbox voice-clone swap for the Keeper if the Kokoro timbre wears thin
- Pit/crawl ambience swap (Haunted_Places whispers track is a ready candidate)
- assets/{refs,audio,tts} are untracked local libraries (~1.2GB); keep out of git
