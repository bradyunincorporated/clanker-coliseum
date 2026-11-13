# Clanker Coliseum

## Current decisions

Bun, Svelte (SvelteKit), Effect and PixiJS, structured like the owner's web-game-engine
repository, which is a read-only reference: never push to it.

The game is an AI-driven 2D arcade fighter. Decisions the owner has made (2026-11-13):
Gemini Decision 1 behind one `decide()` so the model stays swappable; 1 tick per second and
every action lasts one tick; 40-second rounds, best of 1; 2 fighters for the MVP; 12 actions
(8 basic + 4 fixed moves), no meter, no special move, one hard-coded passive per fighter;
type chart x1.2 / x0.8 with STAB x1.1; one-tick knockdowns; a wide walled stage; the model
sees raw state plus full move details for both fighters, never pre-digested hints; picks
are sampled with a seed and are mostly the model's best option; the sim runs on the server
and browsers only watch. Fighters are original creatures. Out of the MVP: character
creator, live coaching, pre-match filtering.

The look is 1950s-60s billboard advertising with a retro diner mood: cream paper, ink
outlines, red as the hero colour, flat blue panels, hard offset shadows, script headlines.
The palette lives in `apps/web/src/routes/layout.css` and `apps/web/src/lib/arena/palette.ts`.
The owner supplies sprites; until then fighters and the stage are drawn in code.

## Boundaries

- `packages/game`: pure simulation and decision context. No DOM, Pixi, Effect, clock or
  `Math.random`. Same inputs always give the same tick.
- `packages/arena-service`: owns matches, timing, the decision model and the key. Only
  `decision-model.ts` knows the Gemini API. `protocol.ts` is the wire format.
- `apps/web`: renders what the service streams. It never simulates and never sees the key.
- Dependencies are one-way: web -> arena-service protocol types -> game.
- Use Effect at service and async boundaries, not per frame.
- A renderer owns what it creates: destroy the Pixi app, close the event stream.

## Code

Strict TypeScript, kebab-case modules, one subsystem per module. Package exports across
workspaces and `#lib` inside the Svelte app. Exact dependency versions pinned by `bun.lock`.
Reuse `apps/web/src/lib/components/ui` for standard controls.

## Verification: no tests

Owner's rule: this repo has zero tests. Do not write test files, test scripts, test
configs or test dependencies, and remove any that appear. The only verification is running
the thing and looking at the result: start `bun run dev`, open the app in a real browser,
start a match and watch it to the bell. `bun run check` (format, lint, typecheck) and
`bun run build` still run for a completed change.
