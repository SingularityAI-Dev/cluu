# Status

> Updated: 2026-07-08

## Where we are
Hard pivot (user-directed, 2026-07-08): the standalone CLUU arcade game replaced the Phaser/Next.js game as the product in this repo. The old game stack (Phaser scenes, Supabase auth, Zustand store, consent/analytics UI, sprites and asset tooling) is deleted. The repo is now the self-contained game at `public/arcade/index.html` served at `/`, plus a minimal Next.js shell exposing `/api/encounter/attempt` — NVIDIA NIM (z-ai/glm-5.2) prompt grading with a deterministic local fallback. Deployed public on Vercel.

## Recent
- Old game code removed (71 files): game/, app/play, app/auth, state/, ui/, lib/{supabase,migrate,consent,analytics,design}, proxy.ts, sprites, design tooling, supabase CLI config; deps pruned to next/react/zod/sentry
- NIM grading adapter shipped: z-ai/glm-5.2 chosen after live discrimination + injection tests (llama-3.3-70b and minimax-m3 both failed); verified on production
- Arcade game v4 (3-plane depth lanes, lane-hunters, camera dolly) published as artifact and deployed at `/` and `/arcade/`

## Next
- Wire the arcade game's encounters to `/api/encounter/attempt` so player-written prompts get live GLM-5.2 grading (the Library thesis: real prompts, real grades)
- Author more `.logic.md` encounter contracts beyond meadow_withered_sunflower
- Revisit the "Anthropic only in v1" lock (currently user-overridden for testing) before any launch
- Latency: free NIM endpoint runs 30-45s per grade; add the identical-prompt cache from the design doc if it hurts playtests
