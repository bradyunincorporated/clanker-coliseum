<script lang="ts">
  import { onMount } from "svelte";
  import { coachSnapshot, onCoachCall, onCoaching, type CoachCall } from "#lib/shell/coach-calls.js";
  import { trainerFrom, type TrainerPicks } from "./roster.js";
  import TrainerPopIn from "./trainer-pop-in.svelte";

  let { matchId }: { matchId: string } = $props();
  let trainers = $state<TrainerPicks>(["ethan", "lance"]);
  let calls = $state<[CoachCall | null, CoachCall | null]>([null, null]);

  onMount(() => {
    const stopSnapshot = onCoaching((snapshot) => {
      if (snapshot.matchId !== matchId) return;
      trainers = [trainerFrom(snapshot.trainers[0], 0).id, trainerFrom(snapshot.trainers[1], 1).id];
    });
    const stopCalls = onCoachCall((call) => {
      if (coachSnapshot()?.matchId === matchId) calls[call.side] = call;
    });
    return () => { stopSnapshot(); stopCalls(); };
  });
</script>

{#each [0, 1] as const as side (side)}
  {@const call = calls[side]}
  <div class="coach" class:right={side === 1} data-coach-side={side}>
    {#if call}
      <TrainerPopIn trainerId={trainers[side]} {side} message={call.message} callId={call.callId} />
    {/if}
  </div>
{/each}

<style>
  .coach { position: absolute; top: 96px; left: 20px; width: 300px; height: 220px; pointer-events: none; }
  .coach.right { left: auto; right: 20px; }
</style>
