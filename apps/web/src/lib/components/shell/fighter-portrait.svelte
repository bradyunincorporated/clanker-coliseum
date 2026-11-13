<script lang="ts">
  // A fighter's face for the menus. With `src` it shows the fighter's own portrait art;
  // until a fighter has one, a paper cut-out in the fighter's colours stands in.
  let { color, accent, src, label = "", flip = false, class: className = "" }: {
    color: string;
    accent: string;
    src?: string;
    label?: string;
    flip?: boolean;
    class?: string;
  } = $props();
</script>

<div class="portrait relative overflow-hidden {className}" style:--tone={color} aria-hidden="true">
  {#if src}
    <img {src} alt="" class="size-full object-contain p-2" style:transform={flip ? "scaleX(-1)" : undefined} />
  {:else}
    <svg viewBox="0 0 200 200" class="block size-full" style:transform={flip ? "scaleX(-1)" : undefined}>
      <g transform="translate(5 7)" fill="var(--ink)" opacity="0.55">
        <path d="M34 204c0-56 24-90 66-90s66 34 66 90z" />
        <circle cx="104" cy="78" r="48" />
      </g>
      <g stroke="var(--ink)" stroke-width="6" stroke-linejoin="round">
        <path d="M34 204c0-56 24-90 66-90s66 34 66 90z" fill={color} />
        <circle cx="104" cy="78" r="48" fill={color} />
        <path d="M50 204c2-32 13-54 28-64" fill="none" stroke={accent} stroke-width="7" stroke-linecap="round" opacity="0.6" />
      </g>
      <circle cx="124" cy="70" r="13" fill="var(--paper)" stroke="var(--ink)" stroke-width="5" />
      <circle cx="129" cy="70" r="5.5" fill="var(--ink)" />
    </svg>
    {#if label}<p class="absolute inset-x-0 bottom-2 text-center text-[0.65rem] font-semibold text-paper">{label}</p>{/if}
  {/if}
</div>

<style>
  .portrait {
    background:
      radial-gradient(circle at 50% 38%, rgb(255 240 200 / 0.5), transparent 62%),
      color-mix(in oklab, var(--tone) 34%, #24305e);
  }
</style>
