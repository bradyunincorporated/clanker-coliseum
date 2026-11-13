<script lang="ts">
  import { page } from "$app/state";
  import { FIGHTERS } from "@clanker/game";
  import { BRAIN_MODELS, isModelBrain, type PickInfo } from "@clanker/arena-service/protocol";
  import SignButton from "#lib/components/ui/sign-button.svelte";
  let { data } = $props();
  let offset = $state(0);
  const report = $derived(data.report);
  const rows = $derived(report?.decisions.slice(offset, offset + 5) ?? []);
  const sides = [0, 1] as const;
  function summary(side: 0 | 1) {
    const picks = report?.decisions.map((row) => row.picks[side]) ?? [];
    const times = picks.filter((p) => p.source !== "forced" && p.latencyMs !== undefined).map((p) => p.latencyMs!);
    return {
      answered: picks.filter((p) => ["gemini", "jev", "clef"].includes(p.source)).length,
      fallback: picks.filter((p) => p.source === "fallback").length,
      late: picks.filter((p) => p.source === "late").length,
      average: times.length ? `${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms` : "—",
    };
  }
  function action(pick: PickInfo, side: 0 | 1) {
    const fighter = report && FIGHTERS[report.match.fighters[side]];
    return fighter && pick.action in fighter.moves
      ? fighter.moves[pick.action as keyof typeof fighter.moves].name
      : pick.action.replace(/([A-Z])/g, " $1");
  }
</script>

<svelte:head><title>Backstage · Clanker Coliseum</title></svelte:head>
<main class="backstage absolute inset-0">
  <header><SignButton href="/fighters{page.url.search}" tone="cream" size="sm">New fighters</SignButton><h1>Backstage</h1><SignButton href="/match{page.url.search}" size="sm">Rematch</SignButton></header>
  {#if report}
    <section class="summaries" aria-label="Model performance">
      {#each sides as side}
        {@const brain = report.match.brains[side]}
        {@const stats = summary(side)}
        <article>
          <h2>{FIGHTERS[report.match.fighters[side]]?.name ?? report.match.fighters[side]} · {isModelBrain(brain) ? BRAIN_MODELS[brain].name : brain}</h2>
          <p>{stats.answered} model picks · {stats.average} average response · {stats.late} late · {stats.fallback} fallbacks</p>
        </article>
      {/each}
    </section>
    <section class="ledger" aria-label="Decision history">
      <div class="ledger-heading"><h2>Behind every move</h2><span>{report.over ? "Final report" : "Match in progress · snapshot"} · Seed {report.match.seed}</span></div>
      <table>
        <thead><tr><th>Tick</th>{#each sides as side}<th>{FIGHTERS[report.match.fighters[side]]?.name ?? report.match.fighters[side]}</th>{/each}</tr></thead>
        <tbody>{#each rows as row}<tr><td>{row.tick}</td>{#each sides as side}{@const pick = row.picks[side]}<td><strong>{action(pick, side)}</strong><span>{pick.source}{pick.provider ? ` (${pick.provider})` : ""} · {pick.latencyMs === undefined ? "—" : `${Math.round(pick.latencyMs)} ms`}{pick.call ? ` · Coach #${pick.call}${pick.followed ? " followed" : ""}` : ""}</span></td>{/each}</tr>{/each}</tbody>
      </table>
      {#if !report.decisions.length}<p>No decisions recorded yet.</p>{/if}
      <footer><button disabled={offset === 0} onclick={() => offset = Math.max(0, offset - 5)}>← Earlier</button><span>{report.decisions.length ? `${offset + 1}–${Math.min(offset + 5, report.decisions.length)} of ${report.decisions.length}` : "0 decisions"}</span><button disabled={offset + 5 >= report.decisions.length} onclick={() => offset += 5}>Later →</button></footer>
    </section>
  {:else}<section class="ledger"><h2>Report unavailable</h2><p>{data.problem}</p></section>{/if}
</main>

<style>
  .backstage { padding: 24px 52px; color: var(--ink, #1b2140); background: linear-gradient(#16223bc9, #16223be6), url('/ui/chalkboard.webp') center / cover; }
  header { display: flex; align-items: center; justify-content: space-between; height: 76px; }
  h1 { font-family: 'Lilita One', sans-serif; color: #f3e9d2; font-size: 52px; text-shadow: 3px 4px #1b2140; }
  h2 { font-family: 'Lilita One', sans-serif; font-size: 25px; margin: 0; }
  .summaries { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 12px 0; }
  article, .ledger { background: #f3e9d2 url('/ui/card.webp') center / 100% 100%; border-radius: 18px; box-shadow: 0 5px 0 #10172880; padding: 20px 28px; }
  article p { font-size: 17px; margin: 8px 0 0; }
  .ledger { min-height: 400px; }
  .ledger-heading, footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .ledger-heading span, footer { font-size: 16px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 10px 0; text-align: left; }
  th:first-child { width: 70px; }
  th { font-size: 16px; padding: 8px; }
  td { border-top: 1px dashed #766d6077; padding: 8px; font-size: 19px; height: 54px; }
  td span { display: block; font-size: 14px; }
  footer button { background: #1b2140; color: #f3e9d2; border-radius: 9px; padding: 7px 15px; cursor: pointer; }
  footer button:disabled { opacity: 0.35; cursor: default; }
</style>
