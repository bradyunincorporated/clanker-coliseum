<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * The one arena, built like a paper theatre: flat painted plates stacked back to front,
   * each casting a shadow on the one behind and sliding at its own speed as the camera drifts.
   * Plates live in /static/arena/diner. Depth 0 is glued to the sky; bigger numbers are closer.
   */
  let { children }: { children?: Snippet } = $props();

  // Floor strips, back to front: [height as % of the frame, tone 0..1 (far = hazier), depth].
  const FLOOR: [number, number, number][] = [
    [3.2, 0, 1.5],
    [4.2, 0.25, 1.75],
    [5.4, 0.5, 2],
    [7, 0.75, 2.4],
    [9.4, 1, 2.9],
  ];
  const floorRows = FLOOR.map(([height, tone, depth], i) => ({
    height,
    tone,
    depth,
    top: 71 + FLOOR.slice(0, i).reduce((sum, row) => sum + row[0], 0),
    odd: i % 2 === 1,
  }));

  let frame: HTMLDivElement | undefined = $state();

  // Camera drift: a slow sway plus the pointer. One CSS variable drives every plate.
  $effect(() => {
    const el = frame;
    if (!el) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pointer = 0;
    let pan = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      pointer = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1));
    };
    const onLeave = () => (pointer = 0);
    const tick = (now: number) => {
      const sway = still ? 0 : Math.sin(now / 2600) * 0.45;
      pan += (Math.max(-1, Math.min(1, sway - pointer)) - pan) * 0.06;
      el.style.setProperty("--pan", pan.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  });
</script>

<div bind:this={frame} class="diorama" role="img" aria-label="The diner arena: an empty stage">
  <img class="plate sky" style:--depth="0.15" src="/arena/diner/sky.webp" alt="" />
  <img class="plate skyline" style:--depth="0.45" src="/arena/diner/skyline.webp" alt="" />
  <div class="plate neon-spill" style:--depth="0.45"></div>
  <img class="plate wall cut" style:--depth="1" src="/arena/diner/wall.webp" alt="" />
  <div class="plate haze" style:--depth="1"></div>
  <img class="plate props cut" style:--depth="1.3" src="/arena/diner/props.webp" alt="" />

  {#each floorRows as row (row.top)}
    <div
      class="plate floor"
      class:odd={row.odd}
      style:--depth={row.depth}
      style:--tone={row.tone}
      style:--h="{row.height}cqh"
      style:top="{row.top}%"
      style:height="{row.height + 0.4}%"
    ></div>
  {/each}
  <div class="seam"></div>
  <div class="lamp-pools"></div>

  <div class="plate playfield" style:--depth="2.2">
    {@render children?.()}
  </div>

  <img class="plate foreground lamps" style:--depth="4" src="/arena/diner/foreground.webp" alt="" />
  <img class="plate foreground tables" style:--depth="5" src="/arena/diner/foreground.webp" alt="" />
  <div class="grain"></div>
  <div class="vignette"></div>
</div>

<style>
  .diorama {
    --pan: 0;
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    container-type: size;
    background: var(--navy);
    isolation: isolate;
  }
  .plate {
    position: absolute;
    max-width: none;
    transform: translate3d(calc(var(--pan) * var(--depth) * 0.75cqw), 0, 0);
    will-change: transform;
    user-select: none;
    -webkit-user-drag: none;
  }
  /* Cut paper: every plate drops a shadow onto the plate behind it. */
  .cut {
    filter: drop-shadow(0 0.5cqh 0.5cqh rgb(20 27 51 / 0.45));
  }
  .sky {
    inset: -2% -6% auto;
    width: 112%;
    height: 56%;
    object-fit: cover;
  }
  .skyline {
    left: 41%;
    top: 21%;
    height: 29%;
    margin-left: -81.5cqh;
    filter: saturate(0.8) brightness(0.9);
  }
  .neon-spill {
    left: 24%;
    top: 10%;
    width: 22%;
    height: 34%;
    background: radial-gradient(closest-side, rgb(255 59 47 / 0.35), transparent);
    mix-blend-mode: screen;
    animation: neon 5s steps(1) infinite;
  }
  .wall {
    left: 50%;
    top: 0;
    height: 74%;
    margin-left: -107.3cqh;
  }
  /* Air between the camera and the back wall: far things go paler and cooler. */
  .haze {
    inset: 0 -10% 26%;
    background: linear-gradient(rgb(143 179 201 / 0.16), rgb(243 233 210 / 0.3));
    pointer-events: none;
  }
  .props {
    left: 3%;
    width: 94%;
    bottom: 26.5%;
  }
  .floor {
    left: -12%;
    width: 124%;
    --tile: calc(var(--h) * 2.6);
    --light: color-mix(in oklab, #efe4c8, #b9cfd0 calc((1 - var(--tone)) * 45%));
    --dark: color-mix(in oklab, #232a3f, #6f8794 calc((1 - var(--tone)) * 55%));
    background: repeating-linear-gradient(90deg, var(--light) 0 var(--tile), var(--dark) var(--tile) calc(var(--tile) * 2));
    background-position-x: 50cqw;
    border-top: 0.35cqh solid var(--ink);
    box-shadow:
      0 -0.6cqh 0.9cqh rgb(20 27 51 / 0.4),
      inset 0 1.2cqh 1.2cqh -0.6cqh rgb(255 255 255 / 0.25);
  }
  .floor.odd {
    background-position-x: calc(50cqw + var(--tile));
  }
  /* Warm pools where the pendant lamps hit the floor, and a dark seam where wall meets floor. */
  .lamp-pools {
    position: absolute;
    inset: 66% 0 0;
    background:
      radial-gradient(ellipse 26% 48% at 22% 62%, rgb(255 226 150 / 0.55), transparent 70%),
      radial-gradient(ellipse 26% 48% at 78% 62%, rgb(255 226 150 / 0.55), transparent 70%);
    mix-blend-mode: soft-light;
    pointer-events: none;
  }
  /* Props and wall sit on the floor: a dark seam grounds them. */
  .seam {
    position: absolute;
    inset: 69% 0 auto;
    height: 9%;
    background: linear-gradient(transparent, rgb(15 18 32 / 0.55) 38%, transparent);
    pointer-events: none;
  }
  .playfield {
    inset: 0;
  }
  .foreground {
    left: -7.5%;
    width: 115%;
    filter: drop-shadow(0 1.2cqh 1.4cqh rgb(10 14 30 / 0.55)) brightness(0.8);
  }
  /* One plate, used twice: lamps pushed up off the top edge, tables down off the bottom. */
  .lamps {
    top: -20%;
    clip-path: inset(0 0 55% 0);
  }
  .tables {
    top: 1.5%;
    clip-path: inset(55% 0 0 0);
  }
  /* Watercolour mottling and paper tooth over everything, so the plates sit on one sheet. */
  .grain {
    position: absolute;
    inset: 0;
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='3' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 0.25 0 0 0 0 0.3 0 0 0 0 0.3 0.9 0 0 0 -0.25'/%3E%3C/filter%3E%3Crect width='600' height='600' filter='url(%23m)'/%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.17 0 0 0 0 0.15 0 0 0 0 0.13 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E");
    mix-blend-mode: multiply;
    opacity: 0.55;
    pointer-events: none;
  }
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 55%, transparent 55%, rgb(20 27 51 / 0.45));
    pointer-events: none;
  }
  @keyframes neon {
    0%, 100% { opacity: 1; }
    47% { opacity: 0.55; }
    49% { opacity: 1; }
    52% { opacity: 0.7; }
    54% { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .neon-spill { animation: none; }
  }
</style>
