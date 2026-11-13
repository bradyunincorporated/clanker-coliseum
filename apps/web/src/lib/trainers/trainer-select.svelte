<script lang="ts">
  import { TRAINERS, trainerSprite, type TrainerId } from "./roster.js";

  let { value = $bindable<TrainerId>("ethan"), side }: {
    value?: TrainerId;
    side: 0 | 1;
  } = $props();
</script>

<fieldset class="trainer-select">
  <legend class="lettering">Your coach</legend>
  <div class="choices">
    {#each TRAINERS as trainer (trainer.id)}
      <label class:selected={value === trainer.id}>
        <input type="radio" name="trainer-{side}" value={trainer.id} bind:group={value}
          aria-label="{side === 0 ? 'Left' : 'Right'} coach {trainer.name}" />
        <img src={trainerSprite(trainer.id, "front")} alt="" width="80" height="80" />
        <span>{trainer.name}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  .trainer-select { min-width: 0; border: 0; padding: 0; margin: 0; }
  legend { margin-bottom: 5px; font-size: 19px; }
  .choices { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3px; }
  label { position: relative; display: grid; justify-items: center; padding: 0 0 5px; border: 2px solid transparent; border-radius: 10px; cursor: pointer; transition: translate 150ms, background 150ms; }
  label:hover { translate: 0 -3px; background: #f6ecd414; }
  label.selected { border-color: var(--mustard); background: #edb93c20; }
  label:focus-within { outline: 2px solid var(--paper); outline-offset: 3px; }
  input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  img { width: 80px; max-width: none; height: 80px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 3px 2px #0c112680); }
  span { font-family: var(--font-display); font-size: 13px; line-height: 1; color: var(--paper); text-shadow: 0 2px var(--ink); }
  @media (prefers-reduced-motion: reduce) { label { transition: none; } }
</style>
