<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * The whole game is one landscape frame that fills the window edge to edge and never
   * scrolls. It is laid out in design units, at least 1280 x 720, and scaled to the window:
   * a window wider or taller than 16:9 gets more design units, never bars. Every screen is
   * `absolute inset-0` inside it. The frame is a size container named `frame`, so
   * `100cqw` x `100cqh` is the frame in design units; never use `vw`/`vh`.
   */
  let { children }: { children: Snippet } = $props();

  const DESIGN_W = 1280;
  const DESIGN_H = 720;

  let view = $state({ w: DESIGN_W, h: DESIGN_H });
  const scale = $derived(Math.min(view.w / DESIGN_W, view.h / DESIGN_H));

  $effect(() => {
    const measure = () => (view = { w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });
</script>

<div class="fixed inset-0 overflow-hidden bg-night">
  <div
    class="frame relative origin-top-left overflow-hidden"
    style:width="{view.w / scale}px"
    style:height="{view.h / scale}px"
    style:transform="scale({scale})"
  >
    {@render children()}
  </div>
</div>

<style>
  .frame {
    container: frame / size;
  }
</style>
