<script lang="ts">
  import { page } from "$app/state";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import { brainsFrom, setupQuery } from "#lib/shell/brains.js";
  import { picksFrom } from "#lib/shell/roster.js";

  const picks = $derived(picksFrom(page.url.searchParams));
  // The brains picked at fighter select ride through in the query.
  const brains = $derived(brainsFrom(page.url.searchParams));

  // Suggestions, not open text. The orders don't reach the fight yet.
  const plans = ["Rush in", "Keep your distance", "Wait and counter", "Dealer's choice"];
  let plan = $state<[string, string]>([plans[3], plans[3]]);
</script>

<svelte:head><title>The game plan</title></svelte:head>

<main class="absolute inset-0">
  <DinerDiorama label="The diner with the house lights down" mood="dim">
    <section class="board">
      <h1>The game plan</h1>
      <div class="sides">
        {#each picks as def, side (side)}
          <fieldset>
            <legend>{def.name}</legend>
            {#each plans as option (option)}
              <label>
                <input type="radio" class="sr-only" name="plan-{side}" value={option} bind:group={plan[side]} />
                <span>{option}</span>
              </label>
            {/each}
          </fieldset>
        {/each}
      </div>
      <p class="small">Chalk talk only for now: orders don't change the fight yet.</p>
    </section>
  </DinerDiorama>

  <div class="absolute top-[26px] left-[22px]"><SignButton href="/match{setupQuery(picks, brains, page.url.searchParams)}" tone="cream" size="sm">Back</SignButton></div>
</main>

<style>
  /* Placed in the stage box (1280 x 720). The chalkboard's slate starts about 9% in from its frame. */
  .board {
    position: absolute;
    left: 50%;
    top: 136px;
    width: 800px;
    height: 442px;
    margin-left: -400px;
    padding: 62px 96px 84px;
    background: url("/ui/chalkboard.webp") center / 100% 100% no-repeat;
    color: #f3efe2;
    font-family: var(--font-display);
    text-align: center;
    filter: drop-shadow(0 12px 9px rgb(10 14 34 / 0.6));
  }
  h1 {
    font-size: 40px;
    line-height: 1;
    rotate: -1.5deg;
  }
  .sides {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 18px;
  }
  fieldset {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    border: 0;
  }
  legend {
    margin: 0 auto 6px;
    font-size: 27px;
    color: var(--mustard);
  }
  label {
    cursor: pointer;
  }
  label span {
    display: block;
    padding: 1px 16px;
    font-size: 21px;
    opacity: 0.6;
    border: 3px solid transparent;
    border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
    transition: opacity 0.15s;
  }
  label:hover span {
    opacity: 0.9;
  }
  /* The chosen order gets a chalk ring. */
  input:checked + span {
    opacity: 1;
    border-color: #f3efe2;
    rotate: -1deg;
  }
  input:focus-visible + span {
    outline: 3px solid var(--mustard);
    outline-offset: 3px;
  }
  .small {
    margin-top: 16px;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    opacity: 0.75;
  }
</style>
