// Server-side matches. Each match is one fiber that resolves a tick every TICK_MS and
// broadcasts it; both fighters' next picks are decided while the current tick plays back.

import {
  buildContext,
  createMatch,
  DEFAULT_CONFIG,
  FIGHTERS,
  getFighter,
  resolveTick,
  TICK_MS,
  type FighterDef,
  type FightEvent,
  type MatchState,
} from "@clanker/game";
import { Context, Duration, Effect, Layer, Schema } from "effect";
import { DecisionModel } from "./decision-model.js";
import { makeBrain, type FighterBrain } from "./decide.js";
import {
  BRAIN_KINDS,
  type ArenaMessage,
  type MatchSummary,
  type PickInfo,
  type StartMatchRequest,
  type TickMessage,
} from "./protocol.js";

/** Picks that arrive later than this before the tick boundary count as late (the fighter idles). */
const DECISION_MARGIN_MS = 60;
const INTRO_MS = 2000;
const KEEP_FINISHED = 20;

export class MatchSetupError extends Schema.TaggedError<MatchSetupError>()("MatchSetupError", {
  message: Schema.String,
}) {}

type Listener = (message: ArenaMessage) => void;

interface LiveMatch {
  summary: MatchSummary;
  defs: [FighterDef, FighterDef];
  state: MatchState;
  last: TickMessage | null;
  events: FightEvent[];
  listeners: Set<Listener>;
}

export interface MatchTiming {
  tickMs: number;
  introMs: number;
}

export class Matches extends Context.Service<
  Matches,
  {
    readonly start: (req: StartMatchRequest) => Effect.Effect<MatchSummary, MatchSetupError>;
    readonly list: () => MatchSummary[];
    /** Registers a watcher. Sends `hello` straight away. Returns the unsubscribe, or null if no such match. */
    readonly watch: (id: string, listener: Listener) => (() => void) | null;
  }
>()("clanker/arena-service/Matches") {
  static readonly layer = (timing: MatchTiming = { tickMs: TICK_MS, introMs: INTRO_MS }) =>
    Layer.effect(
      Matches,
      Effect.gen(function* () {
        const model = yield* DecisionModel;
        const matches = new Map<string, LiveMatch>();

        const broadcast = (m: LiveMatch, message: ArenaMessage) => {
          for (const listener of m.listeners) listener(message);
        };

        const hello = (m: LiveMatch): ArenaMessage => ({
          type: "hello",
          match: m.summary,
          state: m.state,
          last: m.last,
          events: m.events,
        });

        const decideBoth = (
          m: LiveMatch,
          brains: [FighterBrain, FighterBrain],
          budgetMs: number,
        ) => {
          const recent = m.events.filter((e) => e.tick >= m.state.tick - 3);
          const one = (side: 0 | 1) =>
            brains[side].decide(buildContext(m.state, side, m.defs, recent)).pipe(
              Effect.timeoutOrElse({
                duration: Duration.millis(Math.max(0, budgetMs - DECISION_MARGIN_MS)),
                orElse: () => Effect.succeed<PickInfo>({ action: "idle", source: "late" }),
              }),
            );
          return Effect.all([one(0), one(1)], { concurrency: 2 }).pipe(
            Effect.provideService(DecisionModel, model),
          );
        };

        /** Decide during `waitMs` of playback; resolve exactly when it's over. */
        const nextPicks = (m: LiveMatch, brains: [FighterBrain, FighterBrain], waitMs: number) =>
          Effect.all([decideBoth(m, brains, waitMs), Effect.sleep(Duration.millis(waitMs))], {
            concurrency: 2,
          }).pipe(Effect.map(([picks]) => picks));

        const run = (m: LiveMatch) =>
          Effect.gen(function* () {
            const { seed, brains: kinds } = m.summary;
            const brains: [FighterBrain, FighterBrain] = [
              makeBrain(kinds[0], seed),
              makeBrain(kinds[1], seed + 1),
            ];
            let picks = yield* nextPicks(m, brains, m.summary.introMs);
            while (!m.state.over) {
              const result = resolveTick(
                m.state,
                [pickAction(picks[0]), pickAction(picks[1])],
                getFighter,
              );
              const resolved: [PickInfo, PickInfo] = [
                markForced(picks[0], result.actions[0]),
                markForced(picks[1], result.actions[1]),
              ];
              const message: TickMessage = { type: "tick", result, picks: resolved };
              m.state = result.state;
              m.last = message;
              m.events.push(...result.events);
              broadcast(m, message);
              if (m.state.over) break;
              picks = yield* nextPicks(m, brains, m.summary.tickMs);
            }
            yield* Effect.log(`match ${m.summary.id} over: winner ${String(m.state.winner)}`);
          });

        const prune = () => {
          const finished = [...matches.values()].filter((m) => m.state.over);
          for (const m of finished.slice(0, Math.max(0, finished.length - KEEP_FINISHED))) {
            matches.delete(m.summary.id);
          }
        };

        return Matches.of({
          start: (req) =>
            Effect.gen(function* () {
              const fighters = req.fighters;
              if (
                !Array.isArray(fighters) ||
                fighters.length !== 2 ||
                !fighters.every((f) => f in FIGHTERS)
              ) {
                return yield* new MatchSetupError({
                  message: `fighters must be two of: ${Object.keys(FIGHTERS).join(", ")}`,
                });
              }
              const brains = req.brains ?? ["gemini", "gemini"];
              if (brains.length !== 2 || !brains.every((b) => BRAIN_KINDS.includes(b))) {
                return yield* new MatchSetupError({
                  message: `brains must be two of: ${BRAIN_KINDS.join(", ")}`,
                });
              }
              const seed = Number.isInteger(req.seed)
                ? (req.seed as number)
                : Math.floor(Math.random() * 1e6);
              const defs: [FighterDef, FighterDef] = [
                getFighter(fighters[0]),
                getFighter(fighters[1]),
              ];
              const summary: MatchSummary = {
                id: crypto.randomUUID().slice(0, 8),
                fighters: [fighters[0], fighters[1]],
                brains: [brains[0], brains[1]],
                seed,
                createdAt: Date.now(),
                tickMs: timing.tickMs,
                introMs: timing.introMs,
              };
              const m: LiveMatch = {
                summary,
                defs,
                state: createMatch(defs, DEFAULT_CONFIG),
                last: null,
                events: [],
                listeners: new Set(),
              };
              prune();
              matches.set(summary.id, m);
              yield* Effect.forkDetach(run(m));
              return summary;
            }),
          list: () => [...matches.values()].map((m) => m.summary).reverse(),
          watch: (id, listener) => {
            const m = matches.get(id);
            if (!m) return null;
            m.listeners.add(listener);
            listener(hello(m));
            return () => m.listeners.delete(listener);
          },
        });
      }),
    );
}

function pickAction(p: PickInfo) {
  return p.action === "knockdown" || p.action === "stagger" ? "idle" : p.action;
}

function markForced(p: PickInfo, ran: PickInfo["action"]): PickInfo {
  return ran === p.action ? p : { ...p, action: ran, source: "forced" };
}
