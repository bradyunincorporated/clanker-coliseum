import type { ActionId } from "../sim/types.js";
import type { DecisionContext, DecisionProvider } from "./provider.js";
import { mulberry32, weightedPick } from "./rng.js";

/**
 * Turn a model's per-option probabilities into a pick that is usually the best option but not always:
 * probabilities are sharpened (p^sharpness) and then sampled with a seeded RNG.
 */
export function samplePick(
  probabilities: Record<string, number>,
  legal: ActionId[],
  rand: () => number,
  sharpness = 3,
): ActionId {
  const items = legal.map(
    (a) => [a, Math.pow(probabilities[a] ?? 0, sharpness)] as [ActionId, number],
  );
  if (items.every(([, w]) => w <= 0)) return legal[0] ?? "idle";
  return weightedPick(rand, items);
}

/** Uniform-ish random over legal actions (seeded). */
export class RandomBrain implements DecisionProvider {
  readonly id = "random";
  readonly label = "Random";
  private rand = mulberry32(1);
  reset(seed: number) {
    this.rand = mulberry32(seed);
  }
  async decide(ctx: DecisionContext): Promise<ActionId> {
    return weightedPick(
      this.rand,
      ctx.legalActions.map((a) => [a, a === "idle" ? 0.5 : 1] as [ActionId, number]),
    );
  }
}

/** Plays a fixed script, looping. Handy for testing specific interactions. */
export class ScriptedBrain implements DecisionProvider {
  readonly id = "scripted";
  readonly label = "Scripted";
  private i = 0;
  constructor(
    private script: ActionId[] = [
      "walkForward",
      "walkForward",
      "move1",
      "block",
      "move2",
      "crouchBlock",
      "move3",
      "move4",
    ],
  ) {}
  reset() {
    this.i = 0;
  }
  async decide(ctx: DecisionContext): Promise<ActionId> {
    const a = this.script[this.i++ % this.script.length];
    return ctx.legalActions.includes(a) ? a : "idle";
  }
}

/**
 * Spacing-aware baseline brain from raw state: approach when far, poke at range, guard sometimes.
 * Stand-in when no API key is set, and a baseline to compare Gemini against.
 */
export class HeuristicBrain implements DecisionProvider {
  readonly id = "heuristic";
  readonly label = "Heuristic";
  private rand = mulberry32(7);
  reset(seed: number) {
    this.rand = mulberry32(seed * 31 + 7);
  }
  async decide(ctx: DecisionContext): Promise<ActionId> {
    const me = ctx.self.state;
    const foe = ctx.opponent.state;
    const d = Math.abs(foe.x - me.x);
    const reach = (slot: string) => {
      const m = ctx.self.moves.find((mv) => mv.slot === slot);
      return m ? m.hitbox.x + m.hitbox.w + ctx.opponent.stats.pushWidth : 0;
    };
    const oppReach =
      Math.max(...ctx.opponent.moves.map((m) => m.hitbox.x + m.hitbox.w)) +
      ctx.self.stats.pushWidth;
    const legal = new Set(ctx.legalActions);
    const lowHp = ctx.self.hp / ctx.self.maxHp < 0.3;
    const opts: Array<[ActionId, number]> = [];
    const add = (a: ActionId, w: number) => legal.has(a) && opts.push([a, w]);
    // Prefer moves with good type matchups.
    const tm = (slot: string) => ctx.self.moves.find((m) => m.slot === slot)?.typeMultiplier ?? 1;

    if (d > oppReach + 120) {
      add("walkForward", 6);
      add("jumpForward", 1);
      add("idle", 0.5);
    } else if (d > reach("move2")) {
      add("walkForward", 4);
      add("block", lowHp ? 2 : 1);
      add("crouchBlock", lowHp ? 2 : 1);
      add("move2", 1 * tm("move2"));
      add("walkBack", 0.5);
    } else if (d > reach("move1")) {
      add("move2", 3 * tm("move2"));
      add("move3", 2 * tm("move3"));
      add("block", 1.5);
      add("crouchBlock", 1.5);
      add("walkForward", 1);
    } else {
      add("move1", 3 * tm("move1"));
      add("move3", 2 * tm("move3"));
      add("move4", 1.5 * tm("move4"));
      add("block", lowHp ? 3 : 1.2);
      add("crouchBlock", lowHp ? 3 : 1.2);
      add("walkBack", 0.7);
    }
    if (foe.y > 40) add("move4", 5); // anti-air
    if (!opts.length) return ctx.legalActions[0] ?? "idle";
    return weightedPick(this.rand, opts);
  }
}
