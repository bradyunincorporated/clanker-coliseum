// Which animation, and which frame of it, a fighter shows on a given sim frame. Pure: the
// renderer and the sim's frame data decide the art together, so a strike pose is on screen on
// exactly the frames its hitbox is live.

import {
  FRAMES_PER_TICK,
  type FighterDef,
  type FighterFrame,
  type MoveDef,
  type MoveEffect,
  type MoveSlot,
  type PoseKey,
} from "@clanker/game";

export interface PoseChoice {
  /** Animation name in the fighter's sheet. */
  animation: string;
  /** How far through that animation, 0 to just under 1. */
  progress: number;
  /** Which pose it stands for, for per-pose offsets. */
  key: PoseKey;
}

export function isMove(def: FighterDef, action: string): action is MoveSlot {
  return action in def.moves;
}

/** Null when the fighter has no art for what it is doing: the placeholder is drawn instead. */
export function choosePose(def: FighterDef, f: FighterFrame): PoseChoice | null {
  const { animations = {}, moves = {} } = def.sprites;
  const spread = (key: PoseKey): PoseChoice | null => {
    const animation = animations[key];
    return animation
      ? { animation, key, progress: Math.min(f.actionFrame, 59) / FRAMES_PER_TICK }
      : null;
  };
  if (f.status !== "normal") return spread(f.status);
  if (!isMove(def, f.action)) return spread(f.action);

  const poses = moves[f.action];
  if (!poses) return spread(f.action);
  const move = def.moves[f.action];
  const key = f.action;
  // f.phase comes from the sim, so the art can never disagree with the hitbox.
  switch (f.phase) {
    case "startup":
      return { animation: poses.windup, key, progress: f.actionFrame / move.startup };
    case "active":
      return {
        animation: poses.strike,
        key,
        progress: (f.actionFrame - move.startup) / move.active,
      };
    case "recovery":
      return {
        animation: poses.recover,
        key,
        progress: (f.actionFrame - move.startup - move.active) / Math.max(1, move.recovery),
      };
    default:
      // The move is over; the rest of the tick is idle time.
      return animations.idle ? { animation: animations.idle, key: "idle", progress: 0 } : null;
  }
}

export interface EffectChoice {
  effect: MoveEffect;
  move: MoveDef;
  progress: number;
  /** 1 while it plays, falling to 0 over its linger frames. */
  alpha: number;
}

/** The effect overlay to draw this frame, if the fighter's current move has one showing. */
export function chooseEffect(def: FighterDef, f: FighterFrame): EffectChoice | null {
  if (f.status !== "normal" || !isMove(def, f.action)) return null;
  const effect = def.sprites.effects?.[f.action];
  if (!effect) return null;
  const move = def.moves[f.action];
  const from = effect.during === "startup+active" ? 0 : move.startup;
  const to = move.startup + move.active;
  const linger = effect.linger ?? 0;
  if (f.actionFrame < from || f.actionFrame >= to + linger) return null;
  if (f.actionFrame >= to) {
    return { effect, move, progress: 0.999, alpha: 1 - (f.actionFrame - to + 1) / (linger + 1) };
  }
  return { effect, move, progress: (f.actionFrame - from) / (to - from), alpha: 1 };
}

export function frameAt(progress: number, length: number): number {
  return Math.min(length - 1, Math.max(0, Math.floor(progress * length)));
}
