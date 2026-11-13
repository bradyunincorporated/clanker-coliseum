// Deterministic tick resolver.
// Both fighters' actions start on frame 0, the sim steps 60 frames, checks boxes every frame,
// and returns the end state plus per-frame snapshots and an event log for playback.
// Same inputs always produce the same outputs: no Math.random, no clocks.

import {
  ALL_ACTIONS,
  FRAMES_PER_TICK,
  MOVE_SLOTS,
  type ActionId,
  type Box,
  type FighterDef,
  type FighterFrame,
  type FighterState,
  type FightEvent,
  type ForcedAction,
  type FrameSnapshot,
  type MatchConfig,
  type MatchState,
  type MoveDef,
  type MoveSlot,
  type Rect,
  type TickResult,
} from "./types.js";
import { effectiveness, stab } from "./type-chart.js";

/** A blocked move is unsafe (attacker loses next pick) if it leaves the attacker this many frames minus. */
export const UNSAFE_THRESHOLD = 12;
const PUSH_FRAMES = 8;

export const DEFAULT_CONFIG: MatchConfig = {
  /** Walled stage, roughly 14 fighter widths. */
  stageWidth: 1200,
  /** 40 ticks = 40 seconds at 1 tick per second. */
  roundTicks: 40,
  startGap: 360,
};

export type FighterLookup = (id: string) => FighterDef;

export function isMoveSlot(a: ActionId | ForcedAction): a is MoveSlot {
  return (MOVE_SLOTS as readonly string[]).includes(a);
}

export function createMatch(
  defs: [FighterDef, FighterDef],
  config: MatchConfig = DEFAULT_CONFIG,
): MatchState {
  const mid = config.stageWidth / 2;
  const mk = (side: 0 | 1, def: FighterDef): FighterState => ({
    side,
    defId: def.id,
    x: side === 0 ? mid - config.startGap / 2 : mid + config.startGap / 2,
    y: 0,
    vx: 0,
    vy: 0,
    facing: side === 0 ? 1 : -1,
    hp: def.stats.maxHp,
    action: "idle",
    actionFrame: 0,
    hitstun: 0,
    blockstun: 0,
    pushFrames: 0,
    pushSpeed: 0,
    moveConnected: false,
    forcedNext: null,
  });
  return { config, tick: 0, fighters: [mk(0, defs[0]), mk(1, defs[1])], over: false, winner: null };
}

/** Actions a fighter may pick this tick. Empty when the pick is forced (knockdown, punished). */
export function legalActions(f: FighterState): ActionId[] {
  if (f.forcedNext || f.hp <= 0) return [];
  return [...ALL_ACTIONS];
}

export function cloneState(s: MatchState): MatchState {
  return {
    ...s,
    config: { ...s.config },
    fighters: [{ ...s.fighters[0] }, { ...s.fighters[1] }],
  };
}

// ---------- geometry ----------

function toWorld(f: FighterState, b: Box): Rect {
  const x = f.facing === 1 ? f.x + b.x : f.x - b.x - b.w;
  return { x, y: f.y + b.y, w: b.w, h: b.h };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function movePhase(m: MoveDef, frame: number): "startup" | "active" | "recovery" | "done" {
  if (frame < m.startup) return "startup";
  if (frame < m.startup + m.active) return "active";
  if (frame < m.startup + m.active + m.recovery) return "recovery";
  return "done";
}

function stanceOf(f: FighterState, def: FighterDef): "standing" | "crouching" | "airborne" {
  if (f.y > 0) return "airborne";
  if (f.hitstun > 0) return "standing";
  if (f.action === "crouch" || f.action === "crouchBlock" || f.action === "knockdown")
    return "crouching";
  if (isMoveSlot(f.action) && def.moves[f.action].stance === "crouching") {
    return movePhase(def.moves[f.action], f.actionFrame) === "done" ? "standing" : "crouching";
  }
  return "standing";
}

function hurtboxesOf(f: FighterState, def: FighterDef): Rect[] {
  if (f.hp <= 0) return [];
  if (f.action === "knockdown" && f.hitstun === 0) return []; // on the ground, can't be hit
  if (f.hitstun === 0 && isMoveSlot(f.action)) {
    const inv = def.moves[f.action].invincible;
    if (inv && f.actionFrame >= inv[0] && f.actionFrame <= inv[1]) return [];
  }
  return def.hurtboxes[stanceOf(f, def)].map((b) => toWorld(f, b));
}

/** Active hitbox this frame, or null. */
function hitboxOf(f: FighterState, def: FighterDef): Rect | null {
  if (f.hp <= 0 || f.hitstun > 0 || f.blockstun > 0 || f.moveConnected || !isMoveSlot(f.action))
    return null;
  const m = def.moves[f.action];
  return movePhase(m, f.actionFrame) === "active" ? toWorld(f, m.hitbox) : null;
}

/** Does the defender's guard stop a move of this level? */
function guards(f: FighterState, level: MoveDef["level"]): boolean {
  if (f.y !== 0 || f.hitstun > 0) return false;
  if (f.action === "block") return level !== "low";
  if (f.action === "crouchBlock") return level !== "overhead";
  return false;
}

// ---------- tick ----------

/**
 * Resolve one tick. `picks` are the decision providers' choices; illegal picks fall back to idle,
 * and forced actions (knockdown, stagger) override the pick.
 */
export function resolveTick(
  prev: MatchState,
  picks: [ActionId, ActionId],
  lookup: FighterLookup,
): TickResult {
  const state = cloneState(prev);
  const events: FightEvent[] = [];
  const frames: FrameSnapshot[] = [];
  const fs = state.fighters;
  const defs: [FighterDef, FighterDef] = [lookup(fs[0].defId), lookup(fs[1].defId)];
  const tick = state.tick;
  const log = (e: Omit<FightEvent, "tick">) => events.push({ tick, ...e });

  if (state.over) {
    return { state, frames: [], events, actions: [fs[0].action, fs[1].action] };
  }

  // 1. Lock in actions and face each other.
  for (const i of [0, 1] as const) {
    const f = fs[i];
    const legal = legalActions(f);
    let action: ActionId | ForcedAction;
    if (f.forcedNext) {
      action = f.forcedNext;
      f.forcedNext = null;
    } else {
      action = legal.includes(picks[i]) ? picks[i] : "idle";
    }
    f.action = action;
    f.actionFrame = 0;
    f.moveConnected = false;
    f.vx = 0;
    const other = fs[1 - i];
    f.facing = other.x >= f.x ? 1 : -1;
  }
  const actions: [ActionId | ForcedAction, ActionId | ForcedAction] = [fs[0].action, fs[1].action];

  // 2. Step 60 frames.
  for (let frame = 0; frame < FRAMES_PER_TICK; frame++) {
    for (const i of [0, 1] as const) stepMovement(fs[i], defs[i], frame);
    separate(fs, defs, state.config);

    // Hit checks: compute both directions first, then apply, so neither side has an order advantage.
    const pending: Array<{ att: 0 | 1; move: MoveDef } | null> = [null, null];
    for (const a of [0, 1] as const) {
      const d = (1 - a) as 0 | 1;
      const hb = hitboxOf(fs[a], defs[a]);
      if (!hb) continue;
      if (hurtboxesOf(fs[d], defs[d]).some((r) => overlaps(hb, r))) {
        pending[a] = { att: a, move: defs[a].moves[fs[a].action as MoveSlot] };
      }
    }
    if (pending[0] && pending[1]) {
      const p0 = pending[0].move.priority;
      const p1 = pending[1].move.priority;
      if (p0 > p1) pending[1] = null;
      else if (p1 > p0) pending[0] = null;
      else
        log({
          frame,
          type: "trade",
          text: `Trade! ${pending[0].move.name} and ${pending[1].move.name} both land`,
        });
    }
    for (const p of pending) if (p) applyHit(fs, defs, p.att, p.move, frame, log);

    // Whiff detection: active window just ended without contact.
    for (const i of [0, 1] as const) {
      const f = fs[i];
      if (isMoveSlot(f.action) && f.hitstun === 0 && !f.moveConnected) {
        const m = defs[i].moves[f.action];
        if (f.actionFrame === m.startup + m.active - 1) {
          log({
            frame,
            type: "whiff",
            side: i,
            move: m.name,
            text: `${defs[i].name}'s ${m.name} whiffs`,
          });
        }
      }
    }

    frames.push(snapshot(frame, fs, defs));
    for (const f of fs) f.actionFrame++;

    if (fs[0].hp <= 0 || fs[1].hp <= 0) {
      // Keep stepping so the KO plays out, but nobody acts.
      if (!state.over) {
        state.over = true;
        state.winner = fs[0].hp <= 0 && fs[1].hp <= 0 ? "draw" : fs[0].hp <= 0 ? 1 : 0;
        const w = state.winner;
        log({
          frame,
          type: "ko",
          side: w === "draw" ? undefined : w,
          text: w === "draw" ? "Double KO!" : `KO! ${defs[w].name} wins`,
        });
      }
    }
  }

  // 3. End of tick bookkeeping.
  state.tick = tick + 1;
  if (!state.over && state.tick >= state.config.roundTicks) {
    state.over = true;
    const r0 = fs[0].hp / defs[0].stats.maxHp;
    const r1 = fs[1].hp / defs[1].stats.maxHp;
    state.winner = r0 === r1 ? "draw" : r0 > r1 ? 0 : 1;
    const w = state.winner;
    log({
      frame: FRAMES_PER_TICK - 1,
      type: "timeout",
      text: w === "draw" ? "Time! Draw" : `Time! ${defs[w].name} wins on health`,
    });
  }
  return { state, frames, events, actions };
}

function stepMovement(f: FighterState, def: FighterDef, _frame: number): void {
  const s = def.stats;
  if (f.hp <= 0) {
    f.vx = 0;
  } else if (f.hitstun > 0) {
    f.hitstun--;
    f.vx = 0;
    if (f.hitstun === 0 && f.action !== "knockdown") f.action = "idle";
  } else if (f.blockstun > 0) {
    f.blockstun--;
    f.vx = 0;
  } else if (f.y > 0 && f.action !== "jump" && f.action !== "jumpForward") {
    // Airborne carry-over from a previous tick: no new actions until landing.
  } else {
    switch (f.action) {
      case "walkForward":
        f.vx = s.walkSpeed * f.facing;
        break;
      case "walkBack":
        f.vx = -s.walkSpeed * 0.8 * f.facing;
        break;
      case "jump":
      case "jumpForward":
        if (f.actionFrame === 0 && f.y === 0) f.vy = s.jumpVelocity;
        f.vx = f.action === "jumpForward" && f.y > 0 ? s.walkSpeed * 1.6 * f.facing : 0;
        break;
      default:
        f.vx = 0;
        if (isMoveSlot(f.action)) {
          const m = def.moves[f.action];
          const ph = movePhase(m, f.actionFrame);
          if (m.lunge && (ph === "startup" || ph === "active")) f.vx = m.lunge * f.facing;
        }
    }
  }

  // Knockback slide.
  let dx = f.vx;
  if (f.pushFrames > 0) {
    dx += f.pushSpeed;
    f.pushFrames--;
  }
  f.x += dx;

  // Gravity.
  if (f.y > 0 || f.vy > 0) {
    f.y += f.vy;
    f.vy -= s.gravity;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
    }
  }
}

function separate(
  fs: [FighterState, FighterState],
  defs: [FighterDef, FighterDef],
  cfg: MatchConfig,
): void {
  const [a, b] = fs;
  const minGap = defs[0].stats.pushWidth + defs[1].stats.pushWidth;
  const dx = b.x - a.x;
  // Only push apart when their bodies overlap vertically (a high jump can pass over).
  const verticalOverlap = Math.abs(a.y - b.y) < 120;
  if (verticalOverlap && Math.abs(dx) < minGap) {
    const dir = dx === 0 ? (a.side === 0 ? 1 : -1) : Math.sign(dx);
    const push = (minGap - Math.abs(dx)) / 2;
    a.x -= push * dir;
    b.x += push * dir;
  }
  for (const i of [0, 1] as const) {
    const f = fs[i];
    const pw = defs[i].stats.pushWidth;
    const lo = pw;
    const hi = cfg.stageWidth - pw;
    if (f.x < lo || f.x > hi) {
      const clamped = Math.min(hi, Math.max(lo, f.x));
      const over = f.x - clamped;
      f.x = clamped;
      // Pinned against the wall: the other fighter absorbs the rest of the push.
      const o = fs[1 - i];
      if (Math.abs(o.x - f.x) < minGap) o.x -= over;
    }
  }
}

function applyHit(
  fs: [FighterState, FighterState],
  defs: [FighterDef, FighterDef],
  att: 0 | 1,
  move: MoveDef,
  frame: number,
  log: (e: Omit<FightEvent, "tick">) => void,
): void {
  const a = fs[att];
  const d = fs[1 - att];
  const aDef = defs[att];
  const dDef = defs[1 - att];
  a.moveConnected = true;
  d.pushFrames = PUSH_FRAMES;
  d.pushSpeed = move.knockback * a.facing;

  const blocked = guards(d, move.level);
  if (blocked) {
    d.blockstun = move.blockstun;
    log({
      frame,
      type: "block",
      side: att,
      move: move.name,
      text: `${dDef.name} blocks ${move.name}`,
    });
    const attackerRemaining = move.startup + move.active + move.recovery - a.actionFrame;
    if (attackerRemaining - move.blockstun >= UNSAFE_THRESHOLD) {
      a.forcedNext = "stagger";
      log({
        frame,
        type: "punish",
        side: (1 - att) as 0 | 1,
        move: move.name,
        text: `${move.name} is unsafe: ${aDef.name} is open next tick`,
      });
    }
    return;
  }

  const eff = effectiveness(move.type, dDef.types);
  let mult = stab(move.type, aDef.types) * eff * dDef.stats.defense;
  const ap = aDef.passive.effect;
  if (ap.kind === "rally" && a.hp <= aDef.stats.maxHp * ap.belowHpPct) mult *= ap.damageMult;
  const dp = dDef.passive.effect;
  if (dp.kind === "resist" && dp.types.includes(move.type)) mult *= dp.damageMult;
  const dmg = Math.max(1, Math.round(move.damage * mult));
  d.hp = Math.max(0, d.hp - dmg);
  d.hitstun = move.hitstun;
  d.blockstun = 0;
  d.moveConnected = false;
  if (d.action !== "knockdown") d.action = "idle";
  const effText = eff > 1 ? " (super effective)" : eff < 1 ? " (not very effective)" : "";
  log({
    frame,
    type: "hit",
    side: att,
    move: move.name,
    damage: dmg,
    effectiveness: eff,
    text: `${aDef.name}'s ${move.name} hits for ${dmg}${effText}`,
  });
  if (move.knockdown && d.hp > 0 && dDef.passive.effect.kind !== "steadfast") {
    d.forcedNext = "knockdown";
    log({
      frame,
      type: "knockdown",
      side: att,
      move: move.name,
      text: `${dDef.name} is knocked down`,
    });
  }
}

function snapshot(
  frame: number,
  fs: [FighterState, FighterState],
  defs: [FighterDef, FighterDef],
): FrameSnapshot {
  const one = (i: 0 | 1): FighterFrame => {
    const f = fs[i];
    const def = defs[i];
    let phase: FighterFrame["phase"] = "none";
    if (isMoveSlot(f.action) && f.hitstun === 0) {
      const p = movePhase(def.moves[f.action], f.actionFrame);
      phase = p === "done" ? "none" : p;
    }
    return {
      x: f.x,
      y: f.y,
      facing: f.facing,
      hp: f.hp,
      action: f.action,
      actionFrame: f.actionFrame,
      stance: stanceOf(f, def),
      status:
        f.hp <= 0 ? "ko" : f.hitstun > 0 ? "hitstun" : f.blockstun > 0 ? "blockstun" : "normal",
      hurtboxes: hurtboxesOf(f, def),
      hitbox: hitboxOf(f, def),
      phase,
    };
  };
  return { frame, fighters: [one(0), one(1)] };
}
