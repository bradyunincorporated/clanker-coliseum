import { DEFAULT_GAME_PLAN, isGamePlanId, type GamePlanId } from "@clanker/game";

/**
 * The coaching half of the pre-match setup, read from the query every screen carries
 * (see CARRIED in brains.ts):
 *   g1, g2              each side's game plan id ("rush" | "distance" | "counter" | "dealers")
 *   trainer1, trainer2  each side's trainer id, set by the trainer picker at character select
 * The lobby sends both to the service when the bell rings; the match then carries them.
 */
export type Plans = [GamePlanId, GamePlanId];
export type Trainers = [string | null, string | null];

/** Reads `?g1=..&g2=..`; anything missing or unknown is "dealers" (no standing order). */
export function plansFrom(params: Pick<URLSearchParams, "get">): Plans {
  const at = (key: string): GamePlanId => {
    const v = params.get(key);
    return isGamePlanId(v) ? v : DEFAULT_GAME_PLAN;
  };
  return [at("g1"), at("g2")];
}

/** Reads `?trainer1=..&trainer2=..`. The ids are opaque here; null where none was picked. */
export function trainersFrom(params: Pick<URLSearchParams, "get">): Trainers {
  return [params.get("trainer1") || null, params.get("trainer2") || null];
}

/** The same query with these game plans in it, for `setupQuery(picks, brains, from)`. */
export function withPlans(
  params: Pick<URLSearchParams, "get">,
  plans: Readonly<Plans>,
): Pick<URLSearchParams, "get"> {
  return {
    get: (key) => (key === "g1" ? plans[0] : key === "g2" ? plans[1] : params.get(key)),
  };
}
