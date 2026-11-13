/** Small seeded PRNG (mulberry32) so random brains are replayable. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function weightedPick<T>(rand: () => number, items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + Math.max(0, w), 0);
  let r = rand() * total;
  for (const [item, w] of items) {
    r -= Math.max(0, w);
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}
