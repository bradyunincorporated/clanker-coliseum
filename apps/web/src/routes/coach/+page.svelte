<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "#lib/components/ui/button/index.js";
  import FighterPortrait from "#lib/components/shell/fighter-portrait.svelte";
  import BrainSelect from "#lib/components/shell/brain-select.svelte";
  import { brainsFrom, setupQuery, type Brains } from "#lib/shell/brains.js";
  import { cssColor, picksFrom } from "#lib/shell/roster.js";

  const picks = $derived(picksFrom(page.url.searchParams));

  // The brains picked on the fighter page; this one choice does reach the fight.
  let brains = $state<Brains>(brainsFrom(page.url.searchParams));

  // Suggestion chips, not open text. The orders don't reach the fight yet.
  const plans = ["Rush in", "Keep your distance", "Wait and counter", "Dealer's choice"];
  let plan = $state<[string, string]>([plans[3], plans[3]]);
</script>

<svelte:head><title>The game plan</title></svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-3">
  <header class="text-center">
    <p class="callout text-sm tracking-[0.3em] text-bottle">Step two</p>
    <h1 class="font-script text-6xl leading-none text-hero drop-shadow-[4px_4px_0_var(--ink)]">The game plan</h1>
    <p class="callout mx-auto mt-2 inline-block -rotate-1 rounded-sm border-[3px] border-dashed border-hero px-4 py-1 text-sm text-hero">
      Preview only: the orders don't change the fight yet
    </p>
  </header>

  <section class="grid gap-6 md:grid-cols-2">
    {#each picks as def, side (side)}
      <article class="rounded-lg border-4 border-ink bg-paper shadow-offset-lg">
        <div class="flex items-center gap-4 border-b-4 border-ink bg-panel px-4 py-3">
          <FighterPortrait color={cssColor(def.sprites.color)} accent={cssColor(def.sprites.accent)} label="" flip={side === 1} class="size-20 shrink-0 rounded-full border-[3px] border-ink" />
          <div>
            <p class="callout text-sm text-paper">{side === 0 ? "Left corner" : "Right corner"}</p>
            <h2 class="font-script text-5xl leading-none text-hero [text-shadow:2px_2px_0_var(--paper)]">{def.name}</h2>
          </div>
        </div>

        <div class="flex flex-col gap-3 p-4">
          <fieldset>
            <legend class="font-slab text-lg uppercase">Coach's orders</legend>
            <div class="mt-2 flex flex-wrap gap-2">
              {#each plans as option (option)}
                <label class="cursor-pointer">
                  <input type="radio" class="peer sr-only" name="plan-{side}" value={option} bind:group={plan[side]} />
                  <span class="block rounded-full border-[3px] border-ink bg-paper-deep px-4 py-1.5 text-sm font-bold transition-colors peer-checked:bg-teal peer-checked:text-paper peer-focus-visible:outline-3 peer-focus-visible:outline-hero">{option}</span>
                </label>
              {/each}
            </div>
          </fieldset>

          <BrainSelect bind:value={brains[side]} side={side as 0 | 1} class="self-start" />

          <!-- Coach callout in a hand-drawn red bubble outline. -->
          <p class="relative self-start rounded-[2rem_2rem_2rem_0.4rem] border-[3px] border-hero px-5 py-3 font-medium">
            <span class="callout text-hero">Coach says:</span>
            "{plan[side]}, {def.name}!"
          </p>
        </div>
      </article>
    {/each}
  </section>

  <div class="flex flex-wrap items-center justify-center gap-4">
    <Button href="/fighters{setupQuery(picks, brains)}" variant="secondary">Back</Button>
    <Button href="/arena{setupQuery(picks, brains)}" size="lg">To the arena</Button>
  </div>
</main>
