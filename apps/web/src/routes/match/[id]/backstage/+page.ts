import type { MatchReport } from "@clanker/arena-service/protocol";
export const ssr = false;
export async function load({
  params,
  fetch,
}: {
  params: { id: string };
  fetch: typeof globalThis.fetch;
}) {
  try {
    const response = await fetch(`/api/matches/${encodeURIComponent(params.id)}/report`);
    if (!response.ok)
      return {
        report: null,
        problem: "This report has expired. Play another match to see its decisions.",
      };
    return { report: (await response.json()) as MatchReport, problem: "" };
  } catch {
    return { report: null, problem: "The arena is unavailable. Try opening Backstage again." };
  }
}
