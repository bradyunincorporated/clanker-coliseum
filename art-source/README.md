# Four additional fighter source packs

These packs follow `docs/FIGHTER-SPEC.md` v4.1 and the existing development fighters.
They contain original Gen 5 references, generated pose art, portraits, move effects,
loose transparent frames, phase-aware Pixi atlases and alignment guides.

## Move choices

| Fighter | Quick attack | Reach | Low attack | Heavy attack |
| --- | --- | --- | --- | --- |
| Blastoise | Bite | Water Pulse | Aqua Tail | Hydro Pump |
| Raichu | Quick Attack | Thunderbolt | Iron Tail | Volt Tackle |
| Scyther | Quick Attack | Wing Attack | Slash | X-Scissor |
| Hitmonlee | Double Kick | Rolling Kick | Low Sweep | High Jump Kick |

The art adapts the moves to the existing arena. Effects stay attached to the move.
`fighter-art.json` contains suggested collision rectangles and preview timings.
The game agent can tune these values with the owner during playtesting.

## Runtime files

Each pack is under `apps/web/static/fighters/<species>/` and includes
`<species>.json`, `<species>.png`, `portrait.png`, `fighter-art.json`,
`idle-timing.json` and `frames/*.png`.

Every cel is 800 × 520, facing right, with the ground reference at (400, 468).
Use anchor (0.5, 0.9), scale 0.5 and nearest-neighbor sampling.
Effect cels are centered at (400, 260). The atlas keeps original source geometry
when trimming. Idle animations preserve the full source loop and frame durations.

## Sources and generation

Original sprite art is credited to Nintendo / Game Freak, downloaded from
[Pokémon Database](https://pokemondb.net/sprites).
Each `references/<species>/sources.json` records exact source URLs.
Normal Kanto forms were selected. `front.gif` and `back.gif` retain the original
animated sources, alongside extracted front frames and timing metadata.

Additional poses and effects use Gemini `gemini-nano-banana-2.1`, matching the
original fighter pipeline. Each pose uses the source sprite as an image reference.
The prompt set lives in `tools/new_jobs.py` and `tools/extra_jobs_new.py`.
Individual image metadata records the exact prompt and generation model.

The pipeline requires Python, Pillow, requests and rectpack. Credentials are read
from `GEMINI_API_KEY` or the existing private local key file and never persisted
in the source pack. Run the job builders, then `run_generation.py` with each JSON
job file. Run `prepare_new.py`, `prepare_effects.py` and `build_packs.py` afterward.

The source pack supplies art and alignment data. Fighter registration and gameplay
balance use the existing game integration workflow.
