// Plays the server's ticks back in real time. Each tick's 60 frames are spread over tickMs.
// Ticks arrive about once per tickMs; a small queue absorbs network jitter, and if the
// watcher falls behind (a hidden tab) it skips ahead rather than drifting further back.

import type { TickMessage } from "@clanker/arena-service/protocol";
import { FRAMES_PER_TICK } from "@clanker/game";

const MAX_QUEUE = 2;

export class TickPlayback {
  current: TickMessage | null = null;
  private queue: TickMessage[] = [];
  private elapsed = 0;

  constructor(readonly tickMs: number) {}

  push(tick: TickMessage) {
    this.queue.push(tick);
    while (this.queue.length > MAX_QUEUE) this.queue.shift();
  }

  /** Advance real time. Returns the tick that started during this step, if any. */
  advance(dtMs: number): TickMessage | null {
    this.elapsed += dtMs;
    if (this.current && this.elapsed < this.tickMs) return null;
    const next = this.queue.shift();
    if (!next) {
      // Hold the last frame until the server's next tick lands.
      this.elapsed = Math.min(this.elapsed, this.tickMs);
      return null;
    }
    this.elapsed = this.current ? Math.min(this.elapsed - this.tickMs, this.tickMs / 4) : 0;
    this.current = next;
    return next;
  }

  /** Frame of the current tick to show (0-59). */
  get frameIndex(): number {
    return Math.min(
      FRAMES_PER_TICK - 1,
      Math.floor((this.elapsed / this.tickMs) * FRAMES_PER_TICK),
    );
  }

  get waiting(): boolean {
    return this.queue.length === 0 && this.elapsed >= this.tickMs;
  }
}
