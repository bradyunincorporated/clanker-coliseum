// Core data types for the deterministic fight simulation.
// Nothing in src/sim imports rendering code, so it can run in a worker, a server, or tests.

/** Frames simulated inside one action tick. One tick plays back over TICK_MS of real time. */
export const FRAMES_PER_TICK = 60;
export const TICK_MS = 1000;

/** Axis-aligned box in fighter-local space: x is measured in the facing direction, y upward from the feet. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** World-space rectangle: x to the right, y up from the floor (y = 0), (x, y) is the bottom-left corner. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MoveSlot = "move1" | "move2" | "move3" | "move4";
/** 12 actions total: 8 basic + 4 moves (classic fighter option count). */
export type BasicAction =
  | "idle"
  | "walkForward"
  | "walkBack"
  | "jump"
  | "jumpForward"
  | "crouch"
  | "block"
  | "crouchBlock";
export type ActionId = BasicAction | MoveSlot;

/** Actions the sim forces on a fighter that lost their pick (knocked down, punished). */
export type ForcedAction = "knockdown" | "stagger";

export const BASIC_ACTIONS: readonly BasicAction[] = [
  "idle",
  "walkForward",
  "walkBack",
  "jump",
  "jumpForward",
  "crouch",
  "block",
  "crouchBlock",
];
export const MOVE_SLOTS: readonly MoveSlot[] = ["move1", "move2", "move3", "move4"];
export const ALL_ACTIONS: readonly ActionId[] = [...BASIC_ACTIONS, ...MOVE_SLOTS];

/**
 * How a hit must be guarded. mid: either block. low: only crouchBlock. overhead: only standing block.
 * (Whether a crouching fighter ducks under a move is decided by the boxes, not the level.)
 */
export type HitLevel = "mid" | "low" | "overhead";

export type ElementType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

/** Hardcoded passive ability per fighter (no meter, no special move). */
export type PassiveEffect =
  /** Deal more damage while at or below a fraction of max HP. */
  | { kind: "rally"; belowHpPct: number; damageMult: number }
  /** Can't be knocked down. */
  | { kind: "steadfast" }
  /** Take less damage from moves of the given types. */
  | { kind: "resist"; types: ElementType[]; damageMult: number };

export interface PassiveDef {
  name: string;
  /** Plain-language rule; also fed to the decision model. */
  description: string;
  effect: PassiveEffect;
}

export interface MoveDef {
  name: string;
  type: ElementType;
  /** Frames before the hitbox appears. */
  startup: number;
  /** Frames the hitbox is live. */
  active: number;
  /** Frames after the hitbox before the fighter is neutral again. startup + active + recovery must be <= 60. */
  recovery: number;
  /** Hitbox in fighter-local space (x forward from the fighter's center, y up from the feet). */
  hitbox: Box;
  damage: number;
  /** Frames the defender is stunned on hit / on block. */
  hitstun: number;
  blockstun: number;
  /** Horizontal push on the defender, px per frame for a short slide. */
  knockback: number;
  level: HitLevel;
  /** Breaks ties in a trade: the higher priority hit wins outright. Equal priority = both land. */
  priority: number;
  /** Optional forward movement (px/frame) during startup + active frames. */
  lunge?: number;
  /** On hit, the defender loses their next pick (forced knockdown tick). */
  knockdown?: boolean;
  /** Frame range [from, to] (inclusive) with no hurtbox (reversal-style moves). */
  invincible?: [number, number];
  /** Stance while performing the move: affects the hurtbox. */
  stance?: "standing" | "crouching";
}

/** Hurtboxes per stance, fighter-local. Usually 2-3 boxes (head, body, legs). */
export interface HurtboxSet {
  standing: Box[];
  crouching: Box[];
  airborne: Box[];
}

export interface FighterStats {
  maxHp: number;
  /** Walk speed, px per frame. */
  walkSpeed: number;
  /** Initial jump velocity, px per frame (upward). */
  jumpVelocity: number;
  /** Gravity, px per frame per frame. */
  gravity: number;
  /** Pushbox half-width: fighters can't overlap closer than the sum of these. */
  pushWidth: number;
  /** Damage multiplier on incoming hits (1 = normal). */
  defense: number;
}

/** Anything a fighter can be shown doing: its action, or a status that overrides the pose. */
export type PoseKey = ActionId | ForcedAction | "hitstun" | "blockstun" | "ko" | "victory";

/**
 * A move's art, tied to the move's real frame data instead of a fixed timeline. Each value is
 * an animation name in the sheet (one frame or several). `strike` shows on exactly the frames
 * the hitbox is live; `windup` covers startup and `recover` covers recovery, each spread over
 * that phase however long it is. After the move ends the idle animation shows.
 */
export interface MovePoses {
  windup: string;
  strike: string;
  recover: string;
}

/**
 * Art drawn with a move's hitbox (flames, a shadow burst). It is only a picture: it never
 * changes what the move hits, and it travels with the fighter, not on its own.
 */
export interface MoveEffect {
  /** Animation name in the fighter's sheet, drawn facing right. Spread over the frames it shows. */
  animation: string;
  /**
   * Which frames show it. active (default): exactly while the hitbox is live.
   * startup+active: it builds up before the hit.
   */
  during?: "active" | "startup+active";
  /** Sim frames it stays on screen after the hitbox ends, frozen on its last frame and fading. */
  linger?: number;
  /** Nudge from the hitbox centre, world units (x forward, y up). */
  offset?: { x: number; y: number };
  /** Defaults to the fighter's sprite scale. */
  scale?: number;
  /** Draw behind the fighter instead of in front. */
  behind?: boolean;
}

/**
 * Sprite hooks. Every field is optional: the renderer draws a placeholder when art is missing,
 * so sprites can drop in one action at a time.
 */
export interface SpriteSpec {
  /** Path to a spritesheet JSON (TexturePacker / Aseprite "hash" or "array" format) loadable by PixiJS Assets. */
  sheet?: string;
  /** Animation name inside the sheet for each action. Spread evenly over the 60-frame tick. */
  animations?: Partial<Record<PoseKey, string>>;
  /**
   * Poses whose animation loops on real elapsed time instead of being spread over one tick:
   * the loop's length in milliseconds. A 3.6 second idle keeps playing across ticks for as
   * long as the fighter stays idle, and starts from its first frame when the pose begins.
   * Looks only: the sim never sees it. Good for idle, block, crouch, victory and ko.
   */
  loops?: Partial<Record<PoseKey, number>>;
  /** Phase-aware art per move. A move listed here ignores its entry in `animations`. */
  moves?: Partial<Record<MoveSlot, MovePoses>>;
  /** Effect art drawn with a move's hitbox. */
  effects?: Partial<Record<MoveSlot, MoveEffect>>;
  /**
   * Where the fighter's ground point sits in every cell, as a fraction of the cell: x is the
   * body's centre line, y is the floor line. Default (0.5, 1) = feet on the bottom edge. Put
   * the floor line higher (for example y = 0.9) to leave room below it for knockdown poses,
   * tails, or a creature that floats above the floor.
   */
  anchor?: { x: number; y: number };
  scale?: number;
  /**
   * Per-pose nudges in world units (x forward, y up) for poses that can't share the ground
   * point, such as a knockdown that should lie further back.
   */
  offsets?: Partial<Record<PoseKey, { x: number; y: number }>>;
  /** Placeholder colours used when art is missing. */
  color: number;
  accent: number;
}

export interface FighterDef {
  id: string;
  name: string;
  /** One-line flavor for select screens and for the decision model's prompt. */
  blurb: string;
  stats: FighterStats;
  hurtboxes: HurtboxSet;
  /** 1 or 2 types. Moves matching one get STAB. */
  types: ElementType[];
  passive: PassiveDef;
  /** Exactly 4 moves. */
  moves: Record<MoveSlot, MoveDef>;
  sprites: SpriteSpec;
}

/** Mutable per-fighter state inside the sim. Plain data so it can be cloned and serialized. */
export interface FighterState {
  side: 0 | 1;
  defId: string;
  x: number;
  /** Height above the floor (0 = grounded, positive = up). */
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  /** The action chosen (or forced) for the current tick. */
  action: ActionId | ForcedAction;
  /** Frames into the current action. */
  actionFrame: number;
  /** Remaining stun frames, carried across ticks. While > 0 the fighter can't act. */
  hitstun: number;
  blockstun: number;
  /** Remaining knockback slide frames and speed. */
  pushFrames: number;
  pushSpeed: number;
  /** Has the current move already connected (moves hit once). */
  moveConnected: boolean;
  /** Set when this fighter must skip their next pick. */
  forcedNext: ForcedAction | null;
}

export type EventType =
  | "hit"
  | "block"
  | "trade"
  | "whiff"
  | "ko"
  | "knockdown"
  | "punish"
  | "timeout";

export interface FightEvent {
  tick: number;
  frame: number;
  type: EventType;
  /** Side that caused the event (attacker), if any. */
  side?: 0 | 1;
  move?: string;
  damage?: number;
  /** Type effectiveness multiplier applied (1 = neutral). */
  effectiveness?: number;
  text: string;
}

/** Snapshot of one simulated frame for playback: everything the renderer needs, nothing more. */
export interface FrameSnapshot {
  frame: number;
  fighters: [FighterFrame, FighterFrame];
}

export interface FighterFrame {
  x: number;
  y: number;
  facing: 1 | -1;
  hp: number;
  action: ActionId | ForcedAction;
  actionFrame: number;
  stance: "standing" | "crouching" | "airborne";
  /** 'hitstun' / 'blockstun' override the visual pose. */
  status: "normal" | "hitstun" | "blockstun" | "ko";
  hurtboxes: Rect[];
  hitbox: Rect | null;
  /** Frame phase of the current move, for debugging and animation sync. */
  phase: "none" | "startup" | "active" | "recovery";
}

export interface MatchConfig {
  stageWidth: number;
  /** Round length in ticks (1 tick = 1 second of playback). */
  roundTicks: number;
  startGap: number;
}

export interface MatchState {
  config: MatchConfig;
  tick: number;
  fighters: [FighterState, FighterState];
  over: boolean;
  winner: 0 | 1 | "draw" | null;
}

export interface TickResult {
  /** State at the end of the tick (input for the next one). */
  state: MatchState;
  /** 60 snapshots for playback. */
  frames: FrameSnapshot[];
  events: FightEvent[];
  /** The actions that actually ran (after forced overrides). */
  actions: [ActionId | ForcedAction, ActionId | ForcedAction];
}
