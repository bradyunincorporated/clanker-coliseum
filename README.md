# Clanker Coliseum

A browser 2D arcade fighter where a decision model picks every action. Both fighters act at
the same moment, once a second; the server simulates the tick and any browser watches.

```sh
bun install
bun run dev      # arena service on :8787, web app on http://127.0.0.1:5173
bun run check    # format, lint, typecheck (there are no tests, by rule)
bun run build
```

Each fighter picks its own brain on the fighter page: Gemini Decision 1
(`gemini-decision-1`), TypeSafe Jev (`jev-1.14.0`) or Cloudflare Clef
(`@cf/cloudflare/clef`), plus the house heuristic and random brains. All three models get
the same rules, raw state, legal actions and deadline. Keys stay in the arena service:
`GEMINI_API_KEY`, `TYPESAFE_API_KEY`, `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
(a key can instead be injected by the environment's network proxy). The service checks
each model at startup; a model that is down, errors or answers late is named on the HUD
line under the fighter and in `/api/health`, and the heuristic fills in for errors.

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
