# Status

> Updated: 2026-07-10

## Where we are
The arcade game is now a Little Nightmares-grade 2.5D diorama, rebuilt over three days of user-directed passes: measured teal palette and lighting from the actual LN3 reference frames, Gemini-generated painted backdrops per biome, redesigned found-object Cluu, puppet enemies with behavior variants, real secondary planes (under-floor pits, wall crawl-spaces), a biome journey (Boot Yards > Undersluice > Night Fair > Blueprint Woods > Summit Boiler) with post-boss destruction cinematics and travel transitions, and a full sampled soundtrack (per-level music, footsteps, duel impacts, UI sfx). Live public at cluu.vercel.app.

## Recent
- Audio complete: biome-mapped level music with crossfades, boss/level stingers, stride-synced footsteps, duel hit/miss impacts, interaction sounds
- Boss flow is cinematic end to end: entry hit + drifting tilted camera, collapse with riser and thud, iris wipe through the passage, captioned travel pan into the next biome
- Painted-asset pipeline established: Gemini 2.5 Flash Image (user-funded prepay key in .env.local) generates LN-grade plates; ffmpeg converts curated wavs from assets/audio/

## Next
- Sloped walk-line refactor (user wants 30-degree inclines, e.g. descending the Undersluice): terraced ground pieces + step-up assist + per-piece floor y through renderer, pools, props, pits. Dedicated pass; touches every GY-anchored system
- Wire encounters to /api/encounter/attempt for live GLM-5.2 prompt grading (the Library thesis, still the product core)
- Pit/crawl ambience swap (Creepy cave ambience.wav is converted-ready in assets/audio)
- Mite behavior tuning after user playtests; revisit "Anthropic only in v1" grading lock before launch
- assets/refs/ and assets/audio/ are untracked local source libraries (900MB); keep out of git
