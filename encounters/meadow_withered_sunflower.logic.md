---
id: meadow_withered_sunflower
biome: meadow
mechanic: describe
difficulty: 1
reward:
  cosmetic: petal_pin
  xp: 10
  library_eligible: true
grading:
  model: claude-haiku-4-5
  temperature: 0.2
---

# Encounter: Withered Sunflower

## Context
The player has walked Cluu to a withered plant at the meadow's edge.
They must describe what the plant should become.

## Player prompt input
{{user_prompt}}

## Claude's task
Generate a short 30 to 60 word description of the plant now, based on the player's prompt.
The description will be shown in-game as flavour text.

## Grading contract
Pass requires all three:
- SPECIFICITY: User prompt contains at least 2 concrete visual nouns.
- DETAIL: User prompt contains at least 2 descriptive adjectives.
- CONSISTENCY: Claude's generated description does not contradict the user prompt.

Flair also requires:
- EVOCATIVE: User prompt uses sensory or atmospheric language beyond bare visual detail.

## Reward messaging
- Pass: The sunflower unfurls. A bee arrives.
- Flair: The sunflower unfurls, petals trembling. Three bees arrive.
- Fail: The plant stirs, but doesn't quite wake. Try describing it more.
