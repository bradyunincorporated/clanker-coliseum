<script lang="ts">
  import { Button } from "#lib/components/ui/button/index.js";
  import ArenaStage from "#lib/arena/arena-stage.svelte";
  import type { ArenaStatus } from "#lib/arena/arena-renderer.js";

  let { data } = $props();
  let showBoxes = $state(false);
  let status = $state<ArenaStatus | null>(null);
  let problem = $state("");

  function onKey(e: KeyboardEvent) {
    if (e.code === "KeyH") showBoxes = !showBoxes;
  }
</script>

<svelte:window onkeydown={onKey} />

<main class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <Button href="/match" variant="secondary" size="sm">Back to the lobby</Button>
    <p class="callout text-sm" role="status">
      {#if problem}
        <span class="text-hero">{problem}</span>
      {:else if status?.over}
        Final bell. {status.winner === "draw" ? "It's a draw." : ""}
      {:else if status?.waiting}
        Waiting for the next tick...
      {:else}
        Live · decided on the server, one tick a second
      {/if}
    </p>
    <label class="flex items-center gap-2 text-sm font-semibold">
      <input type="checkbox" bind:checked={showBoxes} class="size-4 accent-hero" />
      Hitboxes (H)
    </label>
  </div>

  {#key data.id}
    <ArenaStage matchId={data.id} {showBoxes} onstatus={(s) => (status = s)} onproblem={(m) => (problem = m)} />
  {/key}

  {#if status?.over}
    <div class="flex justify-center">
      <Button href="/match" size="lg">Rematch</Button>
    </div>
  {/if}
</main>
