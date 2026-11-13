<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * The whole site is one landscape game frame: it never scrolls. The frame is laid out in
   * design units (at least 1280 x 720) and scaled to fill the window exactly, like a game
   * canvas. A window wider or taller than 16:9 gets more design units, never empty bars.
   * Whatever a page puts in `children` is also shrunk to fit the space under the header, so
   * nothing can overflow even before a page has been tuned for the frame. Pages size
   * aspect-locked things (the stage) from the room with `cqh` units; never use `vw`/`vh`.
   */
  let { header, children }: { header: Snippet; children: Snippet } = $props();

  const DESIGN_W = 1280;
  const DESIGN_H = 720;

  let view = $state({ w: DESIGN_W, h: DESIGN_H });
  const scale = $derived(Math.min(view.w / DESIGN_W, view.h / DESIGN_H));

  let room: HTMLDivElement | undefined = $state();
  let content: HTMLDivElement | undefined = $state();
  let fit = $state(1);

  $effect(() => {
    const measure = () => (view = { w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  });

  // offsetHeight is in design units: transforms don't change it.
  $effect(() => {
    if (!room || !content) return;
    const el = room;
    const inner = content;
    const refit = () => {
      const natural = inner.offsetHeight;
      fit = natural > 0 ? Math.min(1, el.offsetHeight / natural) : 1;
    };
    const watch = new ResizeObserver(refit);
    watch.observe(el);
    watch.observe(inner);
    return () => watch.disconnect();
  });
</script>

<div class="fixed inset-0 overflow-hidden">
  <div
    class="flex origin-top-left flex-col"
    style:width="{view.w / scale}px"
    style:height="{view.h / scale}px"
    style:transform="scale({scale})"
  >
    {@render header()}
    <div bind:this={room} class="relative flex min-h-0 flex-1 flex-col overflow-hidden [container-type:size]">
      <!-- Shorter than the room: sit in the middle. Taller: shrink from the top. -->
      <div bind:this={content} class="w-full shrink-0 origin-top {fit === 1 ? 'my-auto' : ''}" style:transform="scale({fit})">
        {@render children()}
      </div>
    </div>
  </div>
</div>
