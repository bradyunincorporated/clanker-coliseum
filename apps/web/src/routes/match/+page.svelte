<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { BRAIN_MODELS, MODEL_BRAINS, type HealthResponse } from "@clanker/arena-service/protocol";
  import { FIGHTERS } from "@clanker/game";
  import { Button } from "#lib/components/ui/button/index.js";
  import { health, startMatch } from "#lib/arena/arena-client.js";
  import { page } from "$app/state";
  import BrainSelect from "#lib/components/shell/brain-select.svelte";
  import { brainsFrom, type Brains } from "#lib/shell/brains.js";
  import { picksFrom } from "#lib/shell/roster.js";

  const roster = Object.values(FIGHTERS);
  const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

  // Arrive from the fighter pages with `?p1=..&p2=..` and those picks are already set.
  const arrived = picksFrom(page.url.searchParams);
  let picks = $state<[string, string]>([arrived[0].id, arrived[1].id]);
  let brains = $state<Brains>(brainsFrom(page.url.searchParams));
  let service = $state<"checking" | "online" | "offline">("checking");
  let models = $state<HealthResponse["models"] | null>(null);
  let starting = $state(false);
  let problem = $state("");

  onMount(async () => {
    const h = await health();
    service = h ? "online" : "offline";
    models = h?.models ?? null;
  });

  async function fight() {
    starting = true;
    problem = "";
    try {
      const match = await startMatch({ fighters: picks, brains });
      await goto(`/match/${match.id}`);
    } catch (err) {
      problem = err instanceof Error ? err.message : String(err);
      starting = false;
    }
  }
</script>

<main class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4">
  <header class="text-center">
    <p class="callout text-sm tracking-[0.3em] text-bottle">Last step</p>
    <h1 class="font-script text-6xl leading-none text-hero drop-shadow-[4px_4px_0_var(--ink)]">Ring the bell</h1>
    <p class="callout text-lg">Forty seconds. The machines decide.</p>
  </header>

  <section class="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
    {#each [0, 1] as side (side)}
      {@const def = FIGHTERS[picks[side]]}
      <article class="flex flex-col gap-3 rounded-lg border-4 border-ink bg-panel p-4 shadow-offset-lg {side === 1 ? 'md:order-3' : ''}">
        <div class="flex items-start justify-between gap-3">
          <p class="callout text-sm text-paper">Player {side + 1}</p>
          <p class="callout rounded bg-paper px-2 text-xs">{def.types.join(" / ")}</p>
        </div>
        <div class="flex items-center gap-4">
          <div
            class="size-20 shrink-0 rounded-full border-4 border-ink"
            style="background: {hex(def.sprites.color)}"
            aria-hidden="true"
          ></div>
          <div>
            <h2 class="font-script text-5xl leading-none text-hero [text-shadow:2px_2px_0_var(--paper)]">{def.name}</h2>
            <p class="mt-1 text-sm font-medium text-ink">{def.blurb}</p>
          </div>
        </div>
        <div class="rounded-md border-[3px] border-ink bg-paper p-3 shadow-offset">
          <p class="callout text-sm text-hero">{def.passive.name}</p>
          <p class="text-sm">{def.passive.description}</p>
          <ul class="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            {#each Object.values(def.moves) as move (move.name)}
              <li><span class="font-bold">{move.name}</span> · {move.type}</li>
            {/each}
          </ul>
        </div>
        <div class="grid grid-cols-[auto_1fr] items-end gap-3 text-sm">
          <label class="flex flex-col gap-1">
            <span class="callout text-paper">Fighter</span>
            <select bind:value={picks[side]} class="rounded border-[3px] border-ink bg-paper px-2 py-1.5 font-semibold">
              {#each roster as f (f.id)}<option value={f.id}>{f.name}</option>{/each}
            </select>
          </label>
          <BrainSelect bind:value={brains[side]} side={side as 0 | 1} {models} />
        </div>
      </article>
      {#if side === 0}
        <p class="text-center font-script text-6xl text-hero md:order-2">vs.</p>
      {/if}
    {/each}
  </section>

  <div class="flex flex-col items-center gap-2">
    <Button onclick={fight} disabled={starting || service === "offline"}>
      {starting ? "Ringing the bell..." : "Fight!"}
    </Button>
    <p class="text-center text-sm" role="status">
      {#if service === "checking"}
        Checking the arena service...
      {:else if service === "offline"}
        The arena service isn't running. Start everything with <code class="font-bold">bun run dev</code>.
      {:else if models}
        {#each MODEL_BRAINS as id, i (id)}
          {i ? " · " : ""}<span title={models[id].reason ?? ""}>{BRAIN_MODELS[id].name}: <b>{models[id].ready ? "connected" : "offline"}</b></span>
        {/each}
      {/if}
    </p>
    {#if problem}<p class="callout text-hero" role="alert">{problem}</p>{/if}
  </div>
</main>
