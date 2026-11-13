// The decision models behind decide(): Gemini Decision 1, TypeSafe Jev and Cloudflare Clef.
// Only this module knows their APIs and their keys. Every model gets the same request content
// (see @clanker/game's decision-request) and answers in the same shape.

import {
  buildDecisionRequest,
  buildSystemOneRequest,
  CLEF_MODEL,
  clefEndpoint,
  GEMINI_ENDPOINT,
  JEV_ENDPOINT,
  JEV_MODEL,
  type DecisionAnswer,
  type DecisionContext,
} from "@clanker/game";
import { Config, Context, Effect, Layer, Option, Redacted, Schema } from "effect";
import { BRAIN_MODELS, MODEL_BRAINS, type ModelBrain, type ModelStatus } from "./protocol.js";

export class DecisionError extends Schema.TaggedError<DecisionError>()("DecisionError", {
  message: Schema.String,
}) {}

const ChoiceAnswer = Schema.Struct({
  choice: Schema.String,
  probabilities: Schema.optional(Schema.Record(Schema.String, Schema.Number)),
  confidence: Schema.optional(Schema.Number),
});
const Answers = Schema.Struct({ action: ChoiceAnswer });
/** Gemini and Jev answer `{ answers }`; Cloudflare wraps it as `{ result: { answers } }`. */
const decodeAnswers = Schema.decodeUnknownEffect(Schema.Struct({ answers: Answers }));
const decodeResult = Schema.decodeUnknownEffect(
  Schema.Struct({ result: Schema.Struct({ answers: Answers }) }),
);

type Key = Redacted.Redacted<string> | undefined;

/** One model's HTTP call: where to POST, with which headers, and how to build the body. */
interface Provider {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: (ctx: DecisionContext) => unknown;
  readonly wrapped: boolean;
}

export class DecisionModel extends Context.Service<
  DecisionModel,
  {
    /** Result of the startup check for each model. */
    readonly status: Record<ModelBrain, ModelStatus>;
    readonly decide: (
      model: ModelBrain,
      ctx: DecisionContext,
    ) => Effect.Effect<DecisionAnswer, DecisionError>;
  }
>()("clanker/arena-service/DecisionModel") {
  /**
   * Keys come from the environment (GEMINI_API_KEY, TYPESAFE_API_KEY, CLOUDFLARE_API_TOKEN)
   * or, where one is unset, from a network proxy that injects the header for that host.
   * Cloudflare also needs CLOUDFLARE_ACCOUNT_ID. One small request per model at startup
   * decides which are ready; a model that isn't ready fails every pick with the reason, and
   * the fighter's brain falls back to the heuristic.
   */
  static readonly layer = Layer.effect(
    DecisionModel,
    Effect.gen(function* () {
      const secret = (name: string) =>
        Config.option(Config.Redacted(name)).pipe(Effect.map(Option.getOrUndefined));
      const geminiKey = yield* secret("GEMINI_API_KEY");
      const jevKey = yield* secret("TYPESAFE_API_KEY");
      const clefKey = yield* secret("CLOUDFLARE_API_TOKEN");
      const accountId = Option.getOrUndefined(
        yield* Config.option(Config.String("CLOUDFLARE_ACCOUNT_ID")),
      );

      const json = { "content-type": "application/json" };
      const providers: Record<ModelBrain, Provider | string> = {
        gemini: {
          url: GEMINI_ENDPOINT,
          headers: {
            ...json,
            ...(geminiKey ? { "x-goog-api-key": Redacted.value(geminiKey) } : {}),
          },
          body: buildDecisionRequest,
          wrapped: false,
        },
        jev: {
          url: JEV_ENDPOINT,
          headers: { ...json, ...bearer(jevKey) },
          body: (ctx) => buildSystemOneRequest(ctx, JEV_MODEL),
          wrapped: false,
        },
        clef: accountId
          ? {
              url: clefEndpoint(accountId),
              headers: { ...json, ...bearer(clefKey) },
              body: (ctx) => buildSystemOneRequest(ctx, CLEF_MODEL),
              wrapped: true,
            }
          : "CLOUDFLARE_ACCOUNT_ID is not set",
      };
      const keyNames: Record<ModelBrain, [string, boolean]> = {
        gemini: ["GEMINI_API_KEY", geminiKey !== undefined],
        jev: ["TYPESAFE_API_KEY", jevKey !== undefined],
        clef: ["CLOUDFLARE_API_TOKEN", clefKey !== undefined],
      };

      const probes = yield* Effect.all(
        MODEL_BRAINS.map((id) => {
          const p = providers[id];
          if (typeof p === "string")
            return Effect.succeed<ModelStatus>({ ready: false, reason: p });
          const [keyName, hasKey] = keyNames[id];
          return probe(id === "gemini" ? { ...p, url: GEMINI_MODELS, body: null } : p).pipe(
            Effect.map((problem): ModelStatus => {
              if (!problem) return { ready: true };
              const key = hasKey ? `${keyName} is set` : `${keyName} is not set`;
              return { ready: false, reason: `${problem} (${key})` };
            }),
          );
        }),
        { concurrency: "unbounded" },
      );
      const status = Object.fromEntries(MODEL_BRAINS.map((id, i) => [id, probes[i]])) as Record<
        ModelBrain,
        ModelStatus
      >;
      for (const id of MODEL_BRAINS) {
        const { name, modelId } = BRAIN_MODELS[id];
        const s = status[id];
        if (s.ready) {
          yield* Effect.log(
            `${name} (${modelId}) ready, key from ${keyNames[id][1] ? keyNames[id][0] : "the network proxy"}.`,
          );
        } else {
          yield* Effect.logWarning(
            `${name} (${modelId}) unavailable: ${s.reason}. Its fighters fall back to the heuristic.`,
          );
        }
      }

      return DecisionModel.of({
        status,
        decide: (model, ctx) => {
          const p = providers[model];
          const name = BRAIN_MODELS[model].name;
          const s = status[model];
          if (typeof p === "string" || !s.ready) {
            return Effect.fail(
              new DecisionError({
                message: `${name} unavailable: ${s.reason ?? "not configured"}`,
              }),
            );
          }
          return ask(name, p, ctx);
        },
      });
    }),
  );
}

const GEMINI_MODELS = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";

function bearer(key: Key): Record<string, string> {
  return key ? { authorization: `Bearer ${Redacted.value(key)}` } : {};
}

/** The smallest System One request there is: one yes/no choice about nothing. */
const PING = {
  state: "Startup check.",
  questions: {
    action: { type: "choice", instructions: "Pick yes.", criteria: { yes: "Yes", no: "No" } },
  },
};

/** Null when the model answers; otherwise what went wrong. Gemini has a free read-only check. */
function probe(p: Omit<Provider, "body"> & { body: Provider["body"] | null }) {
  return Effect.tryPromise({
    try: async (signal) => {
      const model = p.url === JEV_ENDPOINT ? JEV_MODEL : CLEF_MODEL;
      const res = p.body
        ? await fetch(p.url, {
            method: "POST",
            headers: p.headers,
            body: JSON.stringify({ model, ...PING }),
            signal,
          })
        : await fetch(p.url, { headers: p.headers, signal });
      return res.ok ? null : `startup request returned HTTP ${res.status}`;
    },
    catch: (cause) => `startup request failed: ${String(cause)}`,
  }).pipe(
    Effect.timeoutOrElse({
      duration: "5 seconds",
      orElse: () => Effect.succeed<string | null>("startup request timed out"),
    }),
    Effect.catch((message) => Effect.succeed<string | null>(message)),
  );
}

const ask = Effect.fn("DecisionModel.decide")(function* (
  name: string,
  p: Provider,
  ctx: DecisionContext,
) {
  const started = Date.now();
  const body = yield* Effect.tryPromise({
    try: async (signal) => {
      const res = await fetch(p.url, {
        method: "POST",
        headers: p.headers,
        body: JSON.stringify(p.body(ctx)),
        signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return (await res.json()) as unknown;
    },
    catch: (cause) => new DecisionError({ message: `${name} request failed: ${String(cause)}` }),
  });
  const decoded = p.wrapped
    ? decodeResult(body).pipe(Effect.map((r) => r.result.answers))
    : decodeAnswers(body).pipe(Effect.map((r) => r.answers));
  const answers = yield* decoded.pipe(
    Effect.mapError(
      (e) => new DecisionError({ message: `Unexpected ${name} answer: ${e.message}` }),
    ),
  );
  const action = answers.action;
  return {
    choice: action.choice,
    probabilities: action.probabilities ?? { [action.choice]: 1 },
    confidence: action.confidence,
    latencyMs: Date.now() - started,
  } satisfies DecisionAnswer;
});
