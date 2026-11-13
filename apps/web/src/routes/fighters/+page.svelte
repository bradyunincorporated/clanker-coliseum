<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "#lib/components/ui/button/index.js";
  import FighterPortrait from "#lib/components/shell/fighter-portrait.svelte";
  import { ROSTER, cssColor, fighterArt, picksFrom, picksQuery } from "#lib/shell/roster.js";

  const initial = picksFrom(page.url.searchParams);
  let picks = $state<[string, string]>([initial[0].id, initial[1].id]);
  const chosen = $derived(picks.map((id) => ROSTER.find((f) => f.id === id) ?? ROSTER[0]));
  const corners = ["Left corner", "Right corner"];
</script>

<svelte:head><title>Pick your clankers</title></svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
  <header class="text-center">
    <p class="callout text-sm tracking-[0.3em] text-bottle">Step one</p>
    <h1 class="font-script text-6xl leading-none text-hero drop-shadow-[4px_4px_0_var(--ink)] sm:text-7xl">Pick your clankers</h1>
  </header>

  <section class="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-start">
    {#each [0, 1] as side (side)}
      {@const def = chosen[side]}
      <article class="flex flex-col gap-4 {side === 1 ? 'md:order-3' : ''}">
        <div class="rounded-lg border-4 border-ink bg-panel shadow-offset-lg">
          <p class="callout flex items-center justify-between border-b-4 border-ink bg-ink px-4 py-1.5 text-sm text-paper">
            {corners[side]}
            <span class="flex gap-1">
              {#each def.types as type (type)}
                <span class="rounded-sm bg-mustard px-2 text-xs text-ink">{type}</span>
              {/each}
            </span>
          </p>
          <div class="relative p-4">
            <FighterPortrait src={fighterArt(def)} color={cssColor(def.sprites.color)} accent={cssColor(def.sprites.accent)} flip={side === 1} class="aspect-[4/3] rounded border-[3px] border-ink" />
            <h2 class="absolute bottom-1 font-script text-6xl leading-none text-hero [text-shadow:3px_3px_0_var(--paper)] right-6">
              {def.name}
            </h2>
          </div>
        </div>

        <div class="relative -mt-1 rounded-md border-[3px] border-ink bg-paper p-4 shadow-offset {side === 1 ? '-rotate-1' : 'rotate-1'}">
          <p class="font-medium">"{def.blurb}"</p>
          <p class="callout mt-3 text-sm text-hero">Built in: {def.passive.name}</p>
          <p class="text-sm">{def.passive.description}</p>
          <ul class="mt-3 grid grid-cols-2 gap-2 text-sm">
            {#each Object.values(def.moves) as move (move.name)}
              <li class="rounded-sm border-2 border-ink bg-paper-deep px-2 py-1">
                <span class="block font-bold leading-tight">{move.name}</span>
                <span class="callout text-xs text-bottle">{move.type} · {move.damage} dmg</span>
              </li>
            {/each}
          </ul>
        </div>

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
      </article>
      {#if side === 0}
        <p class="self-center text-center font-script text-7xl text-hero drop-shadow-[3px_3px_0_var(--ink)] md:order-2 md:pt-24">vs.</p>
      {/if}
    {/each}
  </section>

  <div class="flex flex-wrap items-center justify-center gap-4">
    <Button href="/" variant="secondary">Back</Button>
    <Button href="/match{picksQuery([{ id: picks[0] }, { id: picks[1] }])}" size="lg">Next: start a match</Button>
  </div>
</main>
