/**
 * The hook for live coaching: something calls `coachCall(side, callId)` and whatever is
 * mounted in the match screen's coach corners hears it. Nothing here talks to the service.
 */
export type CoachCall = { readonly side: 0 | 1; readonly callId: string; readonly at: number };

type Listener = (call: CoachCall) => void;
const listeners = new Set<Listener>();

/** Announce a coach's call for one side. */
export function coachCall(side: 0 | 1, callId: string): void {
  const call: CoachCall = { side, callId, at: Date.now() };
  for (const listener of listeners) listener(call);
}

/** Hear every call; returns the function that stops listening. */
export function onCoachCall(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
