import type { ElementType } from "./types.js";

// Classic 18-type chart, softened: super effective = x1.2, not very effective = x0.8.
// Immunities are softened to x0.8 too, so nothing is ever fully walled.
export const TYPES: readonly ElementType[] = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
];

export const SUPER = 1.2;
export const RESISTED = 0.8;
export const IMMUNE = 0.8;
export const STAB = 1.1;

type Row = { super?: ElementType[]; resisted?: ElementType[]; immune?: ElementType[] };

const CHART: Record<ElementType, Row> = {
  normal: { resisted: ["rock", "steel"], immune: ["ghost"] },
  fire: { super: ["grass", "ice", "bug", "steel"], resisted: ["fire", "water", "rock", "dragon"] },
  water: { super: ["fire", "ground", "rock"], resisted: ["water", "grass", "dragon"] },
  electric: {
    super: ["water", "flying"],
    resisted: ["electric", "grass", "dragon"],
    immune: ["ground"],
  },
  grass: {
    super: ["water", "ground", "rock"],
    resisted: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"],
  },
  ice: {
    super: ["grass", "ground", "flying", "dragon"],
    resisted: ["fire", "water", "ice", "steel"],
  },
  fighting: {
    super: ["normal", "ice", "rock", "dark", "steel"],
    resisted: ["poison", "flying", "psychic", "bug", "fairy"],
    immune: ["ghost"],
  },
  poison: {
    super: ["grass", "fairy"],
    resisted: ["poison", "ground", "rock", "ghost"],
    immune: ["steel"],
  },
  ground: {
    super: ["fire", "electric", "poison", "rock", "steel"],
    resisted: ["grass", "bug"],
    immune: ["flying"],
  },
  flying: { super: ["grass", "fighting", "bug"], resisted: ["electric", "rock", "steel"] },
  psychic: { super: ["fighting", "poison"], resisted: ["psychic", "steel"], immune: ["dark"] },
  bug: {
    super: ["grass", "psychic", "dark"],
    resisted: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"],
  },
  rock: { super: ["fire", "ice", "flying", "bug"], resisted: ["fighting", "ground", "steel"] },
  ghost: { super: ["psychic", "ghost"], resisted: ["dark"], immune: ["normal"] },
  dragon: { super: ["dragon"], resisted: ["steel"], immune: ["fairy"] },
  dark: { super: ["psychic", "ghost"], resisted: ["fighting", "dark", "fairy"] },
  steel: { super: ["ice", "rock", "fairy"], resisted: ["fire", "water", "electric", "steel"] },
  fairy: { super: ["fighting", "dragon", "dark"], resisted: ["fire", "poison", "steel"] },
};

/** Multiplier for a move type hitting a defender with these types (dual types multiply). */
export function effectiveness(moveType: ElementType, defender: readonly ElementType[]): number {
  const row = CHART[moveType];
  let m = 1;
  for (const t of defender) {
    if (row.super?.includes(t)) m *= SUPER;
    else if (row.resisted?.includes(t)) m *= RESISTED;
    else if (row.immune?.includes(t)) m *= IMMUNE;
  }
  return Math.round(m * 1000) / 1000;
}

export function stab(moveType: ElementType, attacker: readonly ElementType[]): number {
  return attacker.includes(moveType) ? STAB : 1;
}
