<script lang="ts">
  import { onMount } from "svelte";
  import { CALL_TICKS } from "@clanker/game";
  import { onCoaching, submitCoachCall, type CoachSnapshot } from "#lib/shell/coach-calls.js";

  /**
   * One side's calls: three order tickets the coach can shout, on keys or by click. A ticket
   * only lights up once the service has accepted the call. Plain on purpose: the match
   * screen's owner decides where it sits and how it is dressed.
   */
  let {
    matchId,
    side,
    keys = side === 0 ? ["Digit1", "Digit2", "Digit3"] : ["Digit8", "Digit9", "Digit0"],
  }: { matchId: string; side: 0 | 1; keys?: string[] } = $props();

  let snapshot = $state<CoachSnapshot | null>(null);
  let refused = $state("");
  let sending = $state(false);

  onMount(() => onCoaching((s) => (snapshot = s)));

  const mine = $derived(snapshot?.matchId === matchId ? snapshot.sides[side] : null);
  const tick = $derived(snapshot?.tick ?? 0);
  const over = $derived(snapshot?.over ?? false);
  const active = $derived(mine?.active ?? null);
  /** Ticks until this side may call again; 0 when it can. */
  const wait = $derived(Math.max(0, (mine?.readyTick ?? 0) - tick));
  /** Decisions the call in force still has to shape. */
  const left = $derived(active ? Math.min(CALL_TICKS, active.untilTick - Math.max(tick, active.fromTick)) : 0);
  const keyLabel = (code: string) => code.replace(/^Digit|^Key/, "");

  async function call(presetId: string) {
    if (sending || wait > 0 || over) return;
    sending = true;
    refused = "";
    const answer = await submitCoachCall(matchId, side, presetId);
    sending = false;
    if (!answer.ok) {
      refused = answer.error;
      setTimeout(() => (refused = ""), 1800);
    }
  }

  function onKey(e: KeyboardEvent) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = keys.indexOf(e.code);
    const option = i >= 0 ? mine?.options[i] : undefined;
    if (option) void call(option.presetId);
  }
</script>

<svelte:window onkeydown={onKey} />

{#if mine && !over}
  <div class="calls" class:right={side === 1} aria-label="Coach's calls, player {side + 1}">
    {#if active}
      <p class="said" role="status">
        <span class="text">{active.message}</span>
        <span class="pips" aria-label="{left} ticks left">
          {#each { length: CALL_TICKS } as _, i (i)}<i class:spent={i >= left}></i>{/each}
        </span>
      </p>
    {:else}
      <div class="tickets">
        {#each mine.options as option, i (option.presetId)}
          <button type="button" disabled={wait > 0 || sending} onclick={() => call(option.presetId)}>
            {#if keys[i]}<kbd>{keyLabel(keys[i])}</kbd>{/if}
            {option.message}
          </button>
        {/each}
      </div>
      {#if refused}
        <p class="note" role="alert">{refused}</p>
      {:else if wait > 0}
        <p class="note">Catching breath: {wait}</p>
      {/if}
    {/if}
  </div>
{/if}

<style>
  .calls {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    font-family: var(--font-display);
    pointer-events: auto;
  }
  .calls.right {
    align-items: flex-end;
  }
  .tickets {
    display: flex;
    gap: 8px;
  }
  /* An order ticket: cream paper, ink edge, pinned a little crooked. */
  button {
    position: relative;
    padding: 7px 12px 6px 30px;
    border: 2.5px solid var(--ink);
    border-radius: 4px;
    background: var(--paper);
    color: var(--ink);
    font-size: 15px;
    line-height: 1.1;
    white-space: nowrap;
    box-shadow: 0 3px 0 var(--ink);
    rotate: -1.5deg;
    cursor: pointer;
    transition: translate 0.1s, box-shadow 0.1s, opacity 0.15s;
  }
  button:nth-child(2) {
    rotate: 1deg;
  }
  button:hover:not(:disabled) {
    translate: 0 -2px;
    box-shadow: 0 5px 0 var(--ink);
  }
  button:active:not(:disabled) {
    translate: 0 3px;
    box-shadow: none;
  }
  button:focus-visible {
    outline: 3px solid var(--mustard);
    outline-offset: 2px;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  kbd {
    position: absolute;
    left: 6px;
    top: 50%;
    translate: 0 -50%;
    display: grid;
    place-items: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--mustard);
    font: inherit;
    font-size: 12px;
  }
  .said {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 14px 6px;
    border: 2.5px solid var(--ink);
    border-radius: 4px;
    background: var(--mustard);
    color: var(--ink);
    font-size: 18px;
    line-height: 1.1;
    white-space: nowrap;
    box-shadow: 0 3px 0 var(--ink);
    rotate: -1deg;
  }
  .pips {
    display: flex;
    gap: 3px;
  }
  .pips i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ink);
  }
  .pips i.spent {
    opacity: 0.25;
  }
  .note {
    padding: 0 4px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--paper);
    text-shadow: 0 1px 0 var(--ink);
  }
</style>
