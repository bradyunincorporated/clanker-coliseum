<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "#lib/components/ui/button/index.js";
  import FighterPortrait from "#lib/components/shell/fighter-portrait.svelte";
  import BrainSelect from "#lib/components/shell/brain-select.svelte";
  import { brainsFrom, setupQuery, type Brains } from "#lib/shell/brains.js";
  import { ROSTER, cssColor, picksFrom } from "#lib/shell/roster.js";

  const initial = picksFrom(page.url.searchParams);
  let picks = $state<[string, string]>([initial[0].id, initial[1].id]);
  // Each corner picks its own brain; the choice rides along in the query (`b1`, `b2`).
  let brains = $state<Brains>(brainsFrom(page.url.searchParams));
  const chosen = $derived(picks.map((id) => ROSTER.find((f) => f.id === id) ?? ROSTER[0]));
  const corners = ["Left corner", "Right corner"];
</script>

<svelte:head><title>Pick your clankers</title></svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4">
  <header class="text-center">
    <h1 class="font-script text-5xl leading-none text-hero drop-shadow-[3px_3px_0_var(--ink)]">Pick your clankers</h1>
  </header>

  <section class="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-start">
    {#each [0, 1] as side (side)}
      {@const def = chosen[side]}
      <article class="flex flex-col gap-3 {side === 1 ? 'md:order-3' : ''}">
        <div class="rounded-lg border-4 border-ink bg-panel shadow-offset-lg">
          <p class="callout flex items-center justify-between border-b-4 border-ink bg-ink px-4 py-1.5 text-sm text-paper">
            {corners[side]}
            <span class="flex gap-1">
              {#each def.types as type (type)}
                <span class="rounded-sm bg-mustard px-2 text-xs text-ink">{type}</span>
              {/each}
            </span>
          </p>
          <div class="relative p-3">
            <FighterPortrait color={cssColor(def.sprites.color)} accent={cssColor(def.sprites.accent)} flip={side === 1} class="aspect-[16/6] rounded border-[3px] border-ink" />
            <h2 class="absolute bottom-1 font-script text-5xl leading-none text-hero [text-shadow:3px_3px_0_var(--paper)] right-6">
              {def.name}
            </h2>
          </div>
        </div>

        <div class="relative -mt-1 rounded-md border-[3px] border-ink bg-paper px-4 py-2.5 shadow-offset {side === 1 ? '-rotate-1' : 'rotate-1'}">
          <p class="font-medium">"{def.blurb}"</p>
          <p class="callout mt-1.5 text-sm text-hero">Built in: {def.passive.name}</p>
          <p class="text-sm">{def.passive.description}</p>
          <ul class="mt-2 grid grid-cols-4 gap-1.5 text-xs">
            {#each Object.values(def.moves) as move (move.name)}
              <li class="rounded-sm border-2 border-ink bg-paper-deep px-2 py-1">
                <span class="block font-bold leading-tight">{move.name}</span>
                <span class="callout text-xs text-bottle">{move.type} · {move.damage} dmg</span>
              </li>
            {/each}
          </ul>
        </div>

        <div class="flex flex-wrap items-end justify-between gap-3">
        <fieldset class="flex flex-wrap gap-2">
          <legend class="callout mb-1 text-sm">Who's in the {corners[side].toLowerCase()}?</legend>
          {#each ROSTER as f (f.id)}
            <label class="cursor-pointer">
              <input type="radio" class="peer sr-only" name="pick-{side}" value={f.id} bind:group={picks[side]} />
              <span class="flex items-center gap-2 rounded-md border-[3px] border-ink bg-paper px-3 py-2 font-slab uppercase shadow-offset transition-colors peer-checked:bg-mustard peer-focus-visible:outline-3 peer-focus-visible:outline-hero">
                <span class="size-5 rounded-full border-2 border-ink" style:background={cssColor(f.sprites.color)}></span>
                {f.name}
              </span>
            </label>
          {/each}
        </fieldset>
        <BrainSelect bind:value={brains[side]} side={side as 0 | 1} class="w-80" />
        </div>
      </article>
      {#if side === 0}
        <p class="self-center text-center font-script text-7xl text-hero drop-shadow-[3px_3px_0_var(--ink)] md:order-2 md:pt-16">vs.</p>
      {/if}
    {/each}
  </section>

  <div class="flex flex-wrap items-center justify-center gap-4">
    <Button href="/" variant="secondary">Back</Button>
    <Button href="/coach{setupQuery([{ id: picks[0] }, { id: picks[1] }], brains)}">Next: the game plan</Button>
  </div>
</main>
