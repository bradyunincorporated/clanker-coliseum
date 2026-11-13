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

/**
 * Four-legged body: a long low torso with the head out in front. `length` is nose to tail,
 * `height` is the top of the back, `headRise` is how far the head sits above the back.
 * Crouching flattens it; airborne tucks the legs.
 */
export function quadrupedHurtboxes(length = 170, height = 100, headRise = 30): HurtboxSet {
  const half = Math.round(length / 2);
  const head = Math.round(length * 0.3);
  const legs = Math.round(height * 0.4);
  const body = (y: number, h: number) => ({ x: -half, y, w: length - head, h });
  const headBox = (y: number, h: number) => ({ x: half - head, y, w: head, h });
  const low = Math.round(height * 0.62);
  return {
    standing: [
      { x: -half + 10, y: 0, w: length - head - 20, h: legs },
      body(legs, height - legs),
      headBox(Math.round(height * 0.45), height - Math.round(height * 0.45) + headRise),
    ],
    crouching: [body(0, low), headBox(0, low + Math.round(headRise / 2))],
    airborne: [
      body(Math.round(legs / 2), height - Math.round(legs / 2)),
      headBox(Math.round(height * 0.45), height - Math.round(height * 0.45) + headRise),
    ],
  };
}

/**
 * Compact round body: one wide middle box with narrower boxes above and below, which follows
 * a circle closely. `hover` lifts the whole body off the floor for a creature that floats;
 * low attacks then pass under it, so keep hover small unless that is intended.
 */
export function roundHurtboxes(diameter = 130, hover = 0): HurtboxSet {
  const ball = (d: number, y0: number) => {
    const r = d / 2;
    const cap = Math.round(d * 0.22);
    const narrow = Math.round(r * 0.72);
    return [
      { x: -narrow, y: y0, w: narrow * 2, h: cap },
      { x: -Math.round(r), y: y0 + cap, w: Math.round(d), h: Math.round(d) - cap * 2 },
      { x: -narrow, y: y0 + Math.round(d) - cap, w: narrow * 2, h: cap },
    ];
  };
  return {
    standing: ball(diameter, hover),
    // Squashed: three quarters of the height, resting on the floor.
    crouching: ball(diameter, 0).map((b) => ({
      ...b,
      y: Math.round(b.y * 0.75),
      h: Math.round(b.h * 0.75),
    })),
    airborne: ball(diameter, hover),
  };
}
