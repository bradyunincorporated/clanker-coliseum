<script lang="ts">
  import "./layout.css";
  import { SITE_NAME } from "#lib/site.js";

  let { children } = $props();
</script>

<svelte:head>
  <title>{SITE_NAME}</title>
</svelte:head>

{@render children()}
