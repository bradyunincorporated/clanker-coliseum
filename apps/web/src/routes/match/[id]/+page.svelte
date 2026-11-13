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

<!-- The stage is 16:9, so its width comes from the room's height (toolbar and padding take ~90px). -->
<main class="mx-auto flex w-[min(72rem,calc((100cqh-90px)*16/9))] flex-col gap-3 py-3">
  <div class="flex items-center justify-between gap-3">
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
    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" bind:checked={showBoxes} class="size-4 accent-hero" />
        Hitboxes (H)
      </label>
      {#if status?.over}<Button href="/match" size="sm">Rematch</Button>{/if}
    </div>
  </div>

  {#key data.id}
    <ArenaStage matchId={data.id} {showBoxes} onstatus={(s) => (status = s)} onproblem={(m) => (problem = m)} />
  {/key}
</main>
