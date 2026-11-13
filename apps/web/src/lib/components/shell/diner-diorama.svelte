<script lang="ts">
  import type { Snippet } from "svelte";
  import { STAGE_TOP_SHARE } from "#lib/arena/coords.js";

  /**
   * The one arena, built like a paper theatre and filling the whole frame. Flat painted plates
   * are stacked back to front, each casting a shadow on the one behind and sliding at its own
   * speed as the camera drifts. Plates live in /static/arena/diner.
   *
   * The 16:9 stage box (1280 x 720, where the sim is drawn) sits inside the frame; plates bleed
   * past it so a taller window shows more awning and floor, and a wider one shows the wings.
   * Nothing is ever drawn in front of the fighters: `children` and `overlay` are the top layers.
   */
  let {
    children,
    overlay,
    label = "The diner arena",
    still = false,
    mood = "lit",
    spot = false,
    jolt = 0,
  }: {
    /** Stands on the stage: positioned in the stage box, in front of every plate. */
    children?: Snippet;
    /** Covers the whole frame above everything and never pans: the live match canvas. */
    overlay?: Snippet;
    label?: string;
    /** Hold the camera still, so world positions in the overlay stay lined up with the floor. */
    still?: boolean;
    /** `dim` turns the house lights down for the menus; `ko` drains the colour for the final bell. */
    mood?: "lit" | "dim" | "ko";
    /** Two spotlights on the corners where the fighters stand (menus). */
    spot?: boolean;
    /** Bump this number to rattle the set and flare the neon: a hit landed. */
    jolt?: number;
  } = $props();

  // Floor strips, back to front: [painted strip, height in stage-box px, depth].
  const FLOOR: [number, number, number][] = [
    [1, 23, 1.5],
    [2, 30, 1.75],
    [3, 39, 2],
    [4, 50, 2.4],
    [5, 260, 2.9],
  ];
  const FLOOR_TOP = 511;
  const floorRows = FLOOR.map(([strip, height, depth], i) => ({
    strip,
    height,
    depth,
    top: FLOOR_TOP + FLOOR.slice(0, i).reduce((sum, row) => sum + row[1], 0),
  }));

  let frame: HTMLDivElement | undefined = $state();
  let scenery: HTMLDivElement | undefined = $state();
  let neon: HTMLDivElement | undefined = $state();

  // Camera drift: a slow sway plus the pointer. One CSS variable drives every plate.
  $effect(() => {
    const el = frame;
    if (!el) return;
    if (still) {
      el.style.setProperty("--pan", "0");
      return;
    }
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pointer = 0;
    let pan = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const box = el.getBoundingClientRect();
      pointer = Math.max(-1, Math.min(1, ((e.clientX - box.left) / box.width) * 2 - 1));
    };
    const onLeave = () => (pointer = 0);
    const tick = (now: number) => {
      const sway = calm ? 0 : Math.sin(now / 2600) * 0.45;
      pan += (Math.max(-1, Math.min(1, sway - pointer)) - pan) * 0.06;
      el.style.setProperty("--pan", pan.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  });

  // A hit: the set rattles and the neon flares. The fighters' canvas is not part of the set.
  $effect(() => {
    if (!jolt || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const power = Math.min(1, jolt % 1 || 1);
    const d = 3 + power * 7;
    scenery?.animate(
      [
        { transform: `translate(${d}px, ${-d * 0.6}px)` },
        { transform: `translate(${-d * 0.7}px, ${d * 0.5}px)` },
        { transform: `translate(${d * 0.4}px, ${d * 0.2}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: 240, easing: "cubic-bezier(0.2, 0.9, 0.3, 1)" },
    );
    neon?.animate([{ opacity: 1.9, scale: 1.35 }, { opacity: 1, scale: 1 }], { duration: 420, easing: "ease-out" });
  });
</script>

<div bind:this={frame} class="diorama {mood}" role="img" aria-label={label} style:--top-share={STAGE_TOP_SHARE}>
  <div bind:this={scenery} class="scenery">
    <img class="plate sky" style:--depth="0.15" src="/arena/diner/sky.webp" alt="" />
    <div class="box">
      <img class="plate skyline" style:--depth="0.45" src="/arena/diner/skyline.webp" alt="" />
      <div bind:this={neon} class="plate neon-spill" style:--depth="0.45"></div>
      <img class="plate wing left" style:--depth="1" src="/arena/diner/wing.webp" alt="" />
      <img class="plate wing right" style:--depth="1" src="/arena/diner/wing.webp" alt="" />
      <img class="plate wall cut" style:--depth="1" src="/arena/diner/wall.webp" alt="" />
      <div class="plate haze" style:--depth="1"></div>
      <img class="plate props cut" style:--depth="1.3" src="/arena/diner/props.webp" alt="" />
      <div class="plate jukebox-glow" style:--depth="1.3"></div>

      {#each floorRows as row (row.strip)}
        <div
          class="plate floor"
          style:--depth={row.depth}
          style:top="{row.top}px"
          style:height="{row.height}px"
          style:background-image="url(/arena/diner/floor-{row.strip}.webp)"
          class:front={row.strip === 5}
        ></div>
      {/each}
      <div class="seam"></div>
      <div class="lamp-pools"></div>
      <div class="plate valance" style:--depth="3.2"></div>
    </div>
    <div class="grain"></div>
    <div class="vignette"></div>
  </div>

  {#if spot}<div class="box"><div class="spots"></div></div>{/if}
  {#if children}
    <div class="box">{@render children()}</div>
  {/if}
  {#if overlay}<div class="overlay">{@render overlay()}</div>{/if}
</div>

<style>
  .diorama {
    --pan: 0;
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--night);
    isolation: isolate;
  }
  .scenery {
    position: absolute;
    inset: 0;
    transition: filter 0.7s ease;
  }
  /* House lights down for the menus. */
  .dim .scenery {
    filter: brightness(0.56) saturate(0.9);
  }
  /* The final bell: the world drops to an ink wash and only the fighters keep their colour. */
  .ko .scenery {
    filter: grayscale(0.92) brightness(0.72) contrast(1.05);
  }
  /* The stage box. `cqh` here is the frame; inside the box it is the box. */
  .box {
    position: absolute;
    left: 50%;
    top: calc((100cqh - 720px) * var(--top-share));
    width: 1280px;
    height: 720px;
    margin-left: -640px;
  }
  .plate {
    position: absolute;
    max-width: none;
    transform: translate3d(calc(var(--pan) * var(--depth) * 9.6px), 0, 0);
    will-change: transform;
  }
  /* Cut paper: every plate drops a shadow onto the plate behind it. */
  .cut {
    filter: drop-shadow(0 4px 4px rgb(20 27 51 / 0.45));
  }
  .sky {
    left: -8%;
    top: -4%;
    width: 116%;
    height: 78%;
    object-fit: cover;
  }
  .skyline {
    left: 41%;
    top: 21%;
    height: 29%;
    margin-left: -587px;
    filter: saturate(0.8) brightness(0.9);
  }
  .neon-spill {
    left: 24%;
    top: 10%;
    width: 22%;
    height: 34%;
    background: radial-gradient(closest-side, rgb(255 90 74 / 0.4), transparent);
    mix-blend-mode: screen;
    animation: neon 5s steps(1) infinite;
  }
  .wall {
    left: 50%;
    top: 0;
    height: 74%;
    margin-left: -772.5px;
  }
  /* The wings: more diner past the stage box, seen only when the window is wider than 16:9. */
  .wing {
    top: -30%;
    height: 160%;
    filter: brightness(0.82);
  }
  .wing.left {
    right: calc(100% + 96px);
  }
  .wing.right {
    left: calc(100% + 96px);
    scale: -1 1;
  }
  /* Air between the camera and the back wall: far things go paler and cooler. */
  .haze {
    inset: -40% -60% 26%;
    background: linear-gradient(rgb(143 179 201 / 0.14), rgb(246 236 212 / 0.26));
    pointer-events: none;
  }
  .props {
    left: 3%;
    width: 94%;
    bottom: 26.5%;
  }
  /* The jukebox breathes. */
  .jukebox-glow {
    left: 66.5%;
    top: 40%;
    width: 13%;
    height: 34%;
    background: radial-gradient(closest-side, rgb(255 205 96 / 0.55), transparent);
    mix-blend-mode: screen;
    animation: breathe 2.4s ease-in-out infinite alternate;
  }
  .floor {
    left: -75%;
    width: 250%;
    background-repeat: repeat-x;
    background-size: auto 100%;
    background-position: 50% 0;
    box-shadow: 0 -4px 6px rgb(20 27 51 / 0.38);
  }
  /* The nearest strip carries on below the stage box for windows taller than 16:9. */
  .floor.front {
    background-size: auto 150px;
    background-repeat: repeat;
  }
  /* Warm pools where the pendant lamps hit the floor, and a dark seam where wall meets floor. */
  .lamp-pools {
    position: absolute;
    inset: 66% -20% -30%;
    background:
      radial-gradient(ellipse 22% 34% at 30% 34%, rgb(255 226 150 / 0.5), transparent 70%),
      radial-gradient(ellipse 22% 34% at 70% 34%, rgb(255 226 150 / 0.5), transparent 70%);
    mix-blend-mode: soft-light;
    pointer-events: none;
  }
  .seam {
    position: absolute;
    inset: 69% -60% auto;
    height: 9%;
    background: linear-gradient(transparent, rgb(15 18 32 / 0.5) 38%, transparent);
    pointer-events: none;
  }
  /* The awning across the top of the theatre: the scoreboard hangs on it. */
  .valance {
    left: -75%;
    width: 250%;
    bottom: calc(100% - 132px);
    height: 600px;
    background:
      url("/arena/diner/valance.webp") 50% 100% / auto 150px repeat-x,
      linear-gradient(#2a3564, #2a3564) 0 0 / 100% calc(100% - 140px) no-repeat;
    filter: drop-shadow(0 7px 7px rgb(10 14 34 / 0.5));
  }
  .overlay {
    position: absolute;
    inset: 0;
  }
  /* Watercolour mottling and paper tooth over everything, so the plates sit on one sheet. */
  .grain {
    position: absolute;
    inset: 0;
    background:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cfilter id='m'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012' numOctaves='3' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 0.25 0 0 0 0 0.3 0 0 0 0 0.3 0.9 0 0 0 -0.25'/%3E%3C/filter%3E%3Crect width='600' height='600' filter='url(%23m)'/%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.17 0 0 0 0 0.15 0 0 0 0 0.13 0 0 0 0.35 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E");
    mix-blend-mode: multiply;
    opacity: 0.4;
    pointer-events: none;
  }
  /* Two cones of light from above, landing on the corners at a third and two thirds across. */
  .spots {
    position: absolute;
    inset: -40% 0 -30%;
    background:
      radial-gradient(ellipse 230px 46% at 33% 62%, rgb(255 228 160 / 0.36), transparent 72%),
      radial-gradient(ellipse 230px 46% at 67% 62%, rgb(255 228 160 / 0.36), transparent 72%);
    mix-blend-mode: screen;
    pointer-events: none;
  }
  .vignette {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 55%, transparent 58%, rgb(12 17 38 / 0.5));
    pointer-events: none;
  }
  @keyframes neon {
    0%, 100% { opacity: 1; }
    47% { opacity: 0.55; }
    49% { opacity: 1; }
    52% { opacity: 0.7; }
    54% { opacity: 1; }
  }
  @keyframes breathe {
    from { opacity: 0.45; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .neon-spill, .jukebox-glow { animation: none; }
  }
</style>
