// Coaching: what a player can tell their fighter, and how each order reaches the decision.
// Pure. Two kinds of order:
//   - a game plan, picked before the match, that stands for the whole fight;
//   - a call, tapped during the fight, that lasts CALL_TICKS decisions and then expires.
// Each order is a fixed sentence (a preset), never the player's own text. The sentence is
// appended to the decision request as a coach line; `actions` is what the order asks for,
// used to mark whether the fighter followed it and as the pick when its model has no answer.
// Wording comes from live probes of Gemini Decision 1 (2026-11-13): a blunt order that never
// expires takes the fighter over, so game plans are worded softly and calls are short-lived.
// The models read HP and the clock well but not distance, so orders that depend on reach
// check it here and say so in plain words.

import type { ActionId, MoveSlot } from "../sim/types.js";
import type { DecisionContext, MoveView } from "./provider.js";

/** A call shapes this many decisions, then the fighter can't be called for COOLDOWN_TICKS more. */
export const CALL_TICKS = 5;
export const CALL_COOLDOWN_TICKS = 3;
/** Calls offered per side at a time. They stay put for OFFER_TICKS so a button never moves under a finger. */
export const CALLS_OFFERED = 3;
export const OFFER_TICKS = 3;

export type GamePlanId = "rush" | "distance" | "counter" | "dealers";

export interface GamePlan {
  id: GamePlanId;
  label: string;
  /** The standing sentence, or null for "let the model fight its own fight". */
  directive: string | null;
}

export const GAME_PLANS: Record<GamePlanId, GamePlan> = {
  rush: {
    id: "rush",
    label: "Rush in",
    directive:
      "Stay a little closer and attack a little more often than you normally would, but still guard when it is clearly needed.",
  },
  distance: {
    id: "distance",
    label: "Keep your distance",
    directive:
      "Keep a little more distance than usual, but keep fighting: attack whenever they are in reach.",
  },
  counter: {
    id: "counter",
    label: "Wait and counter",
    directive: "Block a little more than you normally would, and keep attacking when it is safe.",
  },
  dealers: { id: "dealers", label: "Dealer's choice", directive: null },
};
export const GAME_PLAN_IDS = Object.keys(GAME_PLANS) as GamePlanId[];
export const DEFAULT_GAME_PLAN: GamePlanId = "dealers";

export const isGamePlanId = (v: unknown): v is GamePlanId =>
  typeof v === "string" && v in GAME_PLANS;

export type CallFamily = "guard" | "pressure" | "spacing" | "clock";

/** One preset call, made concrete for a fighter in a given state. */
export interface CoachCall {
  /** Stable preset id, e.g. "guard-up" or "use-move3". */
  presetId: string;
  family: CallFamily;
  /** Exactly what the coach shouts, e.g. "Watch their Bedrock Quake!". */
  message: string;
  /** The sentence the decision model reads this tick. */
  directive: string;
  /** Legal actions that count as following the call this tick, best first. May be empty. */
  actions: ActionId[];
  /** How well the call fits the moment; only used to choose which calls to offer. */
  relevance: number;
}

const GUARD: ActionId[] = ["block", "crouchBlock"];

function distance(ctx: DecisionContext): number {
  return Math.abs(ctx.opponent.state.x - ctx.self.state.x);
}

/** Can this move connect from where the fighters stand? Same reach rule as the heuristic brain. */
function reaches(ctx: DecisionContext, m: MoveView): boolean {
  const travel = m.lunge ? m.lunge * (m.startup + m.active / 2) : 0;
  return distance(ctx) <= m.hitbox.x + m.hitbox.w + ctx.opponent.stats.pushWidth + travel;
}

function hpFraction(f: { hp: number; maxHp: number }): number {
  return f.maxHp > 0 ? f.hp / f.maxHp : 0;
}

/** Every call this fighter could be given right now, each with its text for this exact state. */
export function callLibrary(ctx: DecisionContext): CoachCall[] {
  const legal = new Set(ctx.legalActions);
  const only = (actions: ActionId[]) => actions.filter((a) => legal.has(a));
  const me = ctx.self;
  const foe = ctx.opponent;
  const inReach = me.moves.filter((m) => reaches(ctx, m));
  const best = (moves: MoveView[]) =>
    [...moves].sort((a, b) => b.damage * b.typeMultiplier - a.damage * a.typeMultiplier);
  const attackOrApproach = (moves: MoveView[]): ActionId[] =>
    moves.length ? best(moves).map((m) => m.slot as MoveSlot) : ["walkForward", "jumpForward"];
  const anyReach = inReach.length > 0;
  const reachWords = anyReach
    ? `Right now the opponent is within reach of ${inReach.map((m) => m.name).join(", ")}.`
    : "Right now the opponent is out of reach of every attack you have.";

  const recent = ctx.recentEvents;
  const mine = recent.filter((e) => e.side === ctx.side);
  const theirs = recent.filter((e) => e.side !== undefined && e.side !== ctx.side);
  const hitsTaken = theirs.filter((e) => e.type === "hit").length;
  const myWhiffs = mine.filter((e) => e.type === "whiff").length;
  const myBlocked = mine.filter((e) => e.type === "block").length;
  const landedOnMe = (name: string) => theirs.some((e) => e.type === "hit" && e.move === name);
  const myHp = hpFraction(me);
  const foeHp = hpFraction(foe);
  const ahead = myHp > foeHp;
  const late = ctx.ticksRemaining <= 10;
  const d = distance(ctx);
  const far = !anyReach;

  const calls: CoachCall[] = [];

  calls.push({
    presetId: "guard-up",
    family: "guard",
    message: "Guard up!",
    directive: "Block more.",
    actions: only(GUARD),
    relevance: 2 + hitsTaken * 2 + (myHp < 0.35 ? 1 : 0),
  });
  const low = foe.moves.find((m) => m.level === "low");
  if (low) {
    calls.push({
      presetId: "watch-low",
      family: "guard",
      message: `Watch their ${low.name}!`,
      directive: `Watch for their low move, ${low.name}. Crouch-block when they are in range.`,
      actions: only(["crouchBlock"]),
      relevance: 1 + (landedOnMe(low.name) ? 5 : 0),
    });
  }
  const overhead = foe.moves.find((m) => m.level === "overhead");
  if (overhead) {
    calls.push({
      presetId: "watch-overhead",
      family: "guard",
      message: `Watch their ${overhead.name}!`,
      directive: `Watch for their overhead, ${overhead.name}. Use the standing block when they are in range, not the crouching one.`,
      actions: only(["block"]),
      relevance: 1 + (landedOnMe(overhead.name) ? 5 : 0),
    });
  }

  calls.push({
    presetId: "press",
    family: "pressure",
    message: "Press the attack!",
    directive: `Go on the attack and do not block. ${reachWords} ${anyReach ? "Hit them." : "Close in first, then hit them."}`,
    actions: only(attackOrApproach(inReach)),
    relevance: 2 + myBlocked + (hitsTaken === 0 ? 1 : 0),
  });
  if (foeHp <= 0.25) {
    calls.push({
      presetId: "finish",
      family: "pressure",
      message: "Finish them!",
      directive: `The opponent is nearly out. Go all-in. ${reachWords} ${anyReach ? "Attack now." : "Close in and attack."}`,
      actions: only(attackOrApproach(inReach)),
      relevance: 7,
    });
  }
  for (const m of me.moves) {
    const hits = reaches(ctx, m);
    calls.push({
      presetId: `use-${m.slot}`,
      family: "pressure",
      message: `Use ${m.name}!`,
      directive: hits
        ? `Use ${m.name}. The opponent is within its reach right now.`
        : `Use ${m.name}, but the opponent is out of its reach right now: walk forward until it reaches.`,
      actions: only(hits ? [m.slot as MoveSlot] : ["walkForward"]),
      // The strongest move against this opponent is the one worth offering.
      relevance: 0.5 + (m.damage * m.typeMultiplier) / 10 + (m.knockdown ? 0.3 : 0),
    });
  }

  calls.push({
    presetId: "back-off",
    family: "spacing",
    message: "Back off!",
    directive: "Back away and get out of their reach for a few seconds.",
    actions: only(["walkBack"]),
    relevance: 1 + (far ? -1 : hitsTaken),
  });
  calls.push({
    presetId: "close-in",
    family: "spacing",
    message: "Close the gap!",
    directive: "Get close to the opponent quickly.",
    actions: only(["walkForward", "jumpForward"]),
    relevance: far ? 3 + Math.min(3, d / 300) : 0,
  });
  calls.push({
    presetId: "no-whiff",
    family: "spacing",
    message: "Don't swing from range!",
    directive: anyReach
      ? `Only attack when the move can reach. ${reachWords} Those moves are fine to use.`
      : `Only attack when the move can reach. ${reachWords} Do not attack this tick: move closer or guard.`,
    actions: only(anyReach ? inReach.map((m) => m.slot as MoveSlot) : ["walkForward", ...GUARD]),
    relevance: 1 + myWhiffs * 3,
  });

  if (late && ahead) {
    calls.push({
      presetId: "run-clock",
      family: "clock",
      message: "Run the clock!",
      directive:
        "You are ahead on HP and time is short. Stop attacking: stay away and guard until time runs out.",
      actions: only(["walkBack", ...GUARD]),
      relevance: 8,
    });
  }
  if (late && !ahead) {
    calls.push({
      presetId: "all-in",
      family: "clock",
      message: "All in!",
      directive: `You are not ahead on HP and time is short. Attack with everything and do not block. ${reachWords}`,
      actions: only(attackOrApproach(inReach)),
      relevance: 8,
    });
  }
  return calls;
}

/** The call with this preset id for this state, if the fighter can be given it. */
export function findCall(ctx: DecisionContext, presetId: string): CoachCall | undefined {
  return callLibrary(ctx).find((c) => c.presetId === presetId);
}

/**
 * The calls to offer: the best fit from each family first, so the choices always differ in
 * intent and picking one is a read of the fight, then the best of the rest.
 */
export function offerCalls(ctx: DecisionContext, count = CALLS_OFFERED): CoachCall[] {
  const ranked = callLibrary(ctx).sort((a, b) => b.relevance - a.relevance);
  const picked: CoachCall[] = [];
  for (const call of ranked) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.family === call.family)) picked.push(call);
  }
  for (const call of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(call)) picked.push(call);
  }
  return picked;
}

/** The coach line for one decision: the active call's sentence, or else the game plan's. */
export function coachLine(plan: GamePlanId, call: CoachCall | undefined): string | undefined {
  return call?.directive ?? GAME_PLANS[plan].directive ?? undefined;
}
