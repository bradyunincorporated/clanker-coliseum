<script lang="ts">
  import { page } from "$app/state";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import { GAME_PLANS, GAME_PLAN_IDS } from "@clanker/game";
  import { brainsFrom, setupQuery } from "#lib/shell/brains.js";
  import { plansFrom, withPlans, type Plans } from "#lib/shell/coach-setup.js";
  import { picksFrom } from "#lib/shell/roster.js";

  const picks = $derived(picksFrom(page.url.searchParams));
  // The brains picked at fighter select ride through in the query.
  const brains = $derived(brainsFrom(page.url.searchParams));

  // Presets, not open text. Each side's order rides in the query (`g1`, `g2`) to the lobby,
  // which hands it to the service; it then stands for the whole fight.
  let plan = $state<Plans>(plansFrom(page.url.searchParams));
  const carried = $derived(withPlans(page.url.searchParams, plan));
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
            {#each GAME_PLAN_IDS as id (id)}
              <label>
                <input type="radio" class="sr-only" name="plan-{side}" value={id} bind:group={plan[side]} />
                <span>{GAME_PLANS[id].label}</span>
              </label>
            {/each}
          </fieldset>
        {/each}
      </div>
      <p class="small">Standing orders for the whole fight. Shout calls once the bell rings.</p>
    </section>
  </DinerDiorama>

  <div class="absolute top-[26px] left-[22px]"><SignButton href="/match{setupQuery(picks, brains, carried)}" tone="cream" size="sm">Back</SignButton></div>
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
