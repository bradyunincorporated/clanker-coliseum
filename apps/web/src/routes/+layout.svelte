<script lang="ts">
  import "./layout.css";
  import SiteHeader from "#lib/components/shell/site-header.svelte";
  import { SITE_NAME } from "#lib/site.js";

  let { children } = $props();
</script>

<svelte:head>
  <title>{SITE_NAME}</title>
</svelte:head>

<SiteHeader />
{@render children()}
