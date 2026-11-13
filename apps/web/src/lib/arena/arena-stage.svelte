<script lang="ts">
  import { onMount } from "svelte";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import { ArenaRenderer, type ArenaStatus } from "./arena-renderer.js";
  import { watchMatch } from "./arena-client.js";

  /** The live match: the diner fills the frame and one canvas over it draws the fight. */
  let {
    matchId,
    showBoxes = false,
    onstatus,
    onproblem,
  }: {
    matchId: string;
    showBoxes?: boolean;
    onstatus?: (s: ArenaStatus) => void;
    onproblem?: (message: string) => void;
  } = $props();

  let host: HTMLDivElement;
  let renderer: ArenaRenderer | null = null;
  let over = $state(false);
  let jolt = $state(0);

  onMount(() => {
    const r = new ArenaRenderer();
    renderer = r;
    r.showBoxes = showBoxes;
    r.onStatus = (s) => {
      if (s.over !== over) over = s.over;
      onstatus?.(s);
    };
    // A whole number of hits plus the power as the fraction: every hit is a new value.
    r.onImpact = (power) => (jolt = Math.floor(jolt) + 1 + Math.min(0.99, power));
    let stop: (() => void) | null = null;
    let cancelled = false;
    void r.init(host).then(() => {
      if (cancelled) return;
      stop = watchMatch(matchId, {
        message: (m) => r.receive(m),
        missing: () => onproblem?.("This match is over and gone. Start a new one."),
        error: () => onproblem?.("Lost the connection to the arena service."),
      });
    });
    return () => {
      cancelled = true;
      stop?.();
      r.destroy();
      renderer = null;
    };
  });

  $effect(() => {
    if (renderer) renderer.showBoxes = showBoxes;
  });
</script>

<DinerDiorama label="The diner arena: a live match" still mood={over ? "ko" : "lit"} {jolt}>
  {#snippet overlay()}
    <!-- A little dusk behind the scoreboard so it reads over the bunting. -->
    <div class="shade"></div>
    <div class="absolute inset-0 [&_canvas]:block" bind:this={host}></div>
  {/snippet}
</DinerDiorama>

<style>
  .shade {
    position: absolute;
    inset: 0 0 auto;
    height: 150px;
    background: linear-gradient(rgb(12 17 38 / 0.72), rgb(12 17 38 / 0.45) 55%, transparent);
  }
</style>
