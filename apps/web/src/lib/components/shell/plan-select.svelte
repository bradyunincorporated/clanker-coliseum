<script lang="ts">
  import { GAME_PLANS, GAME_PLAN_IDS, type GamePlanId } from "@clanker/game";

  /**
   * One corner's game plan: a paper order slip. Step through the presets with the arrows;
   * the slip always shows the exact order the fighter's brain will read. Presets only.
   */
  let { value = $bindable(), side }: { value: GamePlanId; side: 0 | 1 } = $props();

  const plan = $derived(GAME_PLANS[value]);

  function step(by: number) {
    const at = GAME_PLAN_IDS.indexOf(value);
    value = GAME_PLAN_IDS[(at + by + GAME_PLAN_IDS.length) % GAME_PLAN_IDS.length];
  }
</script>

<div class="slip" role="group" aria-label="Game plan for player {side + 1}">
  <p class="kicker">Game plan</p>
  <div class="pick">
    <button type="button" onclick={() => step(-1)} aria-label="Previous game plan">
      <img src="/ui/arrow.webp" alt="" />
    </button>
    <p class="label" aria-live="polite">{plan.label}</p>
    <button type="button" class="next" onclick={() => step(1)} aria-label="Next game plan">
      <img src="/ui/arrow.webp" alt="" />
    </button>
  </div>
  {#key value}
    <p class="order">
      {#if plan.directive}&ldquo;{plan.directive}&rdquo;{:else}No standing order. The fighter's brain plays it its own way.{/if}
    </p>
  {/key}
</div>

<style>
  .slip {
    width: 304px;
    min-height: 112px;
    padding: 0 2px 2px;
    border: 15px solid transparent;
    border-image: url("/ui/card.webp") 215 fill / 15px;
    color: var(--ink);
    text-align: center;
    filter: drop-shadow(0 6px 5px rgb(10 14 34 / 0.55));
  }
  .kicker {
    font-family: var(--font-display);
    font-size: 11.5px;
    line-height: 1;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--hero-red);
  }
  .pick {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 1px;
  }
  .label {
    min-width: 176px;
    font-family: var(--font-display);
    font-size: 21px;
    line-height: 1.15;
  }
  button {
    flex: none;
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    filter: drop-shadow(0 2px 0 rgb(27 33 64 / 0.75));
    transition: scale 0.15s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  button img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  button.next img {
    scale: -1 1;
  }
  button:hover,
  button:focus-visible {
    scale: 1.2;
  }
  button:active {
    scale: 0.9;
  }
  /* The preset's real wording, to read and not to edit. */
  .order {
    margin-top: 3px;
    font-size: 12.5px;
    font-weight: 600;
    line-height: 1.25;
    text-wrap: balance;
    animation: write 0.25s ease-out;
  }
  @keyframes write {
    from {
      opacity: 0;
      translate: 0 4px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .order { animation: none; }
  }
</style>
