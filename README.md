# Clanker Coliseum

A browser 2D arcade fighter where a decision model picks every action. Both fighters act at
the same moment, once a second; the server simulates the tick and any browser watches.

```sh
bun install
bun run dev      # arena service on :8787, web app on http://127.0.0.1:5173
bun run check    # format, lint, typecheck (there are no tests, by rule)
bun run build
```

Gemini Decision 1 picks the actions. The arena service gets its key from `GEMINI_API_KEY`
or from the environment's network proxy, and checks at startup which works. Without
either, fighters use the heuristic brain and the HUD says so.

## Layout

- `packages/game`: the pure, deterministic sim. Tick resolver (60 hidden frames per tick,
  startup/active/recovery, hitboxes), type chart, one file per fighter, and the decision
  context and Gemini request builder. No DOM, no clock, no randomness of its own.
- `packages/arena-service`: the Effect backend. `decide()` behind a swappable
  `DecisionModel` service, and `Matches`, which runs each match on the server and streams
  ticks as server-sent events.
- `apps/web`: SvelteKit, Tailwind and shadcn-svelte-style components; a PixiJS renderer in
  `src/lib/arena` that only plays back what the server sends.

## Rules (MVP)

1 tick per second, 40-second round, best of 1, two fighters (Boltboar, Mossback). 12
actions: idle, walk forward/back, jump, jump forward, crouch, block, crouch block and 4
fixed moves. No meter and no special move; each fighter has one hard-coded passive. Type
chart x1.2 / x0.8 (immunities also x0.8), STAB x1.1. Knockdowns cost one tick.

## Adding a fighter or its sprites

Copy a file in `packages/game/src/fighters`, change the id and list it in `index.ts`.
Sprites are optional per fighter; anything missing is drawn as a placeholder. The full
contract (poses, cell size, ground point, phase-timed move art, effect overlays, hurtbox
layouts) is in `docs/FIGHTER-SPEC.md`.
