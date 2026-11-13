<script lang="ts">
  import type { FighterDef } from "@clanker/game";
  import FighterPortrait from "./fighter-portrait.svelte";
  import { cssColor, fighterArt } from "#lib/shell/roster.js";

  /** One corner's fighter for the menus: a framed portrait propped on a show podium. */
  let { def, side, size = 250 }: { def: FighterDef; side: 0 | 1; size?: number } = $props();
</script>

<div class="stand" style:--size="{size}px">
  <img class="podium" src="/ui/podium.webp" alt="" />
  {#key def.id}
    <div class="medal">
      <FighterPortrait
        src={fighterArt(def)}
        color={cssColor(def.sprites.color)}
        accent={cssColor(def.sprites.accent)}
        flip={side === 1}
        class="face"
      />
      <img class="ring" src="/ui/frame.webp" alt="" />
    </div>
  {/key}
</div>

<style>
  .stand {
    position: relative;
    width: var(--size);
    height: calc(var(--size) * 1.36);
  }
  .podium {
    position: absolute;
    left: 6%;
    bottom: 0;
    width: 88%;
    filter: drop-shadow(0 8px 6px rgb(10 14 34 / 0.55));
  }
  .medal {
    position: absolute;
    left: 0;
    top: 0;
    width: var(--size);
    height: var(--size);
    filter: drop-shadow(0 7px 6px rgb(10 14 34 / 0.5));
    animation: land 0.45s cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .medal :global(.face) {
    position: absolute;
    inset: 15%;
    border-radius: 50%;
  }
  .ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    /* Chrome draws a hairline at the edge of a scaled translucent image; trim it off. */
    clip-path: inset(3px);
  }
  @keyframes land {
    from {
      scale: 0.82;
      rotate: -5deg;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .medal { animation: none; }
  }
</style>
