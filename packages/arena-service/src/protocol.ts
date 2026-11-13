// Wire format between the arena service and any browser watching a match.
// Plain JSON over server-sent events: one `hello` on connect, then one `tick` per second.

import type { ActionId, FightEvent, ForcedAction, MatchState, TickResult } from "@clanker/game";

/** Who picks a fighter's actions. Gemini falls back to the heuristic when it errors or runs late. */
export type BrainKind = "gemini" | "heuristic" | "random";
export const BRAIN_KINDS: readonly BrainKind[] = ["gemini", "heuristic", "random"];

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
   * gemini: Gemini Decision 1 answered in time.
   * heuristic / random: that brain picked.
   * fallback: Gemini failed, so the heuristic picked.
   * late: no answer before the tick boundary, so the fighter idled.
   * forced: the sim overrode the pick (knockdown, stagger).
   */
  source: "gemini" | "heuristic" | "random" | "fallback" | "late" | "forced";
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

export interface HealthResponse {
  ok: true;
  decisionModel: "gemini-decision-1" | null;
}
