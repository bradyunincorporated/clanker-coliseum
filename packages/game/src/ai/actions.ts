import type { ActionId } from "../sim/types.js";

/** Plain-language descriptions of the 8 basic actions (moves describe themselves from their data). */
export const BASIC_ACTION_TEXT: Record<string, string> = {
  idle: "Stand still for the tick. Not guarding.",
  walkForward: "Walk toward the opponent for the whole tick.",
  walkBack: "Walk away from the opponent (slower than forward).",
  jump: "Jump straight up. Airborne for most of the tick; avoids low attacks; cannot guard.",
  jumpForward: "Jump toward the opponent, travelling forward in the air; cannot guard.",
  crouch: "Crouch for the tick: smaller hurtbox, ducks some high attacks. Not guarding.",
  block: "Standing guard: blocks mid and overhead moves, does NOT block low moves.",
  crouchBlock: "Crouching guard: blocks mid and low moves, does NOT block overhead moves.",
};

export const ACTION_LABEL: Record<ActionId, string> = {
  idle: "Idle",
  walkForward: "Walk forward",
  walkBack: "Walk back",
  jump: "Jump",
  jumpForward: "Jump forward",
  crouch: "Crouch",
  block: "Block",
  crouchBlock: "Crouch block",
  move1: "Move 1",
  move2: "Move 2",
  move3: "Move 3",
  move4: "Move 4",
};
