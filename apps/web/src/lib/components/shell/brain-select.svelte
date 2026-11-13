<script lang="ts">
  import type { BrainKind, HealthResponse } from "@clanker/arena-service/protocol";
  import { isModelBrain } from "@clanker/arena-service/protocol";
  import { BRAIN_CARDS, brainCard } from "#lib/shell/brains.js";

  /**
   * One fighter's brain: a compact dropdown with the maker's logo, the official model id and
   * a "powered by" line. Each fighter has its own; nothing here is shared between corners.
   */
  interface Props {
    value: BrainKind;
    side: 0 | 1;
    /** From /api/health, when the page has it: marks models that failed the startup check. */
    models?: HealthResponse["models"] | null;
    class?: string;
  }
  let { value = $bindable(), side, models = null, class: className = "" }: Props = $props();

  const card = $derived(brainCard(value));
  const down = $derived(isModelBrain(value) && models ? !models[value].ready : false);
</script>

<label class="brain flex items-center gap-2 rounded-md border-[3px] border-ink bg-paper px-2 py-1.5 shadow-offset {className}">
  <span class="grid size-9 shrink-0 place-items-center rounded-sm border-2 border-ink bg-white p-1" aria-hidden="true">
    {#if card.logo}
      <img src={card.logo} alt="" class="max-h-full max-w-full object-contain" />
    {:else}
      <span class="font-slab text-lg leading-none">{card.label[0]}</span>
    {/if}
  </span>
  <span class="flex min-w-0 flex-1 flex-col">
    <span class="callout text-[0.65rem] leading-none text-bottle">Brain · player {side + 1}</span>
    <select bind:value class="w-full min-w-0 cursor-pointer truncate bg-transparent text-sm leading-tight font-bold outline-none focus-visible:outline-2 focus-visible:outline-hero" name="brain-{side}">
      {#each BRAIN_CARDS as b (b.id)}
        <option value={b.id}>{b.label}{b.modelId ? ` — ${b.modelId}` : ""}</option>
      {/each}
    </select>
    <span class="flex items-baseline gap-2 leading-none whitespace-nowrap">
      <span class="font-script text-base leading-none text-hero">{card.tagline}</span>
      {#if down}<span class="callout truncate text-[0.65rem] text-hero" title={isModelBrain(value) ? models?.[value].reason : ""}>offline · heuristic fills in</span>{/if}
    </span>
  </span>
</label>
