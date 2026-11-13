<script lang="ts">
  import { trainerFrom, trainerSprite } from "./roster.js";

  let { trainerId, side, message, callId }: {
    trainerId: string;
    side: 0 | 1;
    message: string;
    callId: string | number;
  } = $props();
  const trainer = $derived(trainerFrom(trainerId, side));
</script>

{#key callId}
  <aside class="coach-pop-in" class:right={side === 1} aria-label="{trainer.name} coaching {side === 0 ? 'left' : 'right'} corner">
    <img src={trainerSprite(trainer.id, "back")} alt="" width="80" height="80" />
    <div class="speech" role="status"><strong>{trainer.name}</strong><p>{message}</p></div>
  </aside>
{/key}

<style>
  .coach-pop-in { --entry: -360px; position: absolute; inset: 0; pointer-events: none; animation: coach-visit 4s both; }
  .coach-pop-in.right { --entry: 360px; }
  img { position: absolute; left: -20px; bottom: 0; width: 160px; height: 160px; image-rendering: pixelated; filter: drop-shadow(0 5px 4px #0c112680); }
  .right img { left: auto; right: -20px; transform: scaleX(-1); }
  .speech { position: absolute; right: 0; top: 0; width: 200px; min-height: 115px; display: flex; flex-direction: column; justify-content: center; padding: 22px 26px; color: var(--ink); background: url("/ui/card.webp") center / 100% 100% no-repeat; filter: drop-shadow(0 5px 4px #0c112680); rotate: -3deg; }
  .right .speech { right: auto; left: 0; rotate: 3deg; }
  strong { display: block; font-family: var(--font-display); font-size: 14px; color: var(--hero-red); }
  p { margin: 3px 0 0; font-size: 18px; font-weight: 600; line-height: 1.15; overflow-wrap: anywhere; }
  @keyframes coach-visit { 0%, 100% { transform: translateX(var(--entry)); opacity: 0; visibility: hidden; } 10%, 85% { transform: translateX(0); opacity: 1; visibility: visible; } }
  @media (prefers-reduced-motion: reduce) { .coach-pop-in { animation-name: coach-fade; } }
  @keyframes coach-fade { 0%, 100% { opacity: 0; visibility: hidden; } 1%, 95% { opacity: 1; visibility: visible; } }
</style>
