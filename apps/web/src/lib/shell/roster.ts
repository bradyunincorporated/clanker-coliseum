import type { ElementType } from "@clanker/game";
import { FIGHTERS, type FighterDef } from "@clanker/game";

/** Static fighter data for the site pages. The game package stays the one source. */
export const ROSTER: FighterDef[] = Object.values(FIGHTERS);

export const cssColor = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

export type Picks = [FighterDef, FighterDef];

/** Reads `?p1=..&p2=..`; anything missing or unknown falls back to the first two fighters. */
export function picksFrom(params: Pick<URLSearchParams, "get">): Picks {
  const at = (key: string, fallback: number): FighterDef =>
    FIGHTERS[params.get(key) ?? ""] ?? ROSTER[fallback] ?? ROSTER[0];
  return [at("p1", 0), at("p2", 1)];
}

export const picksQuery = (picks: readonly [{ id: string }, { id: string }]): string =>
  `?p1=${picks[0].id}&p2=${picks[1].id}`;

/** Artwork lives beside each fighter's atlas, independently of its public name. */
export const fighterArt = (def: FighterDef, file = "portrait.png"): string | undefined =>
  def.sprites.sheet?.replace(/[^/]+$/, file);

/** Ink colours for the element types, dark enough to read on cream paper. */
const TYPE_INK: Partial<Record<ElementType, string>> = {
  normal: "#6d6a5c",
  fire: "#d2481f",
  water: "#2f6fc0",
  electric: "#b98a06",
  grass: "#3c8a3f",
  ice: "#2e97a8",
  fighting: "#a8392c",
  poison: "#8a3f9e",
  ground: "#9a6a2c",
  flying: "#5b74c9",
  psychic: "#cf3f77",
  bug: "#7b8f1c",
  rock: "#86713a",
  ghost: "#5b4a96",
  dragon: "#4a3fc4",
  dark: "#4a3d36",
  steel: "#5e7684",
  fairy: "#c3559b",
};

/** The ink for one type; anything unlisted is plain ink. */
export const typeInk = (type: ElementType): string => TYPE_INK[type] ?? "#1b2140";
