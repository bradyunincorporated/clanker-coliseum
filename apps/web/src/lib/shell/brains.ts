import {
  BRAIN_KINDS,
  BRAIN_MODELS,
  isModelBrain,
  type BrainKind,
} from "@clanker/arena-service/protocol";
import { picksQuery } from "./roster.js";

/** What the brain selector shows for one option. Copy lives here so it is easy to restyle. */
export interface BrainCard {
  id: BrainKind;
  /** Official name, for comparing models. */
  label: string;
  /** Official model id; empty for the house brains. */
  modelId: string;
  tagline: string;
  /** The company's own logo, in /static/brains. */
  logo?: string;
}

const HOUSE: Record<Exclude<BrainKind, keyof typeof BRAIN_MODELS>, BrainCard> = {
  heuristic: {
    id: "heuristic",
    label: "Heuristic",
    modelId: "",
    tagline: "House brain, no model",
  },
  random: { id: "random", label: "Random", modelId: "", tagline: "Pure button mashing" },
};

const TAGLINE = {
  gemini: "Powered by Gemini",
  jev: "Powered by Jev",
  clef: "Powered by Cloudflare Clef",
} as const;

/**
 * Logo files in /static/brains, each taken from the company's own site. Only add a file
 * that came from the official source; a brain without one shows its initial instead.
 * clef.svg: developers.cloudflare.com (the Cloudflare mark on the Workers AI model pages).
 */
const LOGO: Partial<Record<BrainKind, string>> = {
  clef: "/brains/clef.svg",
};

export const BRAIN_CARDS: BrainCard[] = BRAIN_KINDS.map((id) => {
  if (!isModelBrain(id)) return HOUSE[id];
  const m = BRAIN_MODELS[id];
  return {
    id,
    label: id === "gemini" ? m.name : `${m.company} ${m.name}`,
    modelId: m.modelId,
    tagline: TAGLINE[id],
    logo: LOGO[id],
  };
});

export const brainCard = (id: BrainKind): BrainCard =>
  BRAIN_CARDS.find((b) => b.id === id) ?? BRAIN_CARDS[0];

export type Brains = [BrainKind, BrainKind];

/** Reads `?b1=..&b2=..`; anything missing or unknown is Gemini Decision 1. */
export function brainsFrom(params: Pick<URLSearchParams, "get">): Brains {
  const at = (key: string): BrainKind => {
    const v = params.get(key) as BrainKind | null;
    return v && BRAIN_KINDS.includes(v) ? v : "gemini";
  };
  return [at("b1"), at("b2")];
}

/** The whole pre-match setup as a query string: both fighters and both brains. */
export const setupQuery = (
  picks: readonly [{ id: string }, { id: string }],
  brains: Readonly<Brains>,
): string => `${picksQuery(picks)}&b1=${brains[0]}&b2=${brains[1]}`;
