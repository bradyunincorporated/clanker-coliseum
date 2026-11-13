<script lang="ts">
  import { page } from "$app/state";
  import { SITE_NAME } from "#lib/site.js";

  const steps = [
    { href: "/fighters", label: "Fighters" },
    { href: "/match", label: "Live match" },
    { href: "/arena", label: "Arena" },
  ];
</script>

<header class="border-b-4 border-ink bg-hero text-paper">
  <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
    <a href="/" class="font-script text-3xl leading-none [text-shadow:2px_2px_0_var(--ink)]">{SITE_NAME}</a>
    <nav aria-label="Main" class="flex items-center gap-1">
      {#each steps as step, i (step.href)}
        {@const current = page.url.pathname.startsWith(step.href)}
        <a
          href="{step.href}{page.url.search}"
          aria-current={current ? "page" : undefined}
          class="callout rounded px-3 py-1 text-sm transition-colors {current
            ? 'bg-paper text-ink'
            : 'text-paper hover:bg-ink/20'}"
        >
          <span class="opacity-70">{i + 1}.</span>
          {step.label}
        </a>
      {/each}
    </nav>
  </div>
  <div class="stripes h-2 border-t-[3px] border-ink" aria-hidden="true"></div>
</header>

<style>
  .stripes {
    background: repeating-linear-gradient(-45deg, var(--paper) 0 10px, var(--mustard) 10px 20px);
  }
</style>
