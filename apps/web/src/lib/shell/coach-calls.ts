/**
 * Live coaching, browser side. The arena service is the only thing that accepts a call;
 * this module hears what it accepted and lets a screen make one.
 *
 *   onCoachCall(listener)   every call the service accepted, once each, for either side.
 *                           `callId` is new for every acceptance, so the same call made
 *                           twice is heard twice.
 *   onCoaching(listener)    what each side can call right now, the call in force, the
 *                           game plans and the trainers picked at character select.
 *   submitCoachCall(...)    ask the service to make a call. Nothing is heard until it says yes.
 *
 * `watchMatch` in lib/arena/arena-client.ts feeds this, so any screen watching a match has it.
 */
import type {
  AcceptedCall,
  ArenaMessage,
  Coaching,
  CoachCallRequest,
  CoachCallResponse,
} from "@clanker/arena-service/protocol";
import type { GamePlanId } from "@clanker/game";

/** A call the service accepted. */
export interface CoachCall {
  readonly side: 0 | 1;
  /** The exact call, e.g. "Watch their Bedrock Quake!". */
  readonly message: string;
  /** Unique per acceptance within the match, counting up across both sides. */
  readonly callId: number;
  /** Which preset it was, e.g. "guard-up". */
  readonly presetId: string;
  /** The tick it was accepted on; it shapes picks for ticks fromTick to untilTick - 1. */
  readonly acceptedTick: number;
  readonly fromTick: number;
  readonly untilTick: number;
  /** When this browser heard it (ms). */
  readonly at: number;
}

/** Everything a coaching screen needs about the match being watched. */
export interface CoachSnapshot {
  readonly matchId: string;
  /** Ticks resolved so far. */
  readonly tick: number;
  readonly over: boolean;
  /** Trainer ids picked at character select (`trainer1`, `trainer2`), null where none. */
  readonly trainers: readonly [string | null, string | null];
  readonly plans: readonly [GamePlanId, GamePlanId];
  /** Per side: calls on offer, the call in force, and the tick the next call is allowed. */
  readonly sides: Coaching;
}

type CallListener = (call: CoachCall) => void;
type SnapshotListener = (snapshot: CoachSnapshot) => void;
const callListeners = new Set<CallListener>();
const snapshotListeners = new Set<SnapshotListener>();

let snapshot: CoachSnapshot | null = null;
/** The newest callId already announced for the match being watched. */
let heard = 0;

/** Hear every accepted call; returns the function that stops listening. */
export function onCoachCall(listener: CallListener): () => void {
  callListeners.add(listener);
  return () => callListeners.delete(listener);
}

/** Hear every coaching update, starting with the current one; returns the stop function. */
export function onCoaching(listener: SnapshotListener): () => void {
  snapshotListeners.add(listener);
  if (snapshot) listener(snapshot);
  return () => snapshotListeners.delete(listener);
}

export function coachSnapshot(): CoachSnapshot | null {
  return snapshot;
}

function announce(call: AcceptedCall) {
  if (call.callId <= heard) return;
  heard = call.callId;
  const said: CoachCall = {
    side: call.side,
    message: call.message,
    callId: call.callId,
    presetId: call.presetId,
    acceptedTick: call.acceptedTick,
    fromTick: call.fromTick,
    untilTick: call.untilTick,
    at: Date.now(),
  };
  for (const listener of callListeners) listener(said);
}

function publish(next: CoachSnapshot) {
  snapshot = next;
  for (const listener of snapshotListeners) listener(next);
}

/** Called by `watchMatch` with every message of the match being watched. */
export function receiveArenaMessage(matchId: string, message: ArenaMessage): void {
  if (message.type === "hello") {
    if (snapshot?.matchId !== matchId) heard = 0;
    const { state, match, coaching, calls } = message;
    publish({
      matchId,
      tick: state.tick,
      over: state.over,
      trainers: match.trainers,
      plans: match.plans,
      sides: coaching,
    });
    // Arriving mid-match: a call still in force is news here; finished ones are not.
    for (const call of calls) if (state.tick < call.untilTick) announce(call);
    heard = Math.max(heard, ...calls.map((c) => c.callId));
    return;
  }
  if (!snapshot || snapshot.matchId !== matchId) return;
  if (message.type === "tick") {
    const { state } = message.result;
    publish({ ...snapshot, tick: state.tick, over: state.over, sides: message.coaching });
    return;
  }
  publish({ ...snapshot, sides: message.coaching });
  announce(message.call);
}

/**
 * Ask the service to make a call for one side. On `ok: true` the call is also heard through
 * `onCoachCall`, here and in every other browser watching the match.
 */
export async function submitCoachCall(
  matchId: string,
  side: 0 | 1,
  presetId: string,
): Promise<CoachCallResponse> {
  try {
    const res = await fetch(`/api/matches/${encodeURIComponent(matchId)}/coach`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ side, presetId } satisfies CoachCallRequest),
    });
    return (await res.json()) as CoachCallResponse;
  } catch {
    return { ok: false, error: "Couldn't reach the arena service." };
  }
}
