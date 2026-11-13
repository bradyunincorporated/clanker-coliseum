# Clanker Coliseum: how to make a fighter

Version 4, 2026-11-13. A generic template for making any fighter: what a fighter is made of, what each field does in a fight, which frames to draw, and the file format the engine loads. It matches the current engine build (`packages/game/src/sim/types.ts`, `apps/web/src/lib/arena/fighter-view.ts`). Version 4 changes: move art follows the move's real frame data (section 5), the floor line sits at y = 468 in the cell instead of the bottom edge (section 4), body layouts for four-legged and round creatures (section 2), effect art per move (section 5), and corrected wording on what recovery does (section 2).

## 1. How a fight works (why the fields matter)

- Two fighters on a flat stage with walls. Nobody controls them live: an AI decision model picks one action per fighter every **1 second (1 tick)**. Both actions start at the same moment.
- Each tick is simulated as **60 frames** and then played back over 1 second. Every frame, the engine checks whether one fighter's **hitbox** (the attack area) overlaps the other's **hurtbox** (the body). Speed, reach and timing decide who wins an exchange, exactly like a classic 2D fighter.
- The AI reads the fighter's data (stats, type, passive, every move's numbers and description) to choose what to do. Accurate names and descriptions make the AI play the fighter well.
- Rounds are 40 seconds, best of 1, HP to 0. On timeout, more HP wins.

## 2. What a fighter is made of

One fighter = one data file (`packages/game/src/fighters/<id>.ts`) + one spritesheet + one portrait.

### Identity

| Field | What it is | Effect in the game |
| --- | --- | --- |
| `id` | Lowercase, no spaces | File and folder name |
| `name` | Display name | Shown on screen; the AI sees it |
| `blurb` | One line of personality and fighting style ("rushes in and overwhelms up close") | Select screen; the AI uses it as a hint for how to play |
| `types` | 1 or 2 of the 18 types: normal, fire, water, electric, grass, ice, fighting, poison, ground, flying, psychic, bug, rock, ghost, dragon, dark, steel, fairy | Moves of a matching type get a same-type bonus (STAB). The defender's types decide super-effective (x1.2) or resisted (x0.8) damage |

### Stats

| Field | Typical range | Effect |
| --- | --- | --- |
| `maxHp` | 90 to 130 | How much damage it takes to KO. A KO should take about 10 to 15 clean hits |
| `walkSpeed` | 1.5 to 3 px per frame | Distance covered per walk tick (60 frames, so 90 to 180 px). Fast walkers close gaps and escape; slow ones rely on reach |
| `jumpVelocity` | 7 to 10 | How high and long the jump is (with gravity) |
| `gravity` | 0.35 to 0.45 | Higher = shorter, snappier jump. Airtime is about 2 x jumpVelocity / gravity frames, keep it under 50 |
| `pushWidth` | 40 to 55 | Half-width of the body for collisions. Wider fighters can't get as close and are easier to hit |
| `defense` | 0.85 to 1.1 | Multiplier on incoming damage. Below 1 = tanky |

Trade-offs to keep fighters fair: big, slow and tanky (high HP, low defense, wide body, slow walk) versus small and fast (low HP, quick walk, narrow body).

### Hurtboxes (the body)

Three sets of rectangles, one per stance: `standing`, `crouching`, `airborne`. Each is usually 3 boxes (legs, body, head). Coordinates are fighter-local: x forward from the body's center line, y up from the feet.

- Pick the layout that fits the creature **before drawing attack poses**, because reach and height are measured against it:
  - `standardHurtboxes(scale, width)`: upright humanoid. Standing height = 180 x scale, crouch height = 118 x scale, body width = 72 x scale x width.
  - `quadrupedHurtboxes(length, height, headRise)`: four-legged. A long low torso with the head out in front. Defaults 170 long, 100 high at the back, head 30 above the back.
  - `roundHurtboxes(diameter, hover)`: compact round body. `hover` lifts it off the floor for a creature that floats. Low attacks pass under a hovering body, so keep hover small (0 to 20) unless that is the point of the fighter.
  - Or write the three sets by hand as plain rectangles; any number of boxes per stance works.
- `pushWidth` (in stats) should be about half the body's length at floor level.
- **Effect:** a taller fighter is easier to hit high; a short crouch ducks more attacks. The art must fill these boxes (section 4).

### Passive ability (exactly one)

A permanent rule instead of a special move. There's no meter and no super. It has a `name`, a plain-language `description` (the AI reads it) and an `effect` the engine runs. Effects the engine supports now:

| Effect | Fields | Example |
| --- | --- | --- |
| `rally` | `belowHpPct`, `damageMult` | Deals 20% more damage at 35% HP or less |
| `steadfast` | none | Can never be knocked down |
| `resist` | `types`, `damageMult` | Takes 25% less damage from fire and ice moves |

A new kind of passive needs a small code change, so describe it clearly.

### Moves (exactly 4)

Every fighter has 4 fixed moves, `move1` to `move4`. Each move is one tick (1 second) long.

| Field | What it means | Effect |
| --- | --- | --- |
| `name` | Move name | Shown on screen; the AI sees it |
| `type` | One of the 18 types | Type effectiveness and STAB |
| `startup` | Frames before the attack can hit | Lower = faster. This is what wins exchanges: when two attacks are thrown at once, the faster one that reaches lands first and cancels the other |
| `active` | Frames the hitbox is live | More = easier to land, catches movement |
| `recovery` | Frames after the hitbox before the move is over | Matters in exactly one case: **when the move is blocked**. If the frames the attacker still has left, minus the defender's blockstun, come to 12 or more, the attacker is staggered and loses their whole next tick. Otherwise recovery changes nothing: every action is locked for the full second, so a fighter who attacked can't block for the rest of that tick however short the recovery, and recovery never carries into the next tick. It also sets how long the recover pose shows, and how long a crouching move stays low |
| | | startup + active + recovery must be 60 or less. Whatever is left of the 60 is idle time |
| `hitbox` | One rectangle `{x, y, w, h}`, fighter-local | Reach (`x + w`) and height. Long reach controls spacing; low boxes hit crouchers; high boxes catch jumps |
| `damage` | 4 to 16 | Base damage before type, STAB, passive and defense |
| `hitstun` | 12 to 26 frames | How long the defender is stunned on hit. A hit also cancels whatever the defender was doing this tick. If the stun runs past the end of the tick, the defender's next action is cancelled too (rare: only very late hits) |
| `blockstun` | 8 to 20 frames | How long the defender is held on block. Higher blockstun makes the move safer: see `recovery` |
| `knockback` | 2 to 6 px per frame | How far the defender slides. Pushes them out of range; resets spacing |
| `level` | `mid`, `low` or `overhead` | How it must be blocked. mid: either block. low: only crouch block. overhead: only standing block |
| `priority` | 1 to 3 | Breaks ties when both hits land on the same frame. Higher wins; equal = both take damage (a trade) |
| `lunge` (optional) | px per frame | Moves the fighter forward during startup and active frames. Lets a short move cover distance |
| `knockdown` (optional) | true / false | On hit, the defender loses their next tick lying on the ground |
| `invincible` (optional) | `[from, to]` frames | No hurtbox during those frames, so it beats anything then. Use on at most one move, keep it short (about 6 frames), and give that move long recovery |
| `stance` (optional) | `standing` or `crouching` | Which hurtbox set the fighter uses while doing the move. Crouching moves duck high attacks |

### A good set of 4 moves

Give every fighter one move in each role, so the AI always has a real choice:

| Role | Startup | Reach | Damage | Notes |
| --- | --- | --- | --- | --- |
| Fast poke | 3 to 6 | short | 4 to 6 | Short recovery, so safe when blocked. Interrupts slower moves |
| Long poke | 12 to 18 | long | 10 to 14 | Controls spacing; long recovery, so it loses a tick when blocked |
| Low | 9 to 14 | medium | 7 to 10 | `level: low`, often crouching and `knockdown: true` |
| Big move | 6 to 22 | varies | 10 to 16 | An overhead, an anti-air uppercut, an invincible reversal or a charging lunge. Priority 3, long recovery |

Rule of thumb: faster and shorter means safer and weaker; slower and longer means stronger and riskier. The risk of a slow move is being hit first during its startup; the risk of a long-recovery move is being blocked. A move that simply misses is not punished by its recovery.

## 3. Frames to draw (27 per fighter + a portrait)

Limited animation: a few strong key poses per action, no in-betweens. The engine adds the motion (sliding, jump arc, flipping sides, hit flash).

| # | Frame name | Pose |
| --- | --- | --- |
| 1 | `idle_1` | Fighting stance |
| 2 | `idle_2` | Same stance, slight breath |
| 3 | `walk_1` | Step, front foot out |
| 4 | `walk_2` | Passing step |
| 5 | `walk_3` | Step, back foot out |
| 6 | `walk_4` | Passing step, other side |
| 7 | `jump_rise` | Tucked, rising |
| 8 | `jump_fall` | Extending to land |
| 9 | `crouch` | Low crouch, not guarding |
| 10 | `block` | Standing guard |
| 11 | `crouch_block` | Crouching guard |
| 12 | `hit` | Recoiling, shocked |
| 13 | `knockdown_fall` | Knocked off feet |
| 14 | `knockdown_ground` | Lying on the floor, dazed |
| 15 | `victory` | Win pose |
| 16 to 27 | `moveN_windup`, `moveN_strike`, `moveN_recover` for N = 1 to 4 | Wind-up (pulled back), strike (fully extended over the hitbox), recover (returning to stance). The engine shows the strike pose on exactly the frames the hitbox is live |

Plus `portrait.png`, 768 x 768, head and shoulders, painted, cream background (#F3E9D2), separate from the sheet.

A crouching move (`stance: 'crouching'`) is drawn low in all three of its poses.

## 4. Size, ground reference and format (must match the engine)

- **Draw facing right.** The engine flips the fighter on the right side.
- **Fixed cell: 800 x 520 px per frame, drawn at 2x.** The engine shows it at `scale: 0.5`, so a cell covers 400 x 260 world units. The screen is 1280 x 720.
- **One ground point for every frame: cell pixel (400, 468).** x = 400 is the body's center line; y = 468 is the floor line. This is `anchor: { x: 0.5, y: 0.9 }` in the fighter file. Grounded poses put their feet on y = 468. The 52 px under the line is spare room for tails, knockdown poses and shadows of motion; nothing has to touch the bottom edge.
- **Airborne and floating poses use the same ground point.** Jump height is added by the engine, so jump frames are drawn as if standing on the line (tucked legs may lift off it). A creature that floats is drawn hovering above the line in every frame, by the same amount as its hurtbox `hover`.
- A world point (x forward, y up from the floor) sits at cell pixel `(400 + 2x, 468 - 2y)`. Use this to check that:
  - the standing pose fills the standing hurtboxes;
  - crouch poses fill the crouching boxes and are shorter, never rescaled;
  - every `moveN_strike` pose visibly covers that move's hitbox.
- Maximum reach that fits the cell is 200 world units forward; maximum height is 234.
- A pose that can't share the ground point (a knockdown that should lie further back) gets a nudge in the fighter file: `offsets: { knockdown: { x: -30, y: 0 } }`, in world units.
- Transparent PNG, no ground shadow. Effects are separate frames (section 5), never painted into a pose.
- If you trim empty space when packing, keep `sourceSize` and `spriteSourceSize` in the JSON so the ground point stays put.
- In the game, the Hitboxes toggle (H) draws the floor line, each fighter's ground point, hurtboxes and hitboxes over the art.

## 5. Animations, move timing and effects

### Everything except moves

The engine shows frame `floor(actionFrame / 60 x N)` of an animation, where N is its number of frames. So an animation is spread evenly over the 1-second tick; it doesn't loop or use a frame rate. Use N = 12 for multi-pose animations (each slot = 5 sim frames) and repeat poses to time them.

| Animation | N | Frames in order |
| --- | --- | --- |
| `idle` | 12 | idle_1 x3, idle_2 x3, idle_1 x3, idle_2 x3 |
| `walkForward` | 12 | walk_1, walk_2, walk_3, walk_4, repeated 3 times |
| `walkBack` | 12 | walk_4, walk_3, walk_2, walk_1, repeated 3 times |
| `jump` | 12 | jump_rise x4, jump_fall x4, crouch, idle_1 x3 |
| `jumpForward` | 12 | same as jump |
| `crouch` | 1 | crouch |
| `block` | 1 | block |
| `crouchBlock` | 1 | crouch_block |
| `hitstun` | 1 | hit |
| `blockstun` | 1 | block |
| `stagger` | 1 | hit |
| `knockdown` | 12 | knockdown_fall x2, knockdown_ground x7, crouch x2, idle_1 |
| `ko` | 1 | knockdown_ground |
| `victory` | 1 | victory |

### Moves: timed by the move's own frame data

Moves don't use the 12-slot timeline. Each move has three animations in the sheet, and the engine picks between them from the simulation itself:

| Animation | Shows during | Frames |
| --- | --- | --- |
| `moveN_windup` | the startup frames | 1 or more |
| `moveN_strike` | **exactly the frames the hitbox is live**, however few | 1 or more |
| `moveN_recover` | the recovery frames | 1 or more |

After the move ends, `idle` shows for the rest of the tick. With one frame each (the 27-pose set) a 3-frame jab shows its strike pose for exactly those 3 frames. Extra frames in any of the three are spread evenly over that phase, so more poses can be added later without touching timing. Changing a move's numbers in the fighter file retimes its art automatically.

### Effect art (optional, per move)

Flames, a shadow burst, a shockwave: an animation drawn with the move's hitbox.

- Draw each effect frame in its own 800 x 520 cell, facing right, **centered on the cell (400, 260)**. The engine puts that center on the middle of the move's hitbox and flips it with the fighter.
- Name the animation `moveN_fx` in the sheet, 1 to 6 frames. It plays once over the frames it is shown.
- In the fighter file: `effects: { move2: { animation: "move2_fx" } }`. Options: `during: "startup+active"` (builds up before the hit; default is active frames only), `linger: 10` (stays 10 more frames, fading), `offset: { x, y }`, `scale`, `behind: true` (drawn behind the fighter).
- It is only a picture. The single hitbox rectangle still decides what gets hit, so size the hitbox to the flame, not the other way round. The effect moves with the fighter; **nothing travels across the stage on its own** (no projectiles in this build). Hit sparks and block rings are drawn by the engine.

Example sheet JSON (PixiJS / TexturePacker "hash" format):

```json
{
  "frames": {
    "idle_1.png": { "frame": {"x":0,"y":0,"w":800,"h":520}, "rotated": false, "trimmed": false,
                    "spriteSourceSize": {"x":0,"y":0,"w":800,"h":520}, "sourceSize": {"w":800,"h":520} }
  },
  "animations": {
    "idle": ["idle_1.png","idle_1.png","idle_1.png","idle_2.png","idle_2.png","idle_2.png","idle_1.png","idle_1.png","idle_1.png","idle_2.png","idle_2.png","idle_2.png"],
    "move1_windup": ["move1_windup.png"],
    "move1_strike": ["move1_strike.png"],
    "move1_recover": ["move1_recover.png"],
    "move1_fx": ["move1_fx_1.png","move1_fx_2.png","move1_fx_3.png"]
  },
  "meta": { "image": "<id>.png", "format": "RGBA8888", "size": {"w":4096,"h":4096}, "scale": "1" }
}
```

Keep the sheet image at or under 4096 x 4096 (5 columns x 7 rows = 4000 x 3640 holds 35 cells: the 27 poses plus 8 effect frames).

## 6. Files and hookup

```
apps/web/static/fighters/<id>/<id>.json        spritesheet data
apps/web/static/fighters/<id>/<id>.png         packed sheet
apps/web/static/fighters/<id>/portrait.png
apps/web/static/fighters/<id>/frames/*.png     the 27 loose frames
packages/game/src/fighters/<id>.ts             fighter data, registered in fighters/index.ts
```

In the fighter file, `sprites` points at the sheet:

```ts
sprites: {
  sheet: "/fighters/<id>/<id>.json",
  animations: {
    idle: "idle", walkForward: "walkForward", walkBack: "walkBack", jump: "jump", jumpForward: "jumpForward",
    crouch: "crouch", block: "block", crouchBlock: "crouchBlock",
    hitstun: "hitstun", blockstun: "blockstun", knockdown: "knockdown", stagger: "stagger", ko: "ko", victory: "victory",
  },
  moves: {
    move1: { windup: "move1_windup", strike: "move1_strike", recover: "move1_recover" },
    move2: { windup: "move2_windup", strike: "move2_strike", recover: "move2_recover" },
    move3: { windup: "move3_windup", strike: "move3_strike", recover: "move3_recover" },
    move4: { windup: "move4_windup", strike: "move4_strike", recover: "move4_recover" },
  },
  effects: { move2: { animation: "move2_fx", linger: 8 } },   // optional
  anchor: { x: 0.5, y: 0.9 },   // the ground point (400, 468)
  scale: 0.5,
  offsets: {},                   // optional per-pose nudges
  color: 0xRRGGBB,  // placeholder body color, used if art is missing
  accent: 0xRRGGBB,
},
```

Any missing animation falls back to a placeholder body, so art can be added one action at a time.

## 7. Art style

Read `/mnt/project-files/clanker-coliseum/style-inspo/STYLE-NOTES.md` and the images in that folder.

- **Sprites:** like `12-midcentury-kitchen-flat.png`: 1950s mid-century advertising illustration, clean ink lines, flat colors with light soft shading, bold dark outline, big expressive faces and theatrical poses.
- **Portrait:** painted gouache magazine-ad look (refs 02, 03).
- Palette: hero red #D7322A, warm orange #E8742C, bottle green #2F6B3F, faded sky blue #8FB3C9, mustard #E2B33C, ink #2B2522. One signature color per fighter.
- No text or logos on the fighter.

## 8. Making the frames with AI (recommended)

1. Generate a **reference sheet** (front view and right-facing side view) in the sprite style. Pick the best; everything derives from it.
2. Make each of the 27 poses with an **image-edit model using the reference sheet as input** ("same character, same colors and proportions, side view facing right, [pose], plain background, full body"). Fresh text-to-image per pose drifts and the character stops matching.
3. Remove backgrounds, place each pose on the 800 x 520 cell (feet on the floor line y = 468, center at x = 400, same scale as idle_1).
4. Overlay the hurtboxes and each strike's hitbox and adjust the pose to fit.
5. Pack the sheet, write the `animations` block, make the portrait.

## 9. Checklist

- [ ] Data: name, blurb, 1 to 2 types, stats in range, 1 passive, 4 moves covering the 4 roles
- [ ] Every move: startup + active + recovery is 60 or less; at most one move with invincibility
- [ ] Hurtbox layout chosen for the creature's shape before drawing attacks
- [ ] 27 frames, exact names, 800 x 520, transparent, facing right, feet on the floor line y = 468, center at x = 400
- [ ] Poses fill the hurtboxes; every strike pose covers its hitbox
- [ ] Sheet JSON has the 14 action animations plus `moveN_windup` / `moveN_strike` / `moveN_recover` for each move (and `moveN_fx` where used)
- [ ] Same-looking character in every frame
- [ ] In game, art shows for every action including hit, block, knockdown and KO

## 10. Blank template to fill in

```ts
import type { FighterDef } from "../sim/types.js";
import { standardHurtboxes } from "./hurtboxes.js"; // or quadrupedHurtboxes / roundHurtboxes

const ____: FighterDef = {
  id: '____',
  name: '____',
  blurb: '____',                       // one line: look + fighting style
  types: ['____'],                     // 1 or 2 of the 18 types
  passive: {
    name: '____',
    description: '____',               // plain language, the AI reads this
    effect: { kind: '____' /* rally | steadfast | resist, plus its fields */ },
  },
  stats: { maxHp: ___, walkSpeed: ___, jumpVelocity: ___, gravity: ___, pushWidth: ___, defense: ___ },
  hurtboxes: standardHurtboxes(___ /* height scale */, ___ /* width */), // or quadrupedHurtboxes(length, height, headRise) / roundHurtboxes(diameter, hover)
  moves: {
    move1: { // fast poke
      name: '____', type: '____', startup: ___, active: ___, recovery: ___,
      hitbox: { x: ___, y: ___, w: ___, h: ___ }, damage: ___, hitstun: ___, blockstun: ___,
      knockback: ___, level: 'mid', priority: 1,
    },
    move2: { /* long poke: same fields */ },
    move3: { /* low: same fields, level: 'low', often stance: 'crouching', knockdown: true */ },
    move4: { /* big move: same fields, priority: 3, optional lunge / invincible / overhead */ },
  },
  sprites: { sheet: "/fighters/____/____.json", animations: { /* section 6 */ }, moves: { /* section 6 */ }, anchor: { x: 0.5, y: 0.9 }, scale: 0.5, color: 0x______, accent: 0x______ },
};

export default ____;
```
