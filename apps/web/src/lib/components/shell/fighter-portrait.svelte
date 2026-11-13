<script lang="ts">
  let { color, accent, src, label = "Art on the way", flip = false, class: className = "" }: {
    color: string;
    accent: string;
    src?: string;
    label?: string;
    flip?: boolean;
    class?: string;
  } = $props();
</script>

<div class="portrait relative overflow-hidden {className}" aria-hidden="true">
  {#if src}
    <img {src} alt="" class="size-full object-contain p-2" style:transform={flip ? "scaleX(-1)" : undefined} />
  {:else}
  <svg viewBox="0 0 200 200" class="block size-full" style:transform={flip ? "scaleX(-1)" : undefined}>
    <circle cx="100" cy="104" r="84" fill="var(--paper)" opacity="0.35" />
    <g transform="translate(6 6)" fill="var(--ink)" opacity="0.85">
      <path d="M38 200c0-52 22-84 62-84s62 32 62 84z" />
      <circle cx="104" cy="74" r="44" />
    </g>
    <g stroke="var(--ink)" stroke-width="5" stroke-linejoin="round">
      <path d="M38 200c0-52 22-84 62-84s62 32 62 84z" fill={color} />
      <circle cx="104" cy="74" r="44" fill={color} />
      <path d="M52 200c2-30 12-50 26-60" fill="none" stroke={accent} stroke-width="6" stroke-linecap="round" />
    </g>
    <text x="104" y="96" text-anchor="middle" font-size="64" fill="var(--paper)" stroke="var(--ink)" stroke-width="3" paint-order="stroke" style="font-family: var(--font-slab)" transform={flip ? "translate(208 0) scale(-1 1)" : undefined}>?</text>
  </svg>
  <p class="callout absolute bottom-2 left-2 -rotate-3 rounded-sm border-2 border-ink bg-mustard px-2 text-[0.65rem]">{label}</p>
  {/if}
</div>

<style>
  .portrait {
    background:
      radial-gradient(circle, rgb(43 37 34 / 0.22) 1.5px, transparent 2px) 0 0 / 9px 9px,
      var(--panel-blue);
  }
</style>
