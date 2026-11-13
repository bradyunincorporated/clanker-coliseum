<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import TrainerSelect from "#lib/trainers/trainer-select.svelte";
  import { trainerFrom, type TrainerPicks } from "#lib/trainers/roster.js";
  import BrainSelect from "#lib/components/shell/brain-select.svelte";
  import CornerStand from "#lib/components/shell/corner-stand.svelte";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import { brainsFrom, setupQuery, type Brains } from "#lib/shell/brains.js";
  import { ROSTER, picksFrom } from "#lib/shell/roster.js";

  const initial = picksFrom(page.url.searchParams);
  let picks = $state<[string, string]>([initial[0].id, initial[1].id]);
  // Each corner picks its own brain; the choice rides along in the query (`b1`, `b2`).
  let brains = $state<Brains>(brainsFrom(page.url.searchParams));
  let trainers = $state<TrainerPicks>([
    trainerFrom(page.url.searchParams.get("trainer1"), 0).id,
    trainerFrom(page.url.searchParams.get("trainer2"), 1).id,
  ]);
  const trainerParams = $derived.by(() => {
    const params = new URLSearchParams(page.url.search);
    params.set("trainer1", trainers[0]);
    params.set("trainer2", trainers[1]);
    return params;
  });
  const chosen = $derived(picks.map((id) => ROSTER.find((f) => f.id === id) ?? ROSTER[0]));
  const next = $derived(`/match${setupQuery([{ id: picks[0] }, { id: picks[1] }], brains, trainerParams)}`);

  function cycle(side: 0 | 1, by: number) {
    const at = ROSTER.findIndex((f) => f.id === picks[side]);
    picks[side] = ROSTER[(at + by + ROSTER.length) % ROSTER.length].id;
  }

  // A and D turn the left corner, the arrow keys the right one, Enter moves on.
  function onKey(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input, select, textarea, [contenteditable]")) return;
    if ((e.target as HTMLElement).closest("button, a")) {
      if (e.code === "Enter" || e.code === "Space") return;
    }
    if (e.code === "KeyA") cycle(0, -1);
    else if (e.code === "KeyD") cycle(0, 1);
    else if (e.code === "ArrowLeft") cycle(1, -1);
    else if (e.code === "ArrowRight") cycle(1, 1);
    else if (e.code === "Enter") void goto(next);
  }
</script>

<svelte:head><title>Pick your fighters</title></svelte:head>
<svelte:window onkeydown={onKey} />

<main class="absolute inset-0">
  <DinerDiorama label="The diner with the house lights down" mood="dim" spot>
    {#each [0, 1] as const as side (side)}
      {@const def = chosen[side]}
      <section class="corner" class:right={side === 1} aria-label="{side === 0 ? 'Left' : 'Right'} corner">
        <div class="turn">
          <button type="button" class="arrow" onclick={() => cycle(side, -1)} aria-label="Previous fighter">
            <img src="/ui/arrow.webp" alt="" />
          </button>
          <h2 class="lettering name">{def.name}</h2>
          <button type="button" class="arrow next" onclick={() => cycle(side, 1)} aria-label="Next fighter">
            <img src="/ui/arrow.webp" alt="" />
          </button>
        </div>
        <CornerStand {def} {side} />
        <BrainSelect bind:value={brains[side]} {side} class="brain" />
      </section>

      <article class="card" class:right={side === 1}>
        <p class="types">{def.types.join(" / ")}</p>
        <p class="blurb">{def.blurb}</p>
        <h3>{def.passive.name}</h3>
        <p class="passive">{def.passive.description}</p>
        <ul>
          {#each Object.values(def.moves) as move (move.name)}
            <li><span>{move.name}</span><span class="dots"></span><span class="what">{move.type} {move.damage}</span></li>
          {/each}
        </ul>
      </article>

      <!-- Trainer pick goes here: an empty slot per corner, under that corner's menu card. -->
      <div class="trainer" class:right={side === 1} data-trainer-side={side}>
        <TrainerSelect bind:value={trainers[side]} {side} />
      </div>
    {/each}

    <img class="vs" src="/ui/vs.webp" alt="versus" />
    <div class="go"><SignButton href={next}>Ready</SignButton></div>
  </DinerDiorama>

  <h1 class="lettering heading">Pick your fighters</h1>
  <div class="back"><SignButton href="/" tone="cream" size="sm">Back</SignButton></div>
</main>

<style>
  .heading {
    position: absolute;
    inset: 34px 0 auto;
    text-align: center;
    font-size: 46px;
  }
  .back {
    position: absolute;
    left: 22px;
    top: 26px;
  }
  /* Everything below is placed in the stage box (1280 x 720); the floor line is at 630. */
  .corner {
    position: absolute;
    left: 33%;
    top: 232px;
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
    min-width: 230px;
    font-size: 42px;
    text-align: center;
    white-space: nowrap;
  }
  .turn {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  /* Nudged toward the middle so its outer arrow stays clear of the coach row. */
  .corner :global(.brain) {
    margin-top: 10px;
    translate: 44px 0;
  }
  .corner.right :global(.brain) {
    translate: -44px 0;
  }
  .arrow {
    flex: none;
    width: 42px;
    height: 42px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    filter: drop-shadow(0 4px 3px rgb(10 14 34 / 0.6));
    transition: scale 0.15s cubic-bezier(0.3, 1.6, 0.5, 1);
  }
  .arrow img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  .arrow.next img {
    scale: -1 1;
  }
  .arrow:hover,
  .arrow:focus-visible {
    scale: 1.2;
  }
  .arrow:active {
    scale: 0.9;
  }
  .card {
    position: absolute;
    left: 8px;
    top: 280px;
    width: 262px;
    min-height: 262px;
    padding: 30px 34px 34px;
    background: url("/ui/card.webp") center / 100% 100% no-repeat;
    color: var(--ink);
    font-size: 12.5px;
    line-height: 1.3;
    rotate: -2deg;
    filter: drop-shadow(0 8px 6px rgb(10 14 34 / 0.55));
  }
  .card.right {
    left: auto;
    right: 8px;
    rotate: 2deg;
  }
  /* The coach row needs 350px to lay out four sprites evenly; shown a little smaller so it
     stays inside its corner, clear of the podium and the brain sign. */
  .trainer {
    position: absolute;
    left: 10px;
    top: 588px;
    width: 350px;
    scale: 0.82;
    transform-origin: 0 0;
  }
  .trainer.right {
    left: auto;
    right: 10px;
    transform-origin: 100% 0;
  }
  .types {
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--hero-red);
  }
  .blurb {
    margin-top: 2px;
    font-weight: 600;
  }
  .card h3 {
    margin-top: 9px;
    font-family: var(--font-display);
    font-size: 17px;
    line-height: 1.1;
  }
  .card ul {
    margin-top: 9px;
    padding-top: 7px;
    border-top: 2px dotted rgb(27 33 64 / 0.4);
  }
  .card li {
    display: flex;
    align-items: baseline;
    gap: 5px;
    font-weight: 600;
  }
  .dots {
    flex: 1;
    border-bottom: 2px dotted rgb(27 33 64 / 0.35);
    translate: 0 -3px;
  }
  .what {
    color: #2b6a63;
  }
  .vs {
    position: absolute;
    left: 50%;
    top: 318px;
    width: 150px;
    margin-left: -75px;
    filter: drop-shadow(0 8px 6px rgb(10 14 34 / 0.55));
    animation: thump 1.6s ease-in-out infinite alternate;
  }
  .go {
    position: absolute;
    inset: 506px 0 auto;
    display: grid;
    place-items: center;
  }
  @keyframes thump {
    from { scale: 0.96; rotate: -2deg; }
    to { scale: 1.04; rotate: 2deg; }
  }
  @media (prefers-reduced-motion: reduce) {
    .vs { animation: none; }
  }
</style>
