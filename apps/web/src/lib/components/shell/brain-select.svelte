<script lang="ts">
  import type { BrainKind, HealthResponse } from "@clanker/arena-service/protocol";
  import { isModelBrain } from "@clanker/arena-service/protocol";
  import { BRAIN_OPTIONS, brainCard } from "#lib/shell/brains.js";

  /**
   * One fighter's brain, picked like a jukebox selection: step through the options with the
   * arrows. Shows the maker's mark on a badge, the model's name and its official model id. Each fighter has its own; nothing is shared between corners.
   */
  interface Props {
    value: BrainKind;
    side: 0 | 1;
    /** From /api/health, when the page has it: marks models that failed the startup check. */
    models?: HealthResponse["models"] | null;
    class?: string;
  }
  let { value = $bindable(), side, models = null, class: className = "" }: Props = $props();

  const card = $derived(brainCard(value));
  const down = $derived(isModelBrain(value) && models ? !models[value].ready : false);

  function step(by: number) {
    const at = Math.max(0, BRAIN_OPTIONS.findIndex((b) => b.id === value));
    value = BRAIN_OPTIONS[(at + by + BRAIN_OPTIONS.length) % BRAIN_OPTIONS.length].id;
  }
</script>

<div class="brain {className}" role="group" aria-label="Brain for player {side + 1}">
  <button type="button" class="step" onclick={() => step(-1)} aria-label="Previous brain">
    <img src="/ui/arrow.webp" alt="" />
  </button>
  <div class="plate" aria-live="polite">
    {#if card.logo}<span class="badge"><img src={card.logo} alt="" /></span>{/if}
    <p class="text">
      <span class="name">{card.label}</span>
      <span class="sub" title={down && isModelBrain(value) ? models?.[value].reason : undefined}>
        {#if down}offline, the heuristic fills in{:else}{card.modelId || card.tagline}{/if}
      </span>
    </p>
  </div>
  <button type="button" class="step next" onclick={() => step(1)} aria-label="Next brain">
    <img src="/ui/arrow.webp" alt="" />
  </button>
</div>

<style>
  .brain {
    display: flex;
    align-items: center;
    gap: 2px;
    width: 340px;
  }
  .plate {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    flex: 1;
    min-width: 0;
    height: 62px;
    padding: 0 26px;
    background: url("/ui/sign-teal.webp") center / 100% 100% no-repeat;
    filter: drop-shadow(0 5px 4px rgb(10 14 34 / 0.55));
  }
  /* Every maker's mark gets the same cream button with an inked rim. */
  .badge {
    display: grid;
    flex: none;
    place-items: center;
    width: 34px;
    height: 34px;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: var(--paper);
    box-shadow: 0 2px 0 rgb(16 74 82 / 0.9);
  }
  .badge img {
    width: 20px;
    height: 20px;
    object-fit: contain;
  }
  .text {
    display: flex;
    min-width: 0;
    flex-direction: column;
    text-align: center;
    line-height: 1.05;
  }
  .name {
    font-family: var(--font-display);
    font-size: 19px;
    color: var(--paper);
    text-shadow: 0 2px 0 rgb(16 74 82 / 0.9);
    white-space: nowrap;
  }
  .sub {
    overflow: hidden;
    font-size: 11.5px;
    font-weight: 600;
    color: #06323a;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .step {
    flex: none;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    filter: drop-shadow(0 3px 3px rgb(10 14 34 / 0.55));
    transition: scale 0.15s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .step img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .step.next img {
    scale: -1 1;
  }
  .step:hover,
  .step:focus-visible {
    scale: 1.18;
  }
  .step:active {
    scale: 0.92;
  }
</style>
