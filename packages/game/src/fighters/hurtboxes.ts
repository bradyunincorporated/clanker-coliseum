import type { HurtboxSet } from "../sim/types.js";

/**
 * Default humanoid-ish hurtboxes (head, body, legs) sized by a scale factor.
 * Fighters can override any stance in their own file once real sprites exist.
 * Boxes are fighter-local: x forward from the center line, y up from the feet.
 */
export function standardHurtboxes(scale = 1, width = 1): HurtboxSet {
  const s = (n: number) => Math.round(n * scale);
  const w = (n: number) => Math.round(n * scale * width);
  return {
    standing: [
      { x: -w(30), y: 0, w: w(60), h: s(70) },
      { x: -w(36), y: s(70), w: w(72), h: s(70) },
      { x: -w(22), y: s(140), w: w(44), h: s(40) },
    ],
    crouching: [
      { x: -w(36), y: 0, w: w(72), h: s(50) },
      { x: -w(36), y: s(50), w: w(72), h: s(40) },
      { x: -w(22), y: s(90), w: w(44), h: s(28) },
    ],
    airborne: [
      { x: -w(30), y: s(20), w: w(60), h: s(50) },
      { x: -w(36), y: s(70), w: w(72), h: s(70) },
      { x: -w(22), y: s(140), w: w(44), h: s(40) },
    ],
  };
}
