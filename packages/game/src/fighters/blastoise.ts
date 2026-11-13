import type { FighterDef } from "../sim/types.js";
import { devAnimations, devMovePoses } from "./dev-sprites.js";

// Initial arcade tuning. Move phases and effects follow the supplied sprite pack.
const blastoise: FighterDef = {
  id: "blastoise",
  name: "Blastoise",
  blurb: "A sturdy water tank with a sweeping tail and powerful shoulder cannons.",
  types: ["water"],
  passive: {
    name: "Torrent",
    description: "Below one-third HP, Blastoise deals 20% more damage.",
    effect: {
      kind: "rally",
      belowHpPct: 0.3333333333333333,
      damageMult: 1.2,
    },
  },
  stats: {
    maxHp: 120,
    walkSpeed: 2.1,
    jumpVelocity: 8.2,
    gravity: 0.44,
    pushWidth: 52,
    defense: 0.95,
  },
  hurtboxes: {
    standing: [
      {
        x: -48,
        y: 0,
        w: 96,
        h: 70,
      },
      {
        x: -55,
        y: 60,
        w: 110,
        h: 80,
      },
      {
        x: -38,
        y: 125,
        w: 76,
        h: 40,
      },
    ],
    crouching: [
      {
        x: -60,
        y: 0,
        w: 120,
        h: 45,
      },
      {
        x: -58,
        y: 35,
        w: 116,
        h: 70,
      },
    ],
    airborne: [
      {
        x: -50,
        y: 25,
        w: 100,
        h: 130,
      },
    ],
  },
  moves: {
    move1: {
      name: "Bite",
      startup: 5,
      active: 4,
      recovery: 14,
      hitbox: {
        x: 35,
        y: 90,
        w: 65,
        h: 50,
      },
      type: "dark",
      damage: 6,
      hitstun: 14,
      blockstun: 10,
      knockback: 2,
      level: "mid",
      priority: 1,
    },
    move2: {
      name: "Water Pulse",
      startup: 14,
      active: 10,
      recovery: 27,
      hitbox: {
        x: 45,
        y: 65,
        w: 140,
        h: 85,
      },
      type: "water",
      damage: 10,
      hitstun: 22,
      blockstun: 16,
      knockback: 4,
      level: "mid",
      priority: 2,
    },
    move3: {
      name: "Aqua Tail",
      startup: 12,
      active: 6,
      recovery: 25,
      hitbox: {
        x: 15,
        y: 0,
        w: 155,
        h: 45,
      },
      type: "water",
      damage: 9,
      hitstun: 20,
      blockstun: 14,
      knockback: 2,
      level: "low",
      priority: 1,
      stance: "crouching",
      knockdown: true,
    },
    move4: {
      name: "Hydro Pump",
      startup: 20,
      active: 10,
      recovery: 28,
      hitbox: {
        x: 55,
        y: 85,
        w: 140,
        h: 65,
      },
      type: "water",
      damage: 14,
      hitstun: 24,
      blockstun: 18,
      knockback: 5,
      level: "mid",
      priority: 3,
    },
  },
  sprites: {
    sheet: "/fighters/blastoise/blastoise.json",
    animations: devAnimations,
    loops: {
      idle: 12500,
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
    color: 5084105,
    accent: 15980960,
  },
};

export default blastoise;
