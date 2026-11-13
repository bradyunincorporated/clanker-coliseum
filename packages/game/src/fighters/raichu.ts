import type { FighterDef } from "../sim/types.js";
import { devAnimations, devMovePoses } from "./dev-sprites.js";

// Initial arcade tuning. Move phases and effects follow the supplied sprite pack.
const raichu: FighterDef = {
  id: "raichu",
  name: "Raichu",
  blurb: "A quick electric skirmisher with a whipping tail and a diving volt tackle.",
  types: ["electric"],
  passive: {
    name: "Lightning Rod",
    description: "Raichu takes 20% less damage from Electric moves.",
    effect: {
      kind: "resist",
      types: ["electric"],
      damageMult: 0.8,
    },
  },
  stats: {
    maxHp: 90,
    walkSpeed: 3.1,
    jumpVelocity: 9.5,
    gravity: 0.4,
    pushWidth: 40,
    defense: 1,
  },
  hurtboxes: {
    standing: [
      {
        x: -35,
        y: 0,
        w: 70,
        h: 50,
      },
      {
        x: -43,
        y: 35,
        w: 86,
        h: 85,
      },
      {
        x: -35,
        y: 110,
        w: 70,
        h: 45,
      },
    ],
    crouching: [
      {
        x: -50,
        y: 0,
        w: 100,
        h: 40,
      },
      {
        x: -48,
        y: 30,
        w: 96,
        h: 65,
      },
    ],
    airborne: [
      {
        x: -40,
        y: 20,
        w: 80,
        h: 125,
      },
    ],
  },
  moves: {
    move1: {
      name: "Quick Attack",
      startup: 4,
      active: 4,
      recovery: 14,
      hitbox: {
        x: 25,
        y: 40,
        w: 70,
        h: 70,
      },
      type: "normal",
      damage: 5,
      hitstun: 14,
      blockstun: 10,
      knockback: 2,
      level: "mid",
      priority: 1,
      lunge: 2.5,
    },
    move2: {
      name: "Thunderbolt",
      startup: 14,
      active: 10,
      recovery: 27,
      hitbox: {
        x: 40,
        y: 50,
        w: 150,
        h: 90,
      },
      type: "electric",
      damage: 11,
      hitstun: 22,
      blockstun: 16,
      knockback: 4,
      level: "mid",
      priority: 2,
    },
    move3: {
      name: "Iron Tail",
      startup: 10,
      active: 6,
      recovery: 24,
      hitbox: {
        x: 15,
        y: 0,
        w: 165,
        h: 45,
      },
      type: "steel",
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
      name: "Volt Tackle",
      startup: 17,
      active: 8,
      recovery: 30,
      hitbox: {
        x: 25,
        y: 30,
        w: 140,
        h: 100,
      },
      type: "electric",
      damage: 13,
      hitstun: 24,
      blockstun: 18,
      knockback: 5,
      level: "mid",
      priority: 3,
      lunge: 3.5,
    },
  },
  sprites: {
    sheet: "/fighters/raichu/raichu.json",
    animations: devAnimations,
    loops: {
      idle: 8400,
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
    color: 15705138,
    accent: 16770156,
  },
};

export default raichu;
