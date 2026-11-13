<script lang="ts">
  import type { Snippet } from "svelte";

  /**
   * The title screen's world: the diner from outside at dusk, as a paper theatre. Painted
   * plates in /static/title slide past each other as the pointer moves. `children` is the
   * menu, drawn over the scene.
   */
  let { children }: { children?: Snippet } = $props();
  let scene: HTMLDivElement | undefined = $state();

  $effect(() => {
    const el = scene;
    if (!el) return;
    const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let pointer = 0;
    let pan = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => (pointer = Math.max(-1, Math.min(1, (e.clientX / window.innerWidth) * 2 - 1)));
    const tick = (now: number) => {
      const sway = calm ? 0 : Math.sin(now / 3200) * 0.4;
      pan += (Math.max(-1, Math.min(1, sway - pointer)) - pan) * 0.05;
      el.style.setProperty("--pan", pan.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  });
</script>

<div bind:this={scene} class="scene">
  <img class="sky" src="/title/sky.webp" alt="" />
  <div class="stars"></div>
  <img class="cloud c1" src="/title/cloud-1.webp" alt="" />
  <img class="cloud c2" src="/title/cloud-3.webp" alt="" />
  <img class="cloud c3" src="/title/cloud-2.webp" alt="" />
  <div class="strip far" style:--depth="0.5"></div>
  <div class="strip hedge" style:--depth="1.1"></div>
  <div class="plate diner" style:--depth="1.5">
    <img src="/title/diner.webp" alt="" />
    <div class="windows"></div>
  </div>
  <div class="strip lot" style:--depth="2.1"></div>
  <div class="plate car" style:--depth="2.5">
    <img src="/title/car.webp" alt="" />
    <div class="beam"></div>
  </div>
  <div class="strip grass" style:--depth="3.4"></div>
  <div class="dusk"></div>
  {@render children?.()}
</div>

<style>
  .scene {
    --pan: 0;
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: var(--navy);
    isolation: isolate;
  }
  .sky {
    position: absolute;
    left: -3%;
    top: -3%;
    width: 106%;
    height: 96%;
    object-fit: cover;
    object-position: 50% 30%;
  }
  .stars {
    position: absolute;
    inset: 0 0 55%;
    background:
      radial-gradient(circle, #fff6d8 1.2px, transparent 2px) 7% 30% / 310px 190px,
      radial-gradient(circle, #fff6d8 1.6px, transparent 2.4px) 60% 10% / 430px 260px;
    animation: twinkle 3.2s ease-in-out infinite alternate;
  }
  .cloud {
    position: absolute;
    filter: drop-shadow(0 6px 5px rgb(20 27 51 / 0.3));
    animation: drift linear infinite alternate;
  }
  .c1 { left: 6%; top: 9%; width: 230px; animation-duration: 46s; }
  .c2 { right: 5%; top: 17%; width: 190px; animation-duration: 58s; animation-direction: alternate-reverse; }
  .c3 { left: 31%; top: 4%; width: 110px; opacity: 0.9; animation-duration: 70s; }

  /* Strips run the full width of any window; plates sit in the middle of it. */
  .strip,
  .plate {
    position: absolute;
    transform: translate3d(calc(var(--pan) * var(--depth) * 9px), 0, 0);
    will-change: transform;
  }
  .strip {
    left: -6%;
    width: 112%;
    /* Each strip image is its own mirror image side by side, so it repeats without a seam. */
    background: 50% 100% / auto 100% repeat-x;
    filter: drop-shadow(0 -3px 4px rgb(20 27 51 / 0.3));
  }
  .far {
    bottom: 150px;
    height: 330px;
    background-image: url("/title/far.webp");
    opacity: 0.92;
  }
  .hedge {
    bottom: 142px;
    height: 104px;
    background-image: url("/title/hedge.webp");
    filter: brightness(0.8) drop-shadow(0 -3px 4px rgb(20 27 51 / 0.3));
  }
  .diner {
    left: 50%;
    bottom: 116px;
    width: 700px;
    margin-left: -300px;
    filter: drop-shadow(0 8px 7px rgb(12 17 38 / 0.5));
  }
  .diner img,
  .car img {
    display: block;
    width: 100%;
  }
  /* Warm light spilling out of the windows. */
  .windows {
    position: absolute;
    inset: 30% 4% 18%;
    background: radial-gradient(ellipse 50% 60% at 50% 50%, rgb(255 214 120 / 0.5), transparent 75%);
    mix-blend-mode: screen;
    animation: glow 4s ease-in-out infinite alternate;
  }
  .lot {
    bottom: 22px;
    height: 124px;
    background-image: url("/title/lot.webp");
  }
  .car {
    left: 50%;
    bottom: 62px;
    width: 236px;
    margin-left: -560px;
    filter: drop-shadow(0 7px 5px rgb(12 17 38 / 0.55));
  }
  .beam {
    position: absolute;
    left: -14%;
    top: 30%;
    width: 46%;
    height: 46%;
    background: radial-gradient(closest-side, rgb(255 226 140 / 0.75), transparent);
    mix-blend-mode: screen;
  }
  .grass {
    bottom: -14px;
    height: 96px;
    background-image: url("/title/grass.webp");
    filter: drop-shadow(0 -4px 5px rgb(12 17 38 / 0.45));
  }
  .dusk {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 90% 80% at 50% 45%, transparent 55%, rgb(12 17 38 / 0.36));
    pointer-events: none;
  }
  @keyframes drift {
    from { translate: -26px 0; }
    to { translate: 26px 0; }
  }
  @keyframes twinkle {
    from { opacity: 0.35; }
    to { opacity: 0.95; }
  }
  @keyframes glow {
    from { opacity: 0.6; }
    to { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cloud, .stars, .windows { animation: none; }
  }
</style>
