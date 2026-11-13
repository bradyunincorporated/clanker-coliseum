<script lang="ts">
  import { onMount } from "svelte";
  import { ArenaRenderer, type ArenaStatus } from "./arena-renderer.js";
  import { watchMatch } from "./arena-client.js";

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

  onMount(() => {
    const r = new ArenaRenderer();
    renderer = r;
    r.showBoxes = showBoxes;
    r.onStatus = (s) => onstatus?.(s);
    let stop: (() => void) | null = null;
    let cancelled = false;
    void r.init(host).then(() => {
      if (cancelled) return;
      stop = watchMatch(matchId, {
        message: (m) => r.receive(m),
        missing: () => onproblem?.("This match isn't on the arena service any more. Start a new one."),
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

<div
  class="aspect-video w-full overflow-hidden rounded-lg border-4 border-ink shadow-offset-lg [&_canvas]:block"
  bind:this={host}
></div>
