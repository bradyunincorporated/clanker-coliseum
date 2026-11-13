// Arena service: runs matches on the server and streams them to browsers.
// GET  /api/health                  which decision models answered the startup check
// GET  /api/matches                 recent matches
// POST /api/matches                 start one: { fighters: [id, id], brains?: [kind, kind], seed? }
// POST /api/matches/:id/coach       a coach's call: { side: 0 | 1, presetId }
// GET  /api/matches/:id/events      server-sent events: hello, one tick per second, and a
//                                   coach message whenever a call is accepted

import { Config, Effect, Layer, ManagedRuntime } from "effect";
import { DecisionModel } from "./decision-model.js";
import { Matches } from "./matches.js";
import type {
  ArenaMessage,
  CoachCallRequest,
  CoachCallResponse,
  HealthResponse,
  StartMatchRequest,
} from "./protocol.js";

const AppLayer = Matches.layer().pipe(Layer.provideMerge(DecisionModel.layer));

export async function serve(port: number) {
  const runtime = ManagedRuntime.make(AppLayer);
  const [matches, model] = await runtime.runPromise(
    Effect.gen(function* () {
      return [yield* Matches, yield* DecisionModel] as const;
    }),
  );
  const encoder = new TextEncoder();

  const server = Bun.serve({
    port,
    hostname: "127.0.0.1",
    // Event streams stay open for the whole match.
    idleTimeout: 0,
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      if (req.method === "GET" && path === "/api/health") {
        return Response.json({ ok: true, models: model.status } satisfies HealthResponse);
      }
      if (path === "/api/matches" && req.method === "GET") return Response.json(matches.list());
      if (path === "/api/matches" && req.method === "POST") {
        const body = (await req.json().catch(() => null)) as StartMatchRequest | null;
        if (!body) return Response.json({ error: "Body must be JSON" }, { status: 400 });
        const result = await runtime.runPromise(
          matches.start(body).pipe(
            Effect.map((summary) => Response.json(summary, { status: 201 })),
            Effect.catchTag("MatchSetupError", (e) =>
              Effect.succeed(Response.json({ error: e.message }, { status: 400 })),
            ),
          ),
        );
        return result;
      }
      const report = /^\/api\/matches\/([\w-]+)\/report$/.exec(path);
      if (report && req.method === "GET") {
        const data = matches.report(report[1]);
        return Response.json(data ?? { error: "This match report has expired." }, {
          status: data ? 200 : 404,
          headers: { "cache-control": "no-store" },
        });
      }
      const coach = /^\/api\/matches\/([\w-]+)\/coach$/.exec(path);
      if (coach && req.method === "POST") {
        const body = (await req.json().catch(() => null)) as CoachCallRequest | null;
        if (!body) return Response.json({ error: "Body must be JSON" }, { status: 400 });
        return runtime.runPromise(
          matches.coach(coach[1], body).pipe(
            Effect.map((call) =>
              Response.json({ ok: true, call } satisfies CoachCallResponse, { status: 201 }),
            ),
            Effect.catchTag("CoachCallError", (e) =>
              Effect.succeed(
                Response.json(
                  {
                    ok: false,
                    error: e.message,
                    readyTick: e.readyTick,
                  } satisfies CoachCallResponse,
                  { status: e.status },
                ),
              ),
            ),
          ),
        );
      }
      const events = /^\/api\/matches\/([\w-]+)\/events$/.exec(path);
      if (events && req.method === "GET") {
        let stop: (() => void) | null = null;
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const send = (message: ArenaMessage) => {
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              } catch {
                stop?.();
              }
            };
            stop = matches.watch(events[1], send);
            if (!stop) {
              controller.enqueue(encoder.encode(`event: missing\ndata: {}\n\n`));
              controller.close();
            }
          },
          cancel() {
            stop?.();
          },
        });
        req.signal.addEventListener("abort", () => stop?.());
        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-store",
            connection: "keep-alive",
          },
        });
      }
      return Response.json({ error: "Not found" }, { status: 404 });
    },
  });
  await runtime.runPromise(
    Effect.log(
      `Arena service on http://${server.hostname}:${server.port} (models ready: ${
        Object.entries(model.status)
          .filter(([, s]) => s.ready)
          .map(([id]) => id)
          .join(", ") || "none, heuristic only"
      })`,
    ),
  );
  return { server, runtime };
}

if (import.meta.main) {
  const port = await Effect.runPromise(
    Effect.gen(function* () {
      return yield* Config.Port("ARENA_PORT").pipe(Config.withDefault(8787));
    }),
  );
  await serve(port);
}
