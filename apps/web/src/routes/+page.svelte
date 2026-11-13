<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import FighterPortrait from "#lib/components/shell/fighter-portrait.svelte";
  import Starburst from "#lib/components/shell/starburst.svelte";
  import { ROSTER, cssColor, fighterArt } from "#lib/shell/roster.js";
  import { SITE_NAME } from "#lib/site.js";

  const [left, right] = [ROSTER[0], ROSTER[1] ?? ROSTER[0]];
  const steps = [
    { n: "1", title: "Pick two clankers", body: "Choose who stands in each corner of the diner." },
    { n: "2", title: "Choose their brains", body: "Choose a machine brain for each fighter and ring the bell." },
    { n: "3", title: "Watch them go", body: "Forty seconds, one decision a second. You only watch." },
  ];
</script>

<main class="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-10 sm:px-6">
  <section class="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
    <div class="flex flex-col items-start gap-5">
      <p class="callout text-sm tracking-[0.3em] text-bottle">Tonight only · live at the diner</p>
      <h1 class="font-script text-[clamp(4.5rem,13vw,9rem)] leading-[0.85] text-hero drop-shadow-[5px_5px_0_var(--ink)]">
        {SITE_NAME}
      </h1>
      <p class="callout ribbon bg-ink py-1.5 text-lg text-paper">The fight that thinks for itself!</p>
      <p class="max-w-md text-lg font-medium">
        Two creature fighters. Forty seconds on the clock. A machine brain calls every move, once a second, and
        all you do is pull up a stool and watch.
      </p>
      <div class="flex flex-wrap items-center gap-4 pt-2">
        <Button href="/fighters" size="lg">Pick your clankers</Button>
        <Button href="/arena" variant="secondary">See the arena</Button>
      </div>
    </div>

    <div class="relative mx-auto w-full max-w-lg">
      <div class="relative rotate-1 rounded-lg border-4 border-ink bg-panel p-5 shadow-offset-lg">
        <p class="callout mb-3 border-b-[3px] border-ink pb-2 text-center text-paper">
          On the bill tonight
        </p>
        <div class="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <figure>
            <FighterPortrait src={fighterArt(left)} color={cssColor(left.sprites.color)} accent={cssColor(left.sprites.accent)} class="aspect-square rounded border-[3px] border-ink" />
            <figcaption class="mt-1 text-center font-script text-3xl text-paper [text-shadow:2px_2px_0_var(--ink)]">{left.name}</figcaption>
          </figure>
          <p class="pb-12 font-script text-5xl text-hero [text-shadow:2px_2px_0_var(--paper)]">vs.</p>
          <figure>
            <FighterPortrait src={fighterArt(right)} color={cssColor(right.sprites.color)} accent={cssColor(right.sprites.accent)} flip class="aspect-square rounded border-[3px] border-ink" />
            <figcaption class="mt-1 text-center font-script text-3xl text-paper [text-shadow:2px_2px_0_var(--ink)]">{right.name}</figcaption>
          </figure>
        </div>
      </div>
      <div class="absolute -top-12 -right-4 -rotate-12 sm:-right-10">
        <Starburst class="size-32">
          <span class="font-slab text-4xl text-hero">40</span><br />
          <span class="callout text-xs">seconds!</span>
        </Starburst>
      </div>
      <div class="absolute -bottom-6 -left-3 -rotate-3 rounded border-[3px] border-ink bg-paper px-4 py-2 shadow-offset">
        <p class="callout text-sm text-hero">Best of one.</p>
        <p class="text-sm font-semibold">No rematches, no excuses.</p>
      </div>
    </div>
  </section>

  <section aria-labelledby="how" class="rounded-lg border-4 border-ink bg-paper-deep shadow-offset-lg">
    <h2 id="how" class="callout stripes-red border-b-4 border-ink px-5 py-2 text-xl">
      <span class="rounded-sm bg-paper px-3 py-0.5">How it works</span>
    </h2>
    <ol class="grid gap-px bg-ink md:grid-cols-3">
      {#each steps as step (step.n)}
        <li class="flex gap-4 bg-paper p-5">
          <span class="grid size-12 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-teal font-slab text-2xl text-paper">{step.n}</span>
          <div>
            <h3 class="font-slab text-lg uppercase">{step.title}</h3>
            <p class="text-sm font-medium">{step.body}</p>
          </div>
        </li>
      {/each}
    </ol>
  </section>

  <p class="text-center font-script text-3xl text-bottle">Fresh fights served daily... and so refreshing!</p>
</main>
