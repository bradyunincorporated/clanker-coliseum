<script lang="ts">
  import "./layout.css";
  import GameFrame from "#lib/components/shell/game-frame.svelte";
  import { SITE_NAME } from "#lib/site.js";

  let { children } = $props();
</script>

<svelte:head>
  <title>{SITE_NAME}</title>
</svelte:head>

<GameFrame>
  {@render children()}
</GameFrame>
