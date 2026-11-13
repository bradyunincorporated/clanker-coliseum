import type {
  ActionId,
  FightEvent,
  FighterDef,
  FighterState,
  MatchState,
  MoveDef,
} from "../sim/types.js";
import { legalActions } from "../sim/resolver.js";
import { effectiveness, stab } from "../sim/type-chart.js";

/**
 * Everything a decision provider sees when picking one fighter's next action: the raw game state
 * plus the full details of both fighters' moves. Plain JSON so it can be POSTed to the server proxy
 * that calls Gemini Decision 1.
 */
export interface DecisionContext {
  tick: number;
  ticksRemaining: number;
  stageWidth: number;
  side: 0 | 1;
  self: FighterView;
  opponent: FighterView;
  /** What the fighter may pick this tick. Never empty when decide() is called. */
  legalActions: ActionId[];
  /** Recent events, newest last (last ~3 ticks). Includes the result of the tick that is still animating. */
  recentEvents: FightEvent[];
  /** Pre-fight coaching text for this fighter (out of MVP scope; plumbed through for later). */
  coaching?: string;
}

export interface FighterView {
  id: string;
  name: string;
  blurb: string;
  types: string[];
  passive: { name: string; description: string };
  hp: number;
  maxHp: number;
  /** Raw state at the end of the tick that is currently animating. */
  state: Pick<
    FighterState,
    "x" | "y" | "vx" | "vy" | "facing" | "action" | "hitstun" | "blockstun" | "forcedNext"
  >;
  stats: FighterDef["stats"];
  moves: MoveView[];
}

export interface MoveView extends MoveDef {
  slot: string;
  /** Total damage multiplier vs the opponent from type effectiveness and STAB (before passives/defense). */
  typeMultiplier: number;
}

export interface DecisionProvider {
  readonly id: string;
  readonly label: string;
  /**
   * Pick an action. Called once per tick per fighter, as soon as the previous tick resolves
   * (while it is still animating). If it hasn't resolved by the next tick boundary the fighter idles.
   */
  decide(ctx: DecisionContext, signal: AbortSignal): Promise<ActionId>;
  /**
   * Optional synchronous pick made at the tick boundary instead of decide(). Used by the keyboard
   * brain so keys pressed during the current animation count for the next tick.
   */
  decideNow?(ctx: DecisionContext): ActionId;
  /** Optional: called when a new match starts. */
  reset?(seed: number): void;
}

export function buildContext(
  state: MatchState,
  side: 0 | 1,
  defs: [FighterDef, FighterDef],
  recentEvents: FightEvent[],
  coaching?: string,
): DecisionContext {
  const view = (i: 0 | 1): FighterView => {
    const f = state.fighters[i];
    const def = defs[i];
    const foe = defs[1 - i];
    return {
      id: def.id,
      name: def.name,
      blurb: def.blurb,
      types: [...def.types],
      passive: { name: def.passive.name, description: def.passive.description },
      hp: f.hp,
      maxHp: def.stats.maxHp,
      state: {
        x: round(f.x),
        y: round(f.y),
        vx: round(f.vx),
        vy: round(f.vy),
        facing: f.facing,
        action: f.action,
        hitstun: f.hitstun,
        blockstun: f.blockstun,
        forcedNext: f.forcedNext,
      },
      stats: def.stats,
      moves: Object.entries(def.moves).map(([slot, m]) => ({
        slot,
        ...m,
        typeMultiplier: round(stab(m.type, def.types) * effectiveness(m.type, foe.types), 3),
      })),
    };
  };
  return {
    tick: state.tick,
    ticksRemaining: state.config.roundTicks - state.tick,
    stageWidth: state.config.stageWidth,
    side,
    self: view(side),
    opponent: view((1 - side) as 0 | 1),
    legalActions: legalActions(state.fighters[side]),
    recentEvents,
    coaching,
  };
}

function round(n: number, places = 1): number {
  const k = 10 ** places;
  return Math.round(n * k) / k;
}
