// Wire format between the arena service and any browser watching a match.
// Plain JSON over server-sent events: one `hello` on connect, then one `tick` per second.

import type { ActionId, FightEvent, ForcedAction, MatchState, TickResult } from "@clanker/game";

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
 * that tick; one that misses the deadline idles. Both show in the pick's `source`.
 */
export type BrainKind = ModelBrain | "heuristic" | "random";
export const BRAIN_KINDS: readonly BrainKind[] = [...MODEL_BRAINS, "heuristic", "random"];

export const isModelBrain = (kind: BrainKind): kind is ModelBrain =>
  (MODEL_BRAINS as readonly BrainKind[]).includes(kind);

export interface MatchSetup {
  fighters: [string, string];
  brains: [BrainKind, BrainKind];
  seed: number;
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
   * late: no answer before the tick boundary, so the fighter idled; `provider` says who.
   * forced: the sim overrode the pick (knockdown, stagger).
   */
  source: ModelBrain | "heuristic" | "random" | "fallback" | "late" | "forced";
  /** The model this fighter asked, when the pick did not come from it (fallback, late). */
  provider?: ModelBrain;
  confidence?: number;
  latencyMs?: number;
  note?: string;
}

export type ArenaMessage =
  | {
      type: "hello";
      match: MatchSummary;
      /** State at the end of the newest resolved tick (or the opening state). */
      state: MatchState;
      /** Newest resolved tick, so a late watcher can start playing straight away. */
      last: TickMessage | null;
      events: FightEvent[];
    }
  | TickMessage;

export interface TickMessage {
  type: "tick";
  result: TickResult;
  picks: [PickInfo, PickInfo];
}

export interface StartMatchRequest {
  fighters: [string, string];
  brains?: [BrainKind, BrainKind];
  seed?: number;
}

/** Whether a model answered the startup check, and if not, why (never contains a key). */
export interface ModelStatus {
  ready: boolean;
  reason?: string;
}

export interface HealthResponse {
  ok: true;
  models: Record<ModelBrain, ModelStatus>;
}
