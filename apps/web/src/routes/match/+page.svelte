<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import type { HealthResponse } from "@clanker/arena-service/protocol";
  import { health, startMatch } from "#lib/arena/arena-client.js";
  import BrainSelect from "#lib/components/shell/brain-select.svelte";
  import CornerStand from "#lib/components/shell/corner-stand.svelte";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import { brainsFrom, setupQuery, type Brains } from "#lib/shell/brains.js";
  import { plansFrom, trainersFrom } from "#lib/shell/coach-setup.js";
  import { picksFrom } from "#lib/shell/roster.js";

  // Arrive from fighter select with the fighters, coaches and game plans in the query; this
  // screen is where each fighter's brain is picked.
  const picks = $derived(picksFrom(page.url.searchParams));
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
    if (starting || service === "offline") return;
    starting = true;
    problem = "";
    try {
      const match = await startMatch({
        fighters: [picks[0].id, picks[1].id],
        brains,
        // Game plans and trainers ride in the query from the screens that own them.
        plans: plansFrom(page.url.searchParams),
        trainers: trainersFrom(page.url.searchParams),
      });
      await goto(`/match/${match.id}${setupQuery(picks, brains, page.url.searchParams)}`);
    } catch (err) {
      problem = err instanceof Error ? err.message : String(err);
      starting = false;
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.code === "Enter" && !(e.target as HTMLElement).closest("button, a")) void fight();
  }
</script>

<svelte:head><title>{picks[0].name} vs {picks[1].name}</title></svelte:head>
<svelte:window onkeydown={onKey} />

<main class="absolute inset-0">
  <DinerDiorama label="The diner, waiting for the bell" mood="dim" spot>
    {#each [0, 1] as const as side (side)}
      <section class="corner" class:right={side === 1}>
        <h2 class="lettering name">{picks[side].name}</h2>
        <CornerStand def={picks[side]} {side} size={270} />
        <BrainSelect bind:value={brains[side]} {side} {models} class="brain" />
      </section>
    {/each}

    <img class="vs" src="/ui/vs.webp" alt="versus" />

    <button type="button" class="bell" class:rung={starting} onclick={fight} disabled={service === "offline"}>
      <img src="/ui/bell.webp" alt="" />
      <span class="lettering">Ring the bell</span>
    </button>

    {#if service === "offline"}
      <p class="lettering note" role="alert">The arena service isn't running. Start it with bun run dev.</p>
    {:else if problem}
      <p class="lettering note" role="alert">{problem}</p>
    {/if}
  </DinerDiorama>

  <div class="back"><SignButton href="/fighters{setupQuery(picks, brains, page.url.searchParams)}" tone="cream" size="sm">Fighters</SignButton></div>
  <h1 class="lettering heading">Pick each fighter's brain</h1>
</main>

<style>
  .back {
    position: absolute;
    left: 22px;
    top: 26px;
  }
  .heading {
    position: absolute;
    inset: 34px 0 auto;
    text-align: center;
    font-size: 46px;
  }
  /* Placed in the stage box (1280 x 720); the floor line is at 630. */
  .corner {
    position: absolute;
    left: 33%;
    top: 196px;
    width: 340px;
    margin-left: -170px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .corner.right {
    left: 67%;
  }
  .name {
    margin-bottom: 8px;
    font-size: 50px;
    white-space: nowrap;
  }
  .corner :global(.brain) {
    margin-top: 12px;
  }
  .vs {
    position: absolute;
    left: 50%;
    top: 250px;
    width: 180px;
    margin-left: -90px;
    filter: drop-shadow(0 8px 6px rgb(10 14 34 / 0.55));
    animation: thump 1.6s ease-in-out infinite alternate;
  }
  .bell {
    position: absolute;
    left: 50%;
    top: 440px;
    width: 220px;
    margin-left: -110px;
    padding: 0;
    border: 0;
    background: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 27px;
    cursor: pointer;
  }
  .bell img {
    width: 150px;
    filter: drop-shadow(0 9px 6px rgb(10 14 34 / 0.6));
    transform-origin: 50% 90%;
    animation: nudge 2.6s ease-in-out infinite;
    transition: scale 0.15s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .bell:hover img,
  .bell:focus-visible img {
    scale: 1.08;
  }
  .bell:active img {
    scale: 0.94;
  }
  .bell.rung img {
    animation: ring 0.5s ease-in-out infinite;
  }
  .bell:disabled {
    cursor: default;
    filter: grayscale(0.8) brightness(0.75);
  }
  .bell:disabled img {
    animation: none;
  }
  .note {
    position: absolute;
    inset: 136px 0 auto;
    text-align: center;
    font-size: 22px;
  }
  @keyframes thump {
    from { scale: 0.96; rotate: -2deg; }
    to { scale: 1.04; rotate: 2deg; }
  }
  /* The bell asks to be rung now and then. */
  @keyframes nudge {
    0%, 82%, 100% { rotate: 0deg; }
    86% { rotate: -7deg; }
    90% { rotate: 6deg; }
    94% { rotate: -3deg; }
  }
  @keyframes ring {
    0%, 100% { rotate: -12deg; }
    50% { rotate: 12deg; }
  }
  @media (prefers-reduced-motion: reduce) {
    .vs, .bell img { animation: none; }
  }
</style>
