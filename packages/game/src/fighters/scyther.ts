import type { FighterDef } from "../sim/types.js";
import { devAnimations, devMovePoses } from "./dev-sprites.js";

// Initial arcade tuning. Move phases and effects follow the supplied sprite pack.
const scyther: FighterDef = {
  id: "scyther",
  name: "Scyther",
  blurb: "A swift aerial duelist with sharp low slashes and a crushing crossed-blade finish.",
  types: ["bug", "flying"],
  passive: {
    name: "Swarm",
    description: "Below one-third HP, Scyther deals 15% more damage.",
    effect: {
      kind: "rally",
      belowHpPct: 0.3333333333333333,
      damageMult: 1.15,
    },
  },
  stats: {
    maxHp: 100,
    walkSpeed: 3,
    jumpVelocity: 9.8,
    gravity: 0.38,
    pushWidth: 40,
    defense: 1,
  },
  hurtboxes: {
    standing: [
      {
        x: -35,
        y: 0,
        w: 70,
        h: 60,
      },
      {
        x: -38,
        y: 45,
        w: 76,
        h: 85,
      },
      {
        x: -30,
        y: 115,
        w: 60,
        h: 40,
      },
    ],
    crouching: [
      {
        x: -48,
        y: 0,
        w: 96,
        h: 40,
      },
      {
        x: -45,
        y: 30,
        w: 90,
        h: 70,
      },
    ],
    airborne: [
      {
        x: -38,
        y: 20,
        w: 76,
        h: 130,
      },
    ],
  },
  moves: {
    move1: {
      name: "Quick Attack",
      startup: 4,
      active: 4,
      recovery: 15,
      hitbox: {
        x: 30,
        y: 55,
        w: 80,
        h: 60,
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
      name: "Wing Attack",
      startup: 12,
      active: 7,
      recovery: 26,
      hitbox: {
        x: 35,
        y: 65,
        w: 145,
        h: 75,
      },
      type: "flying",
      damage: 9,
      hitstun: 22,
      blockstun: 16,
      knockback: 4,
      level: "mid",
      priority: 2,
    },
    move3: {
      name: "Slash",
      startup: 10,
      active: 6,
      recovery: 24,
      hitbox: {
        x: 20,
        y: 0,
        w: 150,
        h: 45,
      },
      type: "normal",
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
      name: "X-Scissor",
      startup: 17,
      active: 7,
      recovery: 30,
      hitbox: {
        x: 30,
        y: 45,
        w: 145,
        h: 115,
      },
      type: "bug",
      damage: 14,
      hitstun: 24,
      blockstun: 18,
      knockback: 5,
      level: "mid",
      priority: 3,
    },
  },
  sprites: {
    sheet: "/fighters/scyther/scyther.json",
    animations: devAnimations,
    loops: {
      idle: 7500,
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
    color: 7118664,
    accent: 15919038,
  },
};

export default scyther;
