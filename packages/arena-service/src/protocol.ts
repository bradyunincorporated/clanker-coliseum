// Wire format between the arena service and any browser watching a match.
// Plain JSON over server-sent events: one `hello` on connect, then one `tick` per second.

import type {
  ActionId,
  CallFamily,
  FightEvent,
  ForcedAction,
  GamePlanId,
  MatchState,
  TickResult,
} from "@clanker/game";

/** The decision models a fighter can use. Each fighter picks its own. */
export type ModelBrain = "gemini" | "jev" | "clef";
export const MODEL_BRAINS: readonly ModelBrain[] = ["gemini", "jev", "clef"];

/** Official names, kept in one place so the HUD, the selector and the logs agree. */
export const BRAIN_MODELS: Record<ModelBrain, { company: string; name: string; modelId: string }> =
  {
    gemini: { company: "Google", name: "Gemini Decision 1", modelId: "gemini-decision-1" },
    jev: { company: "TypeSafe", name: "Jev", modelId: "jev-1.14.0" },
    clef: { company: "Cloudflare", name: "Clef", modelId: "@cf/cloudflare/clef" },
  };

/**
 * Who picks a fighter's actions. A model brain that errors falls back to the heuristic for
 * that tick; one that misses the deadline idles (or obeys its coach's call). Both show in
 * the pick's `source`.
 */
export type BrainKind = ModelBrain | "heuristic" | "random";
export const BRAIN_KINDS: readonly BrainKind[] = [...MODEL_BRAINS, "heuristic", "random"];

export const isModelBrain = (kind: BrainKind): kind is ModelBrain =>
  (MODEL_BRAINS as readonly BrainKind[]).includes(kind);

export interface MatchSetup {
  fighters: [string, string];
  brains: [BrainKind, BrainKind];
  seed: number;
  /** Each side's standing game plan, picked before the match. */
  plans: [GamePlanId, GamePlanId];
  /**
   * Each side's trainer, picked at character select. An opaque id the service only carries:
   * it never looks it up. null when the side picked none.
   */
  trainers: [string | null, string | null];
}

export interface MatchSummary extends MatchSetup {
  id: string;
  createdAt: number;
  tickMs: number;
  /** Delay before the first tick resolves, so watchers see the intro. */
  introMs: number;
}

/** How one fighter's action for a tick was chosen. */
export interface PickInfo {
  action: ActionId | ForcedAction;
  /**
   * gemini / jev / clef: that model answered in time.
   * heuristic / random: that brain picked.
   * fallback: the fighter's model failed, so the heuristic picked; `provider` says which
   *   model and `note` says why.
   * late: no answer before the tick boundary; `provider` says who. The fighter idled, or
   *   did what its coach's call asked for if one was in force.
   * forced: the sim overrode the pick (knockdown, stagger).
   */
  source: ModelBrain | "heuristic" | "random" | "fallback" | "late" | "forced";
  /** The model this fighter asked, when the pick did not come from it (fallback, late). */
  provider?: ModelBrain;
  confidence?: number;
  latencyMs?: number;
  note?: string;
  /** The coach's call in force when this pick was made (its callId), if any. */
  call?: number;
  /** With `call`: whether the action is one the call asked for. */
  followed?: boolean;
}

/** One call a side can make right now. `message` is exactly what the coach shouts. */
export interface CallOption {
  presetId: string;
  family: CallFamily;
  message: string;
}

/**
 * A call the service accepted. `callId` is unique within the match and counts up across
 * both sides, so making the same call twice gives two different ids.
 */
export interface AcceptedCall {
  callId: number;
  side: 0 | 1;
  presetId: string;
  /** The exact call text, e.g. "Watch their Bedrock Quake!". */
  message: string;
  /** state.tick when the service accepted it. */
  acceptedTick: number;
  /** It shapes the picks for ticks fromTick up to, not including, untilTick. */
  fromTick: number;
  untilTick: number;
  /** The first tick at which this side can make another call. */
  readyTick: number;
}

/** One side's coaching as of a tick. */
export interface SideCoaching {
  plan: GamePlanId;
  /** The calls on offer. They hold still for a few ticks at a time. */
  options: CallOption[];
  /** The call in force or about to be, null once it has run out. */
  active: AcceptedCall | null;
  /** The first tick at which a new call will be accepted (0 = now). */
  readyTick: number;
}

export type Coaching = [SideCoaching, SideCoaching];

export type ArenaMessage =
  | {
      type: "hello";
      match: MatchSummary;
      /** State at the end of the newest resolved tick (or the opening state). */
      state: MatchState;
      /** Newest resolved tick, so a late watcher can start playing straight away. */
      last: TickMessage | null;
      events: FightEvent[];
      coaching: Coaching;
      /** Every call accepted so far, oldest first. */
      calls: AcceptedCall[];
    }
  | TickMessage
  | CoachMessage;

export interface TickMessage {
  type: "tick";
  result: TickResult;
  picks: [PickInfo, PickInfo];
  /** Coaching as of the end of this tick: what each side can call next. */
  coaching: Coaching;
}

/** Sent to every watcher the moment the service accepts a call. */
export interface CoachMessage {
  type: "coach";
  call: AcceptedCall;
  coaching: Coaching;
}

export interface StartMatchRequest {
  fighters: [string, string];
  brains?: [BrainKind, BrainKind];
  seed?: number;
  /** Game plans; a missing or unknown one is "dealers" (no standing order). */
  plans?: [GamePlanId | null | undefined, GamePlanId | null | undefined];
  /** Trainer ids: letters, digits, "-" and "_", at most 40. Anything else is dropped. */
  trainers?: [string | null | undefined, string | null | undefined];
}

/** POST /api/matches/:id/coach */
export interface CoachCallRequest {
  side: 0 | 1;
  presetId: string;
}

export type CoachCallResponse =
  | { ok: true; call: AcceptedCall }
  | { ok: false; error: string; readyTick?: number };

/** Whether a model answered the startup check, and if not, why (never contains a key). */
export interface ModelStatus {
  ready: boolean;
  reason?: string;
}

export interface HealthResponse {
  ok: true;
  models: Record<ModelBrain, ModelStatus>;
}

/** Compact decision history retained for the match's Backstage screen. */
export interface MatchReport {
  match: MatchSummary;
  over: boolean;
  decisions: { tick: number; picks: [PickInfo, PickInfo] }[];
}
