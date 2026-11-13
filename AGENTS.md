# Clanker Coliseum

## Current decisions

Bun, Svelte (SvelteKit), Effect and PixiJS, structured like the owner's web-game-engine
repository, which is a read-only reference: never push to it.

The game is an AI-driven 2D arcade fighter. Decisions the owner has made (2026-11-13):
three decision models behind one `decide()`, picked per fighter (Gemini Decision 1, TypeSafe
Jev, Cloudflare Clef; 2026-11-13), all given the same state, actions and deadline; 1 tick per second and
every action lasts one tick; 40-second rounds, best of 1; 2 fighters for the MVP; 12 actions
(8 basic + 4 fixed moves), no meter, no special move, one hard-coded passive per fighter;
type chart x1.2 / x0.8 with STAB x1.1; one-tick knockdowns; a wide walled stage; the model
sees raw state plus full move details for both fighters, never pre-digested hints; picks
are sampled with a seed and are mostly the model's best option; the sim runs on the server
and browsers watch and coach. Fighters are original creatures. Out of the MVP: character
creator, pre-match filtering.

Coaching (owner's direction, 2026-11-13) is presets, never the player's own text. Each side
picks a game plan before the match (`g1`, `g2` in the setup query) and makes calls during
it: three are on offer per side, a call shapes 5 picks and is followed by a 3-tick rest.
`packages/game/src/ai/coaching.ts` holds every preset and its wording; the wording was
measured against Gemini Decision 1, so re-measure before changing it. The order reaches
every brain as one coach line after the state; a brain with no answer in time does what the
call asks. Calls that depend on reach say whether the opponent is in reach, the one place
the model is told something it could work out. The service accepts a call at
`POST /api/matches/:id/coach` and tells every watcher; `apps/web/src/lib/shell/coach-calls.ts`
is how screens hear accepted calls (`onCoachCall`) and make them. Trainer ids (`trainer1`,
`trainer2`) are opaque strings carried from the setup query into the match summary.

The look is whimsical cut-paper game art: a watercolour diner at dusk with navy ink
outlines (owner's direction, 2026-11-13: fun, high-quality game art; the 1950s inspiration
is for mood, not for forced retro lettering). It is a video game, not a website: every
screen is a full-bleed painted scene, controls are painted props (plank signs, a menu card,
a service bell, podiums, a chalkboard) and plain web chrome stays out. Lettering is Lilita
One for display and Fredoka for text. The palette lives in `apps/web/src/routes/layout.css`
and `apps/web/src/lib/arena/palette.ts`. The art is AI-generated (Gemini image models) and
lives in `apps/web/static/{title,ui,hud,arena/diner}`. The owner supplies fighter sprites;
until then fighters are drawn in code.

There is one arena, the diner at dusk, built like a paper theatre: flat painted plates
stacked back to front (`apps/web/src/lib/components/shell/diner-diorama.svelte`). Scenery
never covers the fighters (owner's rule, 2026-11-13): there is no foreground plate, and the
fight canvas is always the top layer.

Site pages: `/` title screen, `/fighters` select, `/coach` game plan (each side's
standing order), `/arena` the empty stage, `/match` the versus lobby, and `/match/<id>` the
live match. The live match fills the whole window: the diorama is the stage and one
transparent PixiJS canvas over it draws fighters, effects and the painted HUD (health bars,
alarm-clock timer, banners), with the camera held still so sim positions line up with the
painted floor. Menu buttons there are two quiet icons in a corner. Empty hooks wait for the
fighter-art owner: a trainer slot per corner on `/fighters`, coach corners on the match
screen, and `onCoachCall()` in `apps/web/src/lib/shell/coach-calls.ts`. The coaches' call
tickets sit under the floor line (`coach-calls.svelte`).

No scrolling, anywhere (owner's rule, 2026-11-13): every page fits one landscape frame.
`apps/web/src/lib/components/shell/game-frame.svelte` lays the site out in design units (at
least 1280 x 720) and scales it to fill the window, with no header. Scenes are composed in
a 1280 x 720 stage box (`stageOrigin` in `apps/web/src/lib/arena/coords.ts`; the floor line
is 630 down) and the plates bleed past it to cover any window shape. Never use `vw`/`vh` or
anything that adds a scrollbar. Check screens at 1920 x 1080.

The owner-supplied development fighters and trainer UI are integrated. Preserve
`apps/web/static/fighters`, `apps/web/static/trainers`, the game fighter registry, and
`apps/web/src/lib/trainers` when changing the visual shell. Trainer choices travel as
`trainer1`/`trainer2`; pop-ins react to accepted calls from `onCoachCall`.

## Boundaries

- `packages/game`: pure simulation and decision context. No DOM, Pixi, Effect, clock or
  `Math.random`. Same inputs always give the same tick.
- `packages/arena-service`: owns matches, timing, the decision model and the key. Only
  `decision-model.ts` knows the model APIs and keys. `protocol.ts` is the wire format.
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
