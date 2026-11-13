// Server-side matches. Each match is one fiber that resolves a tick every TICK_MS and
// broadcasts it; both fighters' next picks are decided while the current tick plays back.

import {
  buildContext,
  CALL_COOLDOWN_TICKS,
  CALL_TICKS,
  coachLine,
  createMatch,
  DEFAULT_CONFIG,
  DEFAULT_GAME_PLAN,
  FIGHTERS,
  findCall,
  getFighter,
  isGamePlanId,
  offerCalls,
  OFFER_TICKS,
  resolveTick,
  TICK_MS,
  type CoachCall,
  type DecisionContext,
  type FighterDef,
  type FightEvent,
  type GamePlanId,
  type MatchState,
} from "@clanker/game";
import { Context, Duration, Effect, Layer, Schema } from "effect";
import { DecisionModel } from "./decision-model.js";
import { makeBrain, type CoachOrder, type FighterBrain } from "./decide.js";
import {
  BRAIN_KINDS,
  type AcceptedCall,
  type ArenaMessage,
  type CoachCallRequest,
  type Coaching,
  type MatchSummary,
  type MatchReport,
  type PickInfo,
  type SideCoaching,
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

/** Why a coach's call was turned down. `status` is the HTTP status to answer with. */
export class CoachCallError extends Schema.TaggedError<CoachCallError>()("CoachCallError", {
  message: Schema.String,
  status: Schema.Number,
  readyTick: Schema.optional(Schema.Number),
}) {}

type Listener = (message: ArenaMessage) => void;

/** One side's coaching inside a live match. */
interface SideCoach {
  plan: GamePlanId;
  /** Calls on offer, and the tick they were chosen at. */
  options: CoachCall[];
  offeredTick: number;
  /** The newest accepted call; it stops shaping picks at its untilTick. */
  call: AcceptedCall | null;
}

interface LiveMatch {
  summary: MatchSummary;
  defs: [FighterDef, FighterDef];
  state: MatchState;
  last: TickMessage | null;
  decisions: MatchReport["decisions"];
  events: FightEvent[];
  listeners: Set<Listener>;
  coach: [SideCoach, SideCoach];
  calls: AcceptedCall[];
}

const TRAINER_ID = /^[\w-]{1,40}$/;

export interface MatchTiming {
  tickMs: number;
  introMs: number;
}

export class Matches extends Context.Service<
  Matches,
  {
    readonly start: (req: StartMatchRequest) => Effect.Effect<MatchSummary, MatchSetupError>;
    readonly list: () => MatchSummary[];
    readonly report: (id: string) => MatchReport | null;
    /**
     * A coach's call for one side. Accepted only for a live match, a preset that side can be
     * given right now, and a side that is off cooldown. Every watcher hears an accepted call.
     */
    readonly coach: (
      id: string,
      req: CoachCallRequest,
    ) => Effect.Effect<AcceptedCall, CoachCallError>;
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

        /** What one side's fighter sees for its next pick, before any coach line. */
        const contextFor = (m: LiveMatch, side: 0 | 1): DecisionContext =>
          buildContext(
            m.state,
            side,
            m.defs,
            m.events.filter((e) => e.tick >= m.state.tick - 3),
          );

        /** Choose the calls on offer. They hold for OFFER_TICKS so buttons don't shuffle. */
        const refreshOffers = (m: LiveMatch) => {
          for (const side of [0, 1] as const) {
            const c = m.coach[side];
            if (c.options.length > 0 && m.state.tick - c.offeredTick < OFFER_TICKS) continue;
            c.options = offerCalls(contextFor(m, side));
            c.offeredTick = m.state.tick;
          }
        };

        const coaching = (m: LiveMatch): Coaching => {
          const one = (side: 0 | 1): SideCoaching => {
            const c = m.coach[side];
            return {
              plan: c.plan,
              options: c.options.map(({ presetId, family, message }) => ({
                presetId,
                family,
                message,
              })),
              active: c.call && m.state.tick < c.call.untilTick ? c.call : null,
              readyTick: c.call?.readyTick ?? 0,
            };
          };
          return [one(0), one(1)];
        };

        const hello = (m: LiveMatch): ArenaMessage => ({
          type: "hello",
          match: m.summary,
          state: m.state,
          last: m.last,
          events: m.events,
          coaching: coaching(m),
          calls: m.calls,
        });

        const decideBoth = (
          m: LiveMatch,
          brains: [FighterBrain, FighterBrain],
          budgetMs: number,
        ) => {
          const one = (side: 0 | 1) => {
            const raw = contextFor(m, side);
            const c = m.coach[side];
            // A call shapes the picks for its ticks; otherwise the game plan stands.
            const inForce =
              c.call && raw.tick >= c.call.fromTick && raw.tick < c.call.untilTick ? c.call : null;
            const call = inForce ? findCall(raw, inForce.presetId) : undefined;
            const ctx: DecisionContext = { ...raw, coaching: coachLine(c.plan, call) };
            const order: CoachOrder | undefined =
              inForce && call ? { callId: inForce.callId, actions: call.actions } : undefined;
            return brains[side].decide(ctx, order).pipe(
              Effect.timeoutOrElse({
                duration: Duration.millis(Math.max(0, budgetMs - DECISION_MARGIN_MS)),
                // Every brain gets the same budget; a late one is named in the pick.
                orElse: () => Effect.succeed<PickInfo>(brains[side].late(order)),
              }),
            );
          };
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
              m.state = result.state;
              m.events.push(...result.events);
              refreshOffers(m);
              const message: TickMessage = {
                type: "tick",
                result,
                picks: resolved,
                coaching: coaching(m),
              };
              m.last = message;
              m.decisions.push({ tick: result.state.tick, picks: resolved });
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
              const plan = (side: 0 | 1): GamePlanId => {
                const p = req.plans?.[side];
                return isGamePlanId(p) ? p : DEFAULT_GAME_PLAN;
              };
              const trainer = (side: 0 | 1): string | null => {
                const t = req.trainers?.[side];
                return typeof t === "string" && TRAINER_ID.test(t) ? t : null;
              };
              const summary: MatchSummary = {
                id: crypto.randomUUID().slice(0, 8),
                fighters: [fighters[0], fighters[1]],
                brains: [brains[0], brains[1]],
                seed,
                plans: [plan(0), plan(1)],
                trainers: [trainer(0), trainer(1)],
                createdAt: Date.now(),
                tickMs: timing.tickMs,
                introMs: timing.introMs,
              };
              const m: LiveMatch = {
                summary,
                defs,
                state: createMatch(defs, DEFAULT_CONFIG),
                last: null,
                decisions: [],
                events: [],
                listeners: new Set(),
                coach: [
                  { plan: summary.plans[0], options: [], offeredTick: 0, call: null },
                  { plan: summary.plans[1], options: [], offeredTick: 0, call: null },
                ],
                calls: [],
              };
              refreshOffers(m);
              prune();
              matches.set(summary.id, m);
              yield* Effect.forkDetach(run(m));
              return summary;
            }),
          report: (id) => {
            const m = matches.get(id);
            return m ? { match: m.summary, over: m.state.over, decisions: m.decisions } : null;
          },
          list: () => [...matches.values()].map((m) => m.summary).reverse(),
          coach: (id, req) =>
            Effect.gen(function* () {
              const refuse = (status: number, message: string, readyTick?: number) =>
                new CoachCallError({ status, message, readyTick });
              const m = matches.get(id);
              if (!m) return yield* refuse(404, "No such match.");
              const side = req?.side;
              if (side !== 0 && side !== 1) return yield* refuse(400, "side must be 0 or 1.");
              if (typeof req.presetId !== "string")
                return yield* refuse(400, "presetId must be a string.");
              if (m.state.over) return yield* refuse(409, "The match is over.");
              const c = m.coach[side];
              const tick = m.state.tick;
              if (c.call && tick < c.call.readyTick) {
                return yield* refuse(
                  409,
                  `This side can call again at tick ${c.call.readyTick}.`,
                  c.call.readyTick,
                );
              }
              const preset = findCall(contextFor(m, side), req.presetId);
              if (!preset) return yield* refuse(409, "That call isn't available right now.");
              // The pick for the tick now playing has already been asked for, so the call
              // starts with the one after.
              const fromTick = tick + 1;
              const untilTick = fromTick + CALL_TICKS;
              const call: AcceptedCall = {
                callId: m.calls.length + 1,
                side,
                presetId: preset.presetId,
                message: preset.message,
                acceptedTick: tick,
                fromTick,
                untilTick,
                readyTick: untilTick + CALL_COOLDOWN_TICKS,
              };
              c.call = call;
              m.calls.push(call);
              broadcast(m, { type: "coach", call, coaching: coaching(m) });
              return call;
            }),
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
