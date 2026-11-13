<script lang="ts">
  import { page } from "$app/state";
  import { Button } from "#lib/components/ui/button/index.js";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import Standee from "#lib/components/shell/standee.svelte";
  import { cssColor, fighterArt, picksFrom, picksQuery } from "#lib/shell/roster.js";

  const picks = $derived(picksFrom(page.url.searchParams));
  const ROUND_SECONDS = 40;
</script>

<svelte:head><title>The arena</title></svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
  <div class="overflow-hidden rounded-lg border-4 border-ink bg-paper shadow-offset-lg">
    <!-- HUD placeholders: full health, full clock. Nothing is simulated on this page. -->
    <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b-4 border-ink bg-paper px-3 py-2 sm:gap-5 sm:px-5">
      {#each picks as def, side (side)}
        <div class="flex min-w-0 flex-col gap-1 {side === 1 ? 'order-3 items-end text-right' : ''}">
          <div class="flex items-baseline gap-2 {side === 1 ? 'flex-row-reverse' : ''}">
            <h2 class="truncate font-script text-3xl leading-none text-hero sm:text-4xl">{def.name}</h2>
            {#each def.types as type (type)}
              <span class="callout hidden rounded-sm bg-ink px-1.5 text-[0.65rem] text-paper sm:inline">{type}</span>
            {/each}
          </div>
          <div class="stripes-red w-full rounded-sm border-[3px] border-ink p-1 shadow-offset" role="meter" aria-label="{def.name} health" aria-valuemin="0" aria-valuemax={def.stats.maxHp} aria-valuenow={def.stats.maxHp}>
            <div class="flex h-4 border-2 border-ink bg-paper sm:h-5 {side === 1 ? 'justify-end' : ''}">
              <div class="h-full w-full bg-hero"></div>
            </div>
          </div>
          <p class="callout text-xs">{def.stats.maxHp} / {def.stats.maxHp} HP · {def.passive.name}</p>
        </div>
      {/each}
      <div class="order-2 grid size-16 place-items-center rounded-full border-4 border-ink bg-mustard shadow-offset sm:size-20" role="timer" aria-label="Seconds left">
        <span class="font-slab text-3xl leading-none sm:text-4xl">{ROUND_SECONDS}</span>
      </div>
    </div>

    <DinerDiorama>
      <Standee src={fighterArt(picks[0], "frames/idle_original_000.png")} name={picks[0].name} color={cssColor(picks[0].sprites.color)} x={30} />
      <Standee src={fighterArt(picks[1], "frames/idle_original_000.png")} name={picks[1].name} color={cssColor(picks[1].sprites.color)} x={70} flip />
    </DinerDiorama>

    <div class="flex flex-wrap items-center justify-between gap-2 border-t-4 border-ink bg-ink px-4 py-2 text-paper">
      <p class="callout text-sm">Round 1 · best of one</p>
      <p class="callout ribbon bg-hero py-0.5 text-sm">Move call-outs land here</p>
      <p class="callout text-sm">The diner · dusk</p>
    </div>
  </div>

  <p class="text-center text-sm font-medium">
    Stage and scoreboard only: the fight itself runs on the match page. Move your mouse across the stage to shift the camera.
  </p>

  <div class="flex flex-wrap items-center justify-center gap-4">
    <Button href="/match{picksQuery(picks)}" size="lg">Start a live match</Button>
    <Button href="/fighters{picksQuery(picks)}" variant="secondary">Change fighters</Button>
  </div>
</main>
