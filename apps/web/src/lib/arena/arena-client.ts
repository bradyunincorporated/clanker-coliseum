// Browser side of the arena service's API (proxied at /api by Vite).

import type {
  ArenaMessage,
  HealthResponse,
  MatchSummary,
  StartMatchRequest,
} from "@clanker/arena-service/protocol";

export async function health(): Promise<HealthResponse | null> {
  try {
    const res = await fetch("/api/health");
    return res.ok ? ((await res.json()) as HealthResponse) : null;
  } catch {
    return null;
  }
}

export async function startMatch(req: StartMatchRequest): Promise<MatchSummary> {
  const res = await fetch("/api/matches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  const body = (await res.json().catch(() => ({}))) as MatchSummary & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `The arena service answered HTTP ${res.status}`);
  return body;
}

/** Watch a match. Returns the function that stops watching. */
export function watchMatch(
  id: string,
  handlers: { message: (m: ArenaMessage) => void; missing: () => void; error: () => void },
): () => void {
  const source = new EventSource(`/api/matches/${encodeURIComponent(id)}/events`);
  source.onmessage = (e) => handlers.message(JSON.parse(e.data as string) as ArenaMessage);
  source.addEventListener("missing", () => {
    source.close();
    handlers.missing();
  });
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) handlers.error();
  };
  return () => source.close();
}
