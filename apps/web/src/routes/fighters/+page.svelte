<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import TrainerSelect from "#lib/trainers/trainer-select.svelte";
  import { trainerFrom, type TrainerPicks } from "#lib/trainers/roster.js";
  import CornerStand from "#lib/components/shell/corner-stand.svelte";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import PlanSelect from "#lib/components/shell/plan-select.svelte";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import { brainsFrom, setupQuery } from "#lib/shell/brains.js";
  import { plansFrom, type Plans } from "#lib/shell/coach-setup.js";
  import { ROSTER, picksFrom, typeInk } from "#lib/shell/roster.js";

  const initial = picksFrom(page.url.searchParams);
  let picks = $state<[string, string]>([initial[0].id, initial[1].id]);
  // Brains are picked on the next screen; a choice already in the query rides through.
  const brains = brainsFrom(page.url.searchParams);
  // Each corner's standing order, a preset: `g1`, `g2` in the query.
  let plans = $state<Plans>(plansFrom(page.url.searchParams));
  let trainers = $state<TrainerPicks>([
    trainerFrom(page.url.searchParams.get("trainer1"), 0).id,
    trainerFrom(page.url.searchParams.get("trainer2"), 1).id,
  ]);
  const carried = $derived.by(() => {
    const params = new URLSearchParams(page.url.search);
    params.set("trainer1", trainers[0]);
    params.set("trainer2", trainers[1]);
    params.set("g1", plans[0]);
    params.set("g2", plans[1]);
    return params;
  });
  const chosen = $derived(picks.map((id) => ROSTER.find((f) => f.id === id) ?? ROSTER[0]));
  const next = $derived(`/match${setupQuery([{ id: picks[0] }, { id: picks[1] }], brains, carried)}`);

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
        <CornerStand {def} {side} size={222} />
        <div class="plan"><PlanSelect bind:value={plans[side]} {side} /></div>
      </section>

      <article class="card" class:right={side === 1}>
        <p class="types">
          {#each def.types as type, i (type)}{i ? " / " : ""}<span style:color={typeInk(type)}>{type}</span>{/each}
        </p>
        <p class="blurb">{def.blurb}</p>
        <h3>{def.passive.name}</h3>
        <p class="passive">{def.passive.description}</p>
        <h4><span>Moves</span><span>Power</span></h4>
        <ul>
          {#each Object.values(def.moves) as move (move.name)}
            <li style:--type={typeInk(move.type)}>
              <span class="splat" aria-hidden="true"></span>
              <span class="move">{move.name}<small>{move.type}</small></span>
              <span class="power" aria-label="{move.damage} damage">{move.damage}</span>
            </li>
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
    left: 33.75%;
    top: 232px;
    width: 340px;
    margin-left: -170px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .corner.right {
    left: 66.25%;
  }
  .name {
    min-width: 196px;
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
  /* The order slip, nudged toward the middle so it stays clear of the coach row. */
  .plan {
    margin-top: 6px;
    translate: 22px 0;
  }
  .corner.right .plan {
    translate: -22px 0;
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
  /* The fighter's menu card: tall, with the paper's printed corners kept square. */
  .card {
    position: absolute;
    left: 4px;
    top: 94px;
    width: 278px;
    min-height: 478px;
    padding: 2px 4px 4px;
    border: 40px solid transparent;
    border-image: url("/ui/card.webp") 215 fill / 40px;
    color: var(--ink);
    font-size: 14px;
    line-height: 1.3;
    rotate: -1.5deg;
    filter: drop-shadow(0 8px 6px rgb(10 14 34 / 0.55));
  }
  .card.right {
    left: auto;
    right: 4px;
    rotate: 1.5deg;
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
    font-size: 21px;
    line-height: 1.1;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink);
  }
  .blurb {
    margin-top: 5px;
    font-weight: 600;
  }
  .card h3 {
    margin-top: 12px;
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 1.1;
  }
  .card h4 {
    display: flex;
    justify-content: space-between;
    margin-top: 12px;
    padding-top: 9px;
    border-top: 2px dotted rgb(27 33 64 / 0.4);
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--hero-red);
  }
  .card ul {
    margin-top: 4px;
  }
  /* A move: a splat of its type's paint, its name, and its damage stamped big. */
  .card li {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 0;
    animation: deal 0.4s cubic-bezier(0.3, 1.4, 0.5, 1) backwards;
  }
  .card li:nth-child(2) { animation-delay: 0.06s; }
  .card li:nth-child(3) { animation-delay: 0.12s; }
  .card li:nth-child(4) { animation-delay: 0.18s; }
  .card li + li {
    border-top: 1px solid rgb(27 33 64 / 0.14);
  }
  .splat {
    flex: none;
    width: 20px;
    height: 20px;
    border: 2px solid var(--ink);
    border-radius: 58% 42% 55% 45% / 48% 60% 40% 52%;
    background: var(--type);
    rotate: -8deg;
  }
  .move {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    font-family: var(--font-display);
    font-size: 19px;
    line-height: 1.05;
  }
  .move small {
    font-family: var(--font-sans);
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--type);
  }
  .power {
    flex: none;
    min-width: 34px;
    font-family: var(--font-display);
    font-size: 30px;
    line-height: 1;
    text-align: right;
    color: var(--hero-red);
    -webkit-text-stroke: 1.5px var(--ink);
    paint-order: stroke fill;
    text-shadow: 2px 2px 0 var(--mustard);
    rotate: -4deg;
  }
  @keyframes deal {
    from {
      opacity: 0;
      translate: -14px 0;
    }
  }
  .vs {
    position: absolute;
    left: 50%;
    top: 328px;
    width: 130px;
    margin-left: -65px;
    filter: drop-shadow(0 8px 6px rgb(10 14 34 / 0.55));
    animation: thump 1.6s ease-in-out infinite alternate;
  }
  .go {
    position: absolute;
    inset: 470px 0 auto;
    display: grid;
    place-items: center;
    scale: 0.9;
  }
  @keyframes thump {
    from { scale: 0.96; rotate: -2deg; }
    to { scale: 1.04; rotate: 2deg; }
  }
  @media (prefers-reduced-motion: reduce) {
    .vs, .card li { animation: none; }
  }
</style>
