// decide(): one fighter's pick for the next tick. Runs while the current tick plays back.

import {
  HeuristicBrain,
  mulberry32,
  RandomBrain,
  samplePick,
  type ActionId,
  type DecisionContext,
} from "@clanker/game";
import { Effect } from "effect";
import { DecisionModel } from "./decision-model.js";
import { isModelBrain, type BrainKind, type PickInfo } from "./protocol.js";

/**
 * The coach's call in force for one decision. Its sentence is already in `ctx.coaching`;
 * `actions` are the legal actions that count as following it, best first.
 */
export interface CoachOrder {
  readonly callId: number;
  readonly actions: readonly ActionId[];
}

/** A fighter's brain for one match: seeded so a match replays the same way from the same answers. */
export interface FighterBrain {
  readonly kind: BrainKind;
  readonly decide: (
    ctx: DecisionContext,
    order?: CoachOrder,
  ) => Effect.Effect<PickInfo, never, DecisionModel>;
  /** The pick when the brain ran out of time: the call's first action, or idle. */
  readonly late: (order?: CoachOrder) => PickInfo;
}

/** Stamp a pick with the call it was made under and whether it did what the call asked. */
function underOrder(pick: PickInfo, order: CoachOrder | undefined): PickInfo {
  if (!order) return pick;
  return {
    ...pick,
    call: order.callId,
    followed: (order.actions as readonly string[]).includes(pick.action),
  };
}

export function makeBrain(kind: BrainKind, seed: number): FighterBrain {
  const heuristic = new HeuristicBrain();
  heuristic.reset(seed);
  const random = new RandomBrain();
  random.reset(seed);
  const rand = mulberry32(seed * 17 + 11);
  let lastFailure = "";
  // A brain that can't read the coach line (heuristic, random, or a model that failed) still
  // obeys a call: it takes one of the actions the call asks for, mostly the first.
  const obey = (order: CoachOrder | undefined) =>
    order && order.actions.length > 0
      ? Effect.succeed(order.actions[rand() < 0.7 ? 0 : Math.floor(rand() * order.actions.length)])
      : null;
  const local = (
    brain: HeuristicBrain | RandomBrain,
    ctx: DecisionContext,
    order: CoachOrder | undefined,
  ) => obey(order) ?? Effect.promise(() => brain.decide(ctx));

  return {
    kind,
    late: (order) =>
      underOrder(
        {
          action: order?.actions[0] ?? "idle",
          source: "late",
          ...(isModelBrain(kind) ? { provider: kind } : {}),
        },
        order,
      ),
    decide: (ctx, order) =>
      Effect.gen(function* () {
        if (ctx.legalActions.length === 0)
          return { action: "idle", source: "forced" } satisfies PickInfo;
        if (kind === "random") {
          const action = yield* local(random, ctx, order);
          return underOrder({ action, source: "random" }, order);
        }
        if (kind === "heuristic") {
          const action = yield* local(heuristic, ctx, order);
          return underOrder({ action, source: "heuristic" }, order);
        }
        if (!isModelBrain(kind)) return { action: "idle", source: "forced" } satisfies PickInfo;
        const model = yield* DecisionModel;
        return yield* model.decide(kind, ctx).pipe(
          Effect.map((answer) =>
            underOrder(
              {
                // Mostly the model's top option, sometimes its runner-up (seeded).
                action: samplePick(answer.probabilities, ctx.legalActions, rand),
                source: kind,
                confidence: answer.confidence,
                latencyMs: answer.latencyMs,
              },
              order,
            ),
          ),
          Effect.catchTag("DecisionError", (e) =>
            Effect.gen(function* () {
              // Say why once per distinct failure, not once a second.
              if (e.message !== lastFailure) {
                lastFailure = e.message;
                yield* Effect.logWarning(`${kind} brain fell back to the heuristic: ${e.message}`);
              }
              const action = yield* local(heuristic, ctx, order);
              return underOrder(
                { action, source: "fallback", provider: kind, note: e.message },
                order,
              );
            }),
          ),
        );
      }),
  };
}
