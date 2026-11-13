// Builds the Gemini Decision 1 request for one fighter's pick. Pure: the server sends it.
// API: POST https://generativelanguage.googleapis.com/v1beta/decisions, header x-goog-api-key,
// body { model, input, questions }; a choice answer has { choice, probabilities, confidence }.

import type { DecisionContext, MoveView } from "./provider.js";
import { BASIC_ACTION_TEXT } from "./actions.js";

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/decisions";
export const GEMINI_MODEL = "gemini-decision-1";

/** What the server returns for POST /api/decide. */
export interface DecisionAnswer {
  choice: string;
  probabilities: Record<string, number>;
  confidence?: number;
  latencyMs: number;
}

const RULES = `You control one fighter in a 2D fighting game. Every action lasts exactly one tick (1 second).
Both fighters' actions start at the same time and are simulated over 60 frames. Positions are in pixels;
x grows to the right, y is height above the floor. A move's hitbox appears after "startup" frames, stays for
"active" frames, then the fighter is stuck for "recovery" frames. Hitbox x is measured forward from the
fighter's center; a move connects if its hitbox overlaps the opponent's body. A faster move interrupts a slower
one that hasn't come out yet. Guarding: "block" stops mid and overhead moves, "crouchBlock" stops mid and low.
A blocked move that leaves the attacker far behind makes them lose their next pick. knockdown moves make the
opponent lose their next pick. Damage is multiplied by typeMultiplier (type matchups and same-type bonus).
Win by bringing the opponent's HP to 0, or have the higher HP fraction when the round timer runs out.
Pick the action most likely to win the fight from this exact state.`;

function moveText(m: MoveView): string {
  const reach = m.hitbox.x + m.hitbox.w;
  return `${m.name} (${m.type}, ${m.level}): ${m.damage} dmg x${m.typeMultiplier}, startup ${m.startup}f, active ${m.active}f, recovery ${m.recovery}f, reach ${reach}px, hitbox height ${m.hitbox.y}-${m.hitbox.y + m.hitbox.h}px${m.knockdown ? ", knockdown" : ""}${m.invincible ? `, invincible frames ${m.invincible[0]}-${m.invincible[1]}` : ""}${m.lunge ? `, lunges ${m.lunge}px/frame` : ""}`;
}

export function buildDecisionRequest(ctx: DecisionContext) {
  const criteria: Record<string, string> = {};
  for (const a of ctx.legalActions) {
    const move = ctx.self.moves.find((m) => m.slot === a);
    criteria[a] = move ? moveText(move) : BASIC_ACTION_TEXT[a];
  }
  const state = {
    tick: ctx.tick,
    ticksRemaining: ctx.ticksRemaining,
    stageWidth: ctx.stageWidth,
    you: ctx.self,
    opponent: ctx.opponent,
    recentEvents: ctx.recentEvents.map((e) => `tick ${e.tick} frame ${e.frame}: ${e.text}`),
    coaching: ctx.coaching ?? null,
  };
  return {
    model: GEMINI_MODEL,
    input: `${RULES}\n\nGame state (JSON):\n${JSON.stringify(state)}`,
    questions: {
      action: {
        type: "choice",
        instructions: `You are ${ctx.self.name}. Which action should you take next tick?`,
        criteria,
      },
    },
  };
}
