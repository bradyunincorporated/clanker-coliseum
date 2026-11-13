// decide(): one fighter's pick for the next tick. Runs while the current tick plays back.

import {
  HeuristicBrain,
  mulberry32,
  RandomBrain,
  samplePick,
  type DecisionContext,
} from "@clanker/game";
import { Effect } from "effect";
import { DecisionModel } from "./decision-model.js";
import type { BrainKind, PickInfo } from "./protocol.js";

/** A fighter's brain for one match: seeded so a match replays the same way from the same answers. */
export interface FighterBrain {
  readonly kind: BrainKind;
  readonly decide: (ctx: DecisionContext) => Effect.Effect<PickInfo, never, DecisionModel>;
}

export function makeBrain(kind: BrainKind, seed: number): FighterBrain {
  const heuristic = new HeuristicBrain();
  heuristic.reset(seed);
  const random = new RandomBrain();
  random.reset(seed);
  const rand = mulberry32(seed * 17 + 11);
  const local = (brain: HeuristicBrain | RandomBrain, ctx: DecisionContext) =>
    Effect.promise(() => brain.decide(ctx));

  return {
    kind,
    decide: (ctx) =>
      Effect.gen(function* () {
        if (ctx.legalActions.length === 0)
          return { action: "idle", source: "forced" } satisfies PickInfo;
        if (kind === "random")
          return { action: yield* local(random, ctx), source: "random" } satisfies PickInfo;
        if (kind === "heuristic") {
          return { action: yield* local(heuristic, ctx), source: "heuristic" } satisfies PickInfo;
        }
        const model = yield* DecisionModel;
        return yield* model.decide(ctx).pipe(
          Effect.map((answer): PickInfo => ({
            // Mostly the model's top option, sometimes its runner-up (seeded).
            action: samplePick(answer.probabilities, ctx.legalActions, rand),
            source: "gemini",
            confidence: answer.confidence,
            latencyMs: answer.latencyMs,
          })),
          Effect.catchTag("DecisionError", (e) =>
            local(heuristic, ctx).pipe(
              Effect.map((action): PickInfo => ({ action, source: "fallback", note: e.message })),
            ),
          ),
        );
      }),
  };
}
