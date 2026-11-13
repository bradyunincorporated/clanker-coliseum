import type { SpriteSpec } from "../sim/types.js";

/** Animation bindings shared by the delivered development fighter packs. */
export const devAnimations: SpriteSpec["animations"] = {
  idle: "idle",
  walkForward: "walkForward",
  walkBack: "walkBack",
  jump: "jump",
  jumpForward: "jumpForward",
  crouch: "crouch",
  block: "block",
  crouchBlock: "crouchBlock",
  hitstun: "hitstun",
  blockstun: "blockstun",
  knockdown: "knockdown",
  stagger: "stagger",
  ko: "ko",
  victory: "victory",
};

export const devMovePoses: SpriteSpec["moves"] = {
  move1: { windup: "move1_windup", strike: "move1_strike", recover: "move1_recover" },
  move2: { windup: "move2_windup", strike: "move2_strike", recover: "move2_recover" },
  move3: { windup: "move3_windup", strike: "move3_strike", recover: "move3_recover" },
  move4: { windup: "move4_windup", strike: "move4_strike", recover: "move4_recover" },
};
