<script lang="ts">
  // Where a fighter will stand on the stage: the fighter's own art when it has some, otherwise
  // a paper stand-in. Either way it gets the floor shadows a real fighter gets. Sizes are
  // stage-box pixels; `x` is a percentage across the box.
  let { name, color, src, x, flip = false }: { name: string; color: string; src?: string; x: number; flip?: boolean } = $props();
</script>

<div class="standee" class:has-art={!!src} style:left="{x}%">
  <div class="cast"></div>
  <div class="contact"></div>
  {#if src}
    <img class="sprite" {src} alt="" style:transform={flip ? "scaleX(-1)" : undefined} />
  {:else}
    <svg viewBox="0 0 120 170" class="card" style:transform={flip ? "scaleX(-1)" : undefined} aria-hidden="true">
      <path d="M14 168c-4-48 4-84 22-100-12-30 6-60 34-60s44 30 30 60c16 18 20 54 16 100z" fill="var(--paper)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
      <path d="M24 162c-2-40 6-70 22-86-10-26 4-52 26-52s34 26 22 52c14 16 16 48 14 86z" fill={color} stroke="var(--ink)" stroke-width="2.5" />
      <circle cx="84" cy="54" r="8" fill="var(--paper)" stroke="var(--ink)" stroke-width="3" />
      <circle cx="87" cy="54" r="3.5" fill="var(--ink)" />
    </svg>
  {/if}
  <p class="tag">{name}</p>
</div>

<style>
  .standee {
    position: absolute;
    bottom: 90px;
    width: 180px;
    height: 250px;
    translate: -50% 0;
  }
  .standee.has-art {
    width: 435px;
    height: 283px;
  }
  .card {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: drop-shadow(4px 0 0 rgb(27 33 64 / 0.6));
  }
  .sprite {
    position: absolute;
    bottom: -10%;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  .contact {
    position: absolute;
    left: -14%;
    right: -14%;
    bottom: -18px;
    height: 36px;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgb(12 17 38 / 0.8) 40%, rgb(12 17 38 / 0.35) 70%, transparent);
  }
  .cast {
    position: absolute;
    left: -4%;
    right: -4%;
    bottom: -70px;
    height: 70px;
    border-radius: 0 0 50% 50% / 0 0 100% 100%;
    background: linear-gradient(rgb(12 17 38 / 0.5), transparent);
    filter: blur(4px);
  }
  .has-art .contact,
  .has-art .cast {
    left: 30%;
    right: 30%;
  }
  .tag {
    position: absolute;
    left: 50%;
    bottom: 100%;
    translate: -50% -8px;
    rotate: -3deg;
    font-family: var(--font-display);
    font-size: 26px;
    line-height: 1;
    white-space: nowrap;
    color: var(--paper);
    paint-order: stroke fill;
    -webkit-text-stroke: 6px var(--ink);
    text-shadow: 0 3px 0 var(--ink);
  }
</style>
