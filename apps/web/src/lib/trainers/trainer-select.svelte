<script lang="ts">
  import { TRAINERS, trainerSprite, type TrainerId } from "./roster.js";

  let { value = $bindable<TrainerId>("ethan"), side }: {
    value?: TrainerId;
    side: 0 | 1;
  } = $props();
</script>

<fieldset class="trainer-select">
  <legend>Your coach</legend>
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
  legend { margin-bottom: 3px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .09em; }
  .choices { display: flex; gap: 6px; }
  label { position: relative; display: grid; justify-items: center; min-width: 60px; padding: 2px 6px 4px; border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: background 120ms, border-color 120ms; }
  label:hover { background: #ffffff20; }
  label.selected { border-color: var(--mustard, #f2c85c); background: #f2c85c20; }
  label:focus-within { outline: 2px solid currentColor; outline-offset: 3px; }
  input { position: absolute; opacity: 0; width: 1px; height: 1px; }
  img { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; }
  span { font-size: 11px; font-weight: 800; line-height: 1; }
  @media (prefers-reduced-motion: reduce) { label { transition: none; } }
</style>
