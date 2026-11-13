<script lang="ts">
  import { page } from "$app/state";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import ArenaStage from "#lib/arena/arena-stage.svelte";
  import TrainerCorners from "#lib/trainers/trainer-corners.svelte";
  import CoachCalls from "#lib/components/shell/coach-calls.svelte";
  import type { ArenaStatus } from "#lib/arena/arena-renderer.js";

  let { data } = $props();
  let showBoxes = $state(false);
  let status = $state<ArenaStatus | null>(null);
  let problem = $state("");
  const over = $derived(status?.over ?? false);
  // Both coaches share this screen by default; `?seat=0` or `?seat=1` shows one side's calls.
  const seat = $derived(page.url.searchParams.get("seat"));

  function onKey(e: KeyboardEvent) {
    if (e.code === "KeyH") showBoxes = !showBoxes;
  }
</script>

<svelte:window onkeydown={onKey} />

<main class="absolute inset-0">
  {#key data.id}
    <ArenaStage matchId={data.id} {showBoxes} onstatus={(s) => (status = s)} onproblem={(m) => (problem = m)} />
    <TrainerCorners matchId={data.id} />
  {/key}

  <!-- The coaches' calls: order tickets under the floor line, clear of the fighters. -->
  {#each [0, 1] as const as side (side)}
    {#if seat === null || seat === String(side)}
      <div class="calls" class:right={side === 1}><CoachCalls matchId={data.id} {side} /></div>
    {/if}
  {/each}

  <!-- The fight is the screen. What little chrome there is waits in the corners. -->
  <nav class="corner absolute bottom-3 left-4 flex items-center gap-1" aria-label="Match">
    <a href="/match{page.url.search}" class="quiet" aria-label="Leave the match" title="Leave the match">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l-7 7 7 7M8 12h11" /></svg>
    </a>
    <button
      type="button"
      class="quiet"
      aria-pressed={showBoxes}
      aria-label="Show hitboxes"
      title="Hitboxes (H)"
      onclick={() => (showBoxes = !showBoxes)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="11" height="13" rx="1.5" /><rect x="12" y="4" width="8" height="8" rx="1.5" /></svg>
    </button>
  </nav>

  {#if problem}
    <div class="absolute inset-x-0 top-[42%] flex flex-col items-center gap-4" role="alert">
      <p class="lettering text-3xl">{problem}</p>
      <SignButton href="/match{page.url.search}">Back to the bell</SignButton>
    </div>
  {:else if over}
    <div class="result absolute inset-x-0 bottom-3 flex items-center justify-center gap-4">
      <SignButton href="/match{page.url.search}" size="sm">Rematch</SignButton>
      <SignButton href="/fighters{page.url.search}" tone="cream" size="sm">New fighters</SignButton>
    </div>
  {/if}
</main>

<style>
  .calls {
    position: absolute;
    bottom: 14px;
    left: 104px;
  }
  .calls.right {
    left: auto;
    right: 24px;
  }
  .quiet {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    color: var(--paper);
    opacity: 0.5;
    transition: opacity 0.15s, background-color 0.15s;
  }
  .quiet:hover,
  .quiet:focus-visible,
  .quiet[aria-pressed="true"] {
    opacity: 1;
    background: rgb(12 17 38 / 0.6);
  }
  .quiet svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 1px 0 var(--ink));
  }
  .result {
    animation: rise 0.5s 1.1s cubic-bezier(0.2, 1, 0.3, 1) backwards;
  }
  @keyframes rise {
    from {
      opacity: 0;
      translate: 0 24px;
    }
  }
</style>
