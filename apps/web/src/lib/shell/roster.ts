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
