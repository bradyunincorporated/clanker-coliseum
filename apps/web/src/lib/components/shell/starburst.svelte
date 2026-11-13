<script lang="ts">
  import type { Snippet } from "svelte";

  let { points = 16, class: className = "", children }: { points?: number; class?: string; children: Snippet } =
    $props();

  const path = $derived(
    Array.from({ length: points * 2 }, (_, i) => {
      const r = i % 2 === 0 ? 50 : 38;
      const a = (Math.PI * i) / points;
      return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
    }).join(" "),
  );
</script>

<div class="relative grid place-items-center {className}">
  <svg viewBox="-4 -4 112 112" class="absolute inset-0 size-full" aria-hidden="true">
    <polygon points={path} fill="var(--ink)" transform="translate(4 4)" />
    <polygon points={path} fill="var(--mustard)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" />
  </svg>
  <div class="relative text-center leading-none">{@render children()}</div>
</div>
