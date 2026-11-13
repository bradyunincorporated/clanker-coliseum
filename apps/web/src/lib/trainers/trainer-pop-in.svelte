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
  .coach-pop-in { --entry: -110%; position: absolute; z-index: 12; left: 0; bottom: 13%; display: flex; align-items: end; width: min(38%, 430px); pointer-events: none; animation: coach-visit 4s both; }
  .coach-pop-in.right { --entry: 110%; left: auto; right: 0; flex-direction: row-reverse; }
  img { flex: 0 0 auto; width: clamp(100px, 13cqw, 180px); height: auto; image-rendering: pixelated; filter: drop-shadow(3px 4px 0 #10152270); }
  .right img { transform: scaleX(-1); }
  .speech { position: relative; min-width: 0; margin: 0 0 48px -16px; padding: 10px 14px; color: #17212a; background: #fff6d9; border: 3px solid #17212a; border-radius: 14px 14px 14px 2px; box-shadow: 3px 4px 0 #17212a50; }
  .right .speech { margin-left: 0; margin-right: -16px; border-radius: 14px 14px 2px 14px; }
  strong { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; opacity: .65; }
  p { margin: 3px 0 0; font-size: clamp(13px, 1.4cqw, 18px); font-weight: 800; line-height: 1.2; overflow-wrap: anywhere; }
  @keyframes coach-visit { 0%, 100% { transform: translateX(var(--entry)); opacity: 0; visibility: hidden; } 7%, 88% { transform: translateX(0); opacity: 1; visibility: visible; } }
  @media (prefers-reduced-motion: reduce) { .coach-pop-in { animation-name: coach-fade; } }
  @keyframes coach-fade { 0%, 100% { opacity: 0; visibility: hidden; } 1%, 95% { opacity: 1; visibility: visible; } }
</style>
