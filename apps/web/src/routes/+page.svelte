<script lang="ts">
  import { goto } from "$app/navigation";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import TitleScene from "#lib/components/shell/title-scene.svelte";
  import { SITE_NAME } from "#lib/site.js";

  function onKey(e: KeyboardEvent) {
    if (e.code === "Enter" || e.code === "Space") void goto("/fighters");
  }
</script>

<svelte:window onkeydown={onKey} />

<main class="absolute inset-0">
  <TitleScene>
    <h1 class="logo">
      <img src="/title/logo.webp" alt={SITE_NAME} />
      <img class="sticker" src="/title/sticker.webp" alt="Powered by System One!" />
    </h1>
    <nav class="menu" aria-label="Main menu">
      <SignButton href="/fighters" size="lg">Play</SignButton>
    </nav>
  </TitleScene>
</main>

<style>
  .logo {
    position: absolute;
    left: 50%;
    top: 3.5%;
    width: 540px;
    margin: 0 0 0 -270px;
    filter: drop-shadow(0 12px 9px rgb(12 17 38 / 0.5));
    animation:
      drop 0.9s cubic-bezier(0.25, 1.4, 0.4, 1) backwards,
      bob 5s 0.9s ease-in-out infinite alternate;
  }
  .logo img {
    display: block;
    width: 100%;
    /* The marquee bulbs breathe. */
    animation: bulbs 1.8s ease-in-out infinite alternate;
  }
  /* Slapped on the corner of the sign, a beat after it lands. */
  .logo .sticker {
    position: absolute;
    left: -186px;
    bottom: -100px;
    width: 190px;
    rotate: -11deg;
    filter: drop-shadow(0 6px 5px rgb(12 17 38 / 0.55));
    animation: slap 0.45s 1s cubic-bezier(0.3, 1.7, 0.5, 1) backwards;
  }
  .menu {
    position: absolute;
    inset: auto 0 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    animation: rise 0.6s 0.55s cubic-bezier(0.2, 1, 0.3, 1) backwards;
  }
  @keyframes drop {
    from {
      translate: 0 -120%;
      rotate: -7deg;
    }
  }
  @keyframes slap {
    from {
      opacity: 0;
      scale: 2.2;
      rotate: 14deg;
    }
  }
  @keyframes bob {
    from { translate: 0 0; rotate: -0.6deg; }
    to { translate: 0 7px; rotate: 0.6deg; }
  }
  @keyframes bulbs {
    from { filter: brightness(0.97); }
    to { filter: brightness(1.08) drop-shadow(0 0 10px rgb(255 206 96 / 0.55)); }
  }
  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 40px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .logo, .logo img, .logo .sticker, .menu { animation: none; }
  }
</style>
