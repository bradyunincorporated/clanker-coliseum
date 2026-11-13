import type { FighterDef } from "../sim/types.js";
import arcanine from "./arcanine.js";
import gengar from "./gengar.js";

// One file per fighter. To add one: copy a file, change the id, and list it here.
const ROSTER: FighterDef[] = [arcanine, gengar];

export const FIGHTERS: Record<string, FighterDef> = {};
for (const def of ROSTER) {
  validateFighter(def);
  FIGHTERS[def.id] = def;
}

export function getFighter(id: string): FighterDef {
  const def = FIGHTERS[id];
  if (!def) throw new Error(`Unknown fighter "${id}"`);
  return def;
}

export function validateFighter(def: FighterDef): void {
  if (def.types.length < 1 || def.types.length > 2) throw new Error(`${def.id} needs 1 or 2 types`);
  for (const [slot, m] of Object.entries(def.moves)) {
    const total = m.startup + m.active + m.recovery;
    if (total > 60)
      throw new Error(`${def.id}.${slot} (${m.name}) lasts ${total} frames; max is 60`);
    if (m.startup < 1 || m.active < 1)
      throw new Error(`${def.id}.${slot} needs startup and active >= 1`);
  }
}
