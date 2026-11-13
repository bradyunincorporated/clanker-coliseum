// The decision model behind decide(): Gemini Decision 1 today, swappable for Jev or another
// model later by providing a different layer. Only this module knows about the Gemini API.

import {
  buildDecisionRequest,
  GEMINI_ENDPOINT,
  type DecisionAnswer,
  type DecisionContext,
} from "@clanker/game";
import { Config, Context, Effect, Layer, Option, Redacted, Schema } from "effect";

export class DecisionError extends Schema.TaggedError<DecisionError>()("DecisionError", {
  message: Schema.String,
}) {}

const DecisionsResponse = Schema.Struct({
  answers: Schema.Struct({
    action: Schema.Struct({
      choice: Schema.String,
      probabilities: Schema.optional(Schema.Record(Schema.String, Schema.Number)),
      confidence: Schema.optional(Schema.Number),
    }),
  }),
});
const decodeResponse = Schema.decodeUnknownEffect(DecisionsResponse);

export class DecisionModel extends Context.Service<
  DecisionModel,
  {
    /** null when no model is configured; brains then fall back to the heuristic. */
    readonly name: "gemini-decision-1" | null;
    readonly decide: (ctx: DecisionContext) => Effect.Effect<DecisionAnswer, DecisionError>;
  }
>()("clanker/arena-service/DecisionModel") {
  /**
   * Gemini Decision 1. The key comes either from GEMINI_API_KEY or from the environment's network
   * proxy, which injects x-goog-api-key for generativelanguage.googleapis.com. A read-only models
   * request at startup decides which: if it is refused, every brain falls back to the heuristic.
   */
  static readonly layer = Layer.effect(
    DecisionModel,
    Effect.gen(function* () {
      const key = Option.getOrUndefined(yield* Config.option(Config.Redacted("GEMINI_API_KEY")));
      const probe = yield* probeGemini(key);
      if (probe !== "ok") {
        yield* Effect.logWarning(
          `Gemini Decision 1 unavailable (${probe}): every fighter uses the heuristic brain.`,
        );
        return DecisionModel.of({
          name: null,
          decide: () => Effect.fail(new DecisionError({ message: `Gemini unavailable: ${probe}` })),
        });
      }
      yield* Effect.log(
        `Gemini Decision 1 reachable (key from ${key ? "GEMINI_API_KEY" : "network proxy"}).`,
      );
      return DecisionModel.of({ name: "gemini-decision-1", decide: geminiDecide(key) });
    }),
  );
}

const MODELS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";

function keyHeader(key: Redacted.Redacted<string> | undefined): Record<string, string> {
  return key ? { "x-goog-api-key": Redacted.value(key) } : {};
}

function probeGemini(key: Redacted.Redacted<string> | undefined) {
  return Effect.tryPromise({
    try: async (signal) => {
      const res = await fetch(MODELS_ENDPOINT, { headers: keyHeader(key), signal });
      return res.ok ? "ok" : `models request returned HTTP ${res.status}`;
    },
    catch: (cause) => `models request failed: ${String(cause)}`,
  }).pipe(
    Effect.timeoutOrElse({
      duration: "5 seconds",
      orElse: () => Effect.succeed("models request timed out"),
    }),
    Effect.catch((message) => Effect.succeed(message)),
  );
}

function geminiDecide(key: Redacted.Redacted<string> | undefined) {
  return Effect.fn("DecisionModel.decide")(function* (ctx: DecisionContext) {
    const started = Date.now();
    const body = yield* Effect.tryPromise({
      try: async (signal) => {
        const res = await fetch(GEMINI_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json", ...keyHeader(key) },
          body: JSON.stringify(buildDecisionRequest(ctx)),
          signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
        return (await res.json()) as unknown;
      },
      catch: (cause) => new DecisionError({ message: `Gemini request failed: ${String(cause)}` }),
    });
    const answer = yield* decodeResponse(body).pipe(
      Effect.mapError(
        (e) => new DecisionError({ message: `Unexpected Gemini answer: ${e.message}` }),
      ),
    );
    const action = answer.answers.action;
    return {
      choice: action.choice,
      probabilities: action.probabilities ?? { [action.choice]: 1 },
      confidence: action.confidence,
      latencyMs: Date.now() - started,
    } satisfies DecisionAnswer;
  });
}
