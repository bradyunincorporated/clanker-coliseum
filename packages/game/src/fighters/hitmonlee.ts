import type { FighterDef } from "../sim/types.js";
import { devAnimations, devMovePoses } from "./dev-sprites.js";

// Initial arcade tuning. Move phases and effects follow the supplied sprite pack.
const hitmonlee: FighterDef = {
  id: "hitmonlee",
  name: "Hitmonlee",
  blurb: "A nimble kickboxer with springing legs, low sweeps and a flying high kick.",
  types: ["fighting"],
  passive: {
    name: "Limber",
    description: "Hitmonlee cannot be knocked down.",
    effect: {
      kind: "steadfast",
    },
  },
  stats: {
    maxHp: 95,
    walkSpeed: 2.7,
    jumpVelocity: 10,
    gravity: 0.42,
    pushWidth: 32,
    defense: 1,
  },
  hurtboxes: {
    standing: [
      {
        x: -28,
        y: 0,
        w: 56,
        h: 55,
      },
      {
        x: -30,
        y: 40,
        w: 60,
        h: 80,
      },
    ],
    crouching: [
      {
        x: -40,
        y: 0,
        w: 80,
        h: 35,
      },
      {
        x: -32,
        y: 25,
        w: 64,
        h: 60,
      },
    ],
    airborne: [
      {
        x: -30,
        y: 20,
        w: 60,
        h: 105,
      },
    ],
  },
  moves: {
    move1: {
      name: "Double Kick",
      startup: 5,
      active: 5,
      recovery: 15,
      hitbox: {
        x: 30,
        y: 55,
        w: 85,
        h: 55,
      },
      type: "fighting",
      damage: 6,
      hitstun: 14,
      blockstun: 10,
      knockback: 2,
      level: "mid",
      priority: 1,
    },
    move2: {
      name: "Rolling Kick",
      startup: 12,
      active: 7,
      recovery: 28,
      hitbox: {
        x: 40,
        y: 70,
        w: 150,
        h: 55,
      },
      type: "fighting",
      damage: 11,
      hitstun: 22,
      blockstun: 16,
      knockback: 4,
      level: "mid",
      priority: 2,
    },
    move3: {
      name: "Low Sweep",
      startup: 10,
      active: 6,
      recovery: 25,
      hitbox: {
        x: 15,
        y: 0,
        w: 170,
        h: 40,
      },
      type: "fighting",
      damage: 8,
      hitstun: 20,
      blockstun: 14,
      knockback: 2,
      level: "low",
      priority: 1,
      stance: "crouching",
      knockdown: true,
    },
    move4: {
      name: "High Jump Kick",
      startup: 18,
      active: 6,
      recovery: 32,
      hitbox: {
        x: 35,
        y: 85,
        w: 125,
        h: 110,
      },
      type: "fighting",
      damage: 15,
      hitstun: 24,
      blockstun: 18,
      knockback: 5,
      level: "overhead",
      priority: 3,
      lunge: 3.5,
    },
  },
  sprites: {
    sheet: "/fighters/hitmonlee/hitmonlee.json",
    animations: devAnimations,
    loops: {
      idle: 6200,
    },
    moves: devMovePoses,
    effects: {
      move2: {
        animation: "move2_fx",
        linger: 6,
      },
      move3: {
        animation: "move3_fx",
        linger: 6,
      },
      move4: {
        animation: "move4_fx",
        linger: 6,
      },
    },
    anchor: {
      x: 0.5,
      y: 0.9,
    },
    scale: 0.5,
    color: 11044198,
    accent: 14998193,
  },
};

export default hitmonlee;
