<script lang="ts">
  import { page } from "$app/state";
  import DinerDiorama from "#lib/components/shell/diner-diorama.svelte";
  import Standee from "#lib/components/shell/standee.svelte";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  import { brainsFrom, setupQuery } from "#lib/shell/brains.js";
  import { cssColor, picksFrom } from "#lib/shell/roster.js";

  const picks = $derived(picksFrom(page.url.searchParams));
  const brains = $derived(brainsFrom(page.url.searchParams));
</script>

<svelte:head><title>The arena</title></svelte:head>

<!-- The stage on its own, lights up, camera drifting. Nothing is simulated here. -->
<main class="absolute inset-0">
  <DinerDiorama label="The diner arena: an empty stage">
    <Standee name={picks[0].name} color={cssColor(picks[0].sprites.color)} x={30} />
    <Standee name={picks[1].name} color={cssColor(picks[1].sprites.color)} x={70} flip />
  </DinerDiorama>

  <h1 class="lettering absolute inset-x-0 top-9 text-center text-[40px]">The Diner at Dusk</h1>
  <div class="absolute top-[26px] left-[22px]"><SignButton href="/" tone="cream" size="sm">Back</SignButton></div>
  <div class="absolute top-[26px] right-[22px]"><SignButton href="/fighters{setupQuery(picks, brains, page.url.searchParams)}" size="sm">Play</SignButton></div>
</main>
