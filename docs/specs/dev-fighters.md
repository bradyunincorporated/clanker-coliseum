# Development fighters

Status: implemented from the owner's approved Arcanine and Gengar integration.

## Purpose and contract

Register two playable fighters using the existing `FighterDef`, `SpriteSpec`,
`MoveDef` and `HurtboxSet` contracts in `packages/game/src/sim/types.ts`.
No new wire schema, dependency, model behavior or simulation rule is introduced.
`FIGHTERS.arcanine` and `FIGHTERS.gengar` are the MVP roster. `getFighter` and
`validateFighter` retain their current signatures and validation behavior.

## Content

- Arcanine: Fire; Bite, Flamethrower, Bulldoze, Flare Blitz. A mobile bruiser.
- Gengar: Ghost/Poison; Lick, Dark Pulse, Sludge Wave, Shadow Punch. A lighter fighter.
- Use the delivered custom hurtboxes, phase timings and hitboxes. These are initial
  playtest values, not a claim of competitive balance.
- Use modest supported passives: Arcanine takes 20% less Fire damage; Gengar takes
  20% less Ground damage. Neither gets permanent knockdown immunity.
- Assets remain under the handoff folder aliases `cinderhound` and `grinshade`.
  Public names and fighter IDs use the requested character names.

## Files and boundaries

- `packages/game/src/fighters/{arcanine,gengar}.ts`: pure typed definitions.
- `packages/game/src/fighters/dev-sprites.ts`: shared animation-name bindings.
- `packages/game/src/fighters/index.ts`: register the roster.
- `apps/web/src/lib/shell/roster.ts`: presentation asset URLs only.
- Shell portrait and standee components: display supplied art.
- Landing, fighters, coach, arena and match pages: pass the selected art and IDs.
- Existing service owns matches and Gemini credentials; the browser receives no key.

## Invariants and acceptance

1. Each fighter has four moves, each within the 60-frame action budget.
2. All referenced body and effect animation names exist in the delivered atlases.
3. Ground anchors remain `(0.5, 0.9)` at scale `0.5`; idle loops are 3600/4600 ms.
4. Selecting either fighter in either corner preserves those IDs into a live match.
5. A local match renders supplied art, attacks and effects and reaches a result.
6. Missing Gemini access is clearly disclosed by the existing service/lobby status.

Verification follows the repository's no-tests rule: format/lint/typecheck, build,
and one browser match. Further timing and balance decisions are manual playtesting.
The build script explicitly uses Bun for Vite, avoiding the machine's older Node runtime.
