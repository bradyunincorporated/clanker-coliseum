# Playable development fighters

Arcanine and Gengar are registered in `packages/game/src/fighters/index.ts`.
Their definitions contain four moves each, provisional stats, custom hurtboxes and the
delivered sprite bindings. Arcanine uses `cinderhound` assets; Gengar uses `grinshade`.
The aliases are asset folder names only; the UI and match API use `arcanine` / `gengar`.

## Run and inspect

Use Bun 1.4.4: `bun install --frozen-lockfile`, then `bun run dev`.
Open `http://127.0.0.1:5173/fighters`, pick each corner and choose **Next: start a match**.
The lobby supports Gemini, heuristic and random brains. Press **H** during a match
to inspect body boxes, attack boxes and ground anchors.

The local service needs `GEMINI_API_KEY` for Gemini. A key configured in Claude's cloud
network proxy does not automatically configure a local terminal. Without a reachable
model, the service explicitly reports heuristic fallback in the lobby.

The build uses Bun to run Vite; the machine's older Node version cannot run this
SvelteKit version's postbuild step. Run `bun run check` and `bun run build` for checks.

## Tuning ownership

Astra owns the fighter definitions, sprite packs and related presentation wiring.
The game engine, model transport and timing rules remain separate. Stats, damage and
collision rectangles are starting playtest values. Flash Fire and Levitate are simplified
20% damage resistances using the engine's existing passive contract.

The selection flow goes directly to the live lobby. `/coach` remains a visual prototype;
its controls do not change gameplay. Late Gemini picks still use the engine's existing
behavior; a deadline fallback is the next recommended engine improvement.
