<script lang="ts">
  // A cardboard stand-in where a fighter will stand, with the shadows a real one will get:
  // a tight dark contact shadow at the feet and a long soft one thrown toward the camera.
  let { name, color, x, flip = false }: { name: string; color: string; x: number; flip?: boolean } = $props();
</script>

<div class="standee" style:left="{x}%">
  <div class="cast"></div>
  <div class="contact"></div>
  <svg viewBox="0 0 120 170" class="card" style:transform={flip ? "scaleX(-1)" : undefined} aria-hidden="true">
    <path d="M14 168c-4-48 4-84 22-100-12-30 6-60 34-60s44 30 30 60c16 18 20 54 16 100z" fill="var(--paper)" stroke="var(--ink)" stroke-width="3.5" stroke-linejoin="round" />
    <path d="M24 162c-2-40 6-70 22-86-10-26 4-52 26-52s34 26 22 52c14 16 16 48 14 86z" fill={color} opacity="0.85" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 4" />
    <circle cx="84" cy="54" r="5" fill="var(--ink)" />
  </svg>
  <p class="tag">{name}</p>
</div>

<style>
  .standee {
    position: absolute;
    bottom: 12.5%;
    width: 15cqw;
    height: 37cqh;
    translate: -50% 0;
  }
  .card {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0.3cqw 0 0 rgb(43 37 34 / 0.6));
  }
  .contact {
    position: absolute;
    left: -14%;
    right: -14%;
    bottom: -2.6cqh;
    height: 5.2cqh;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgb(15 18 32 / 0.85) 40%, rgb(15 18 32 / 0.4) 70%, transparent);
  }
  .cast {
    position: absolute;
    left: -4%;
    right: -4%;
    bottom: -11cqh;
    height: 11cqh;
    border-radius: 0 0 50% 50% / 0 0 100% 100%;
    background: linear-gradient(rgb(15 18 32 / 0.55), transparent);
    filter: blur(0.6cqh);
  }
  .tag {
    position: absolute;
    left: 50%;
    bottom: 100%;
    translate: -50% -0.6cqh;
    rotate: -3deg;
    padding: 0.2cqh 1cqw;
    border: 0.3cqh solid var(--ink);
    border-radius: 0.4cqh;
    background: var(--mustard);
    font-family: var(--font-slab);
    font-size: 2.6cqh;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: 0.4cqh 0.4cqh 0 var(--ink);
  }
</style>
