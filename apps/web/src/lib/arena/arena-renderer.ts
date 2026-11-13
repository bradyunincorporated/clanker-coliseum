// PixiJS renderer for a server-run match. It never simulates: it plays back the 60 frames
// of each tick the arena service sends and fires that tick's events at their frame. The canvas
// covers the whole frame: the fighters and effects sit in the 16:9 stage box, and the
// scoreboard hangs from the top edge. Its art is painted (see /static/hud); only the text,
// the health fill and the debug boxes are drawn here.

import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  TextStyle,
  Texture,
  TilingSprite,
} from "pixi.js";
import {
  getFighter,
  type FighterDef,
  type FighterFrame,
  type FightEvent,
  type FrameSnapshot,
  type MatchState,
  type Rect,
} from "@clanker/game";
import type {
  ArenaMessage,
  MatchSummary,
  ModelBrain,
  PickInfo,
  TickMessage,
} from "@clanker/arena-service/protocol";
import { BRAIN_MODELS } from "@clanker/arena-service/protocol";
import { FighterView } from "./fighter-view.js";
import { stageOrigin, toScreen, VIEW_H, VIEW_W } from "./coords.js";
import { HERO_RED, INK, MUSTARD, NIGHT, PAPER } from "./palette.js";
import { TickPlayback } from "./playback.js";

const DISPLAY = "Lilita One";
const BODY = "Fredoka Variable";
const FONTS = [`40px '${DISPLAY}'`, `600 14px '${BODY}'`];

const ART = {
  clock: "/hud/clock.webp",
  bar: "/hud/bar.webp",
  wash: "/hud/wash.webp",
  ribbon: "/hud/ribbon.webp",
  fight: "/hud/fight.webp",
  ko: "/hud/ko.webp",
  time: "/hud/time.webp",
  draw: "/hud/draw.webp",
  clang: "/hud/hit-clang.webp",
  pow: "/hud/hit-pow.webp",
  wham: "/hud/hit-wham.webp",
  bop: "/hud/hit-bop.webp",
  zap: "/hud/hit-zap.webp",
  sock: "/hud/hit-sock.webp",
} as const;
type ArtKey = keyof typeof ART;
const HIT_ART: ArtKey[] = ["pow", "wham", "bop", "zap", "sock"];

// The scoreboard, in stage-box x and frame-top y.
const BAR_W = 468;
const BAR_H = 26;
const BAR_Y = 26;
const BAR_GAP = 152;
// The painted bar frame: its window, and the columns that may stretch (texture pixels).
const FRAME = { w: 1400, h: 392, winX0: 103, winX1: 1292, winY0: 102, winY1: 288 };
const FRAME_CUTS = [0, 320, 384, 1016, 1080, FRAME.w];

export interface ArenaStatus {
  over: boolean;
  winner: 0 | 1 | "draw" | null;
  waiting: boolean;
}

interface Pop {
  node: Container;
  age: number;
  life: number;
  size: number;
  drift: number;
}

export class ArenaRenderer {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly debug = new Graphics();
  private readonly fx = new Container();
  private readonly hud = new Container();
  private readonly center = new Container();
  private readonly fills = new Graphics();
  private art!: Record<ArtKey, Texture>;
  private fighters: [FighterView, FighterView] | null = null;
  private defs: [FighterDef, FighterDef] | null = null;
  private playback: TickPlayback | null = null;
  private opening: MatchState | null = null;
  private fired = new Set<FightEvent>();
  private pops: Pop[] = [];
  private lag: [number, number] = [1, 1];
  private ui!: {
    names: [Text, Text];
    info: [Text, Text];
    picks: [Text, Text];
    moves: [Text, Text];
    washes: [TilingSprite, TilingSprite];
    masks: [Graphics, Graphics];
    clock: Sprite;
    timer: Text;
    banner: Sprite;
    ribbon: Container;
    ribbonText: Text;
    ticker: Text;
  };
  private bannerAge = 0;
  private bannerLife = 0;
  private tickerAge = 0;
  private shake = 0;
  private clockT = 0;
  private frameH = VIEW_H;
  private ready = false;
  private destroyed = false;
  private resizer: ResizeObserver | null = null;
  showBoxes = false;
  onStatus: ((s: ArenaStatus) => void) | null = null;
  /** A hit landed, 0..1 by how hard: the set around the canvas can rattle. */
  onImpact: ((power: number) => void) | null = null;

  async init(host: HTMLElement) {
    const [, art] = await Promise.all([
      Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => []))),
      Assets.load<Texture>(Object.values(ART)),
    ]);
    this.art = Object.fromEntries(
      (Object.keys(ART) as ArtKey[]).map((k) => [k, art[ART[k]]]),
    ) as Record<ArtKey, Texture>;
    await this.app.init({
      width: host.clientWidth || VIEW_W,
      height: host.clientHeight || VIEW_H,
      // The diner diorama behind the canvas is the stage.
      backgroundAlpha: 0,
      antialias: true,
      resolution: this.sharpness(host),
      autoDensity: true,
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    host.appendChild(this.app.canvas);
    this.world.addChild(this.debug);
    this.app.stage.addChild(this.world, this.fx, this.hud, this.center);
    this.buildHud();
    this.layout(host);
    this.resizer = new ResizeObserver(() => this.layout(host));
    this.resizer.observe(host);
    this.app.ticker.add((t) => this.frame(t.deltaMS));
    this.ready = true;
  }

  receive(message: ArenaMessage) {
    if (message.type === "hello")
      this.start(message.match, message.state, message.events, message.last);
    else if (message.type === "tick") this.playback?.push(message);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resizer?.disconnect();
    if (this.ready) this.app.destroy(true, { children: true });
  }

  /** The frame is scaled up to fill big windows, so render at the size it is shown, 2x at least. */
  private sharpness(host: HTMLElement): number {
    const shown = host.clientWidth ? host.getBoundingClientRect().width / host.clientWidth : 1;
    return Math.min(3, Math.max(2, Math.ceil(shown * (window.devicePixelRatio || 1) * 2) / 2));
  }

  /** The canvas is the whole frame; the stage box and the scoreboard find their places in it. */
  private layout(host: HTMLElement) {
    const w = host.clientWidth || VIEW_W;
    const h = host.clientHeight || VIEW_H;
    if (!this.ready || w !== this.app.screen.width || h !== this.app.screen.height)
      this.app.renderer.resize(w, h, this.sharpness(host));
    const o = stageOrigin(w, h);
    this.frameH = h;
    for (const c of [this.world, this.fx, this.center]) c.position.set(o.x, o.y);
    this.hud.position.set(o.x, 0);
    this.ui.ticker.position.set(VIEW_W / 2, h - 22);
  }

  private start(
    match: MatchSummary,
    state: MatchState,
    events: FightEvent[],
    last: TickMessage | null,
  ) {
    const defs: [FighterDef, FighterDef] = [
      getFighter(match.fighters[0]),
      getFighter(match.fighters[1]),
    ];
    this.defs = defs;
    this.opening = state;
    this.playback = new TickPlayback(match.tickMs);
    this.fired = new Set(events);
    if (last) {
      // Joined mid-match: show the newest tick instead of replaying the past.
      for (const e of last.result.events) this.fired.delete(e);
      this.playback.push(last);
    }
    for (const p of this.pops) p.node.destroy({ children: true });
    this.pops = [];
    for (const f of this.fighters ?? []) f.destroy();
    this.fighters = [new FighterView(defs[0]), new FighterView(defs[1])];
    this.world.removeChildren();
    this.world.addChild(this.fighters[0], this.fighters[1], this.debug);
    for (const i of [0, 1] as const) {
      this.ui.names[i].text = defs[i].name.toUpperCase();
      this.ui.info[i].text = `${defs[i].types.join(" / ")}  ·  ${defs[i].passive.name}`;
      this.lag[i] = state.fighters[i].hp / defs[i].stats.maxHp;
    }
    this.ui.ribbon.visible = false;
    if (!state.over) this.banner("fight", match.introMs);
  }

  private buildHud() {
    const ink = { color: INK, width: 5, join: "round" as const };
    const display = (size: number, fill = PAPER, stroke = ink) =>
      new TextStyle({ fontFamily: DISPLAY, fontSize: size, fill, stroke, padding: 8 });
    const body = (size: number, fill = PAPER) =>
      new TextStyle({
        fontFamily: BODY,
        fontWeight: "600",
        fontSize: size,
        fill,
        stroke: { color: INK, width: 3.5, join: "round" },
        padding: 4,
      });
    const pair = <T>(make: (i: 0 | 1) => T): [T, T] => [make(0), make(1)];
    const outer = (i: 0 | 1) =>
      i === 0 ? VIEW_W / 2 - BAR_GAP / 2 - BAR_W : VIEW_W / 2 + BAR_GAP / 2;
    const place = (t: Text, i: 0 | 1, inner: boolean, y: number) => {
      const right = (i === 1) !== inner;
      t.anchor.set(right ? 1 : 0, 0);
      t.position.set(outer(i) + (right ? BAR_W : 0), y);
      return t;
    };

    // Health: a dark window, a watercolour fill that drains toward the outside, a painted frame.
    const s = BAR_H / (FRAME.winY1 - FRAME.winY0);
    const tracks = new Graphics();
    const washes = pair(() => {
      const wash = new TilingSprite({ texture: this.art.wash, width: BAR_W, height: BAR_H });
      wash.tileScale.set(0.22);
      return wash;
    });
    const masks = pair(() => new Graphics());
    const frames = new Container();
    for (const i of [0, 1] as const) {
      const x = outer(i);
      tracks.roundRect(x - 2, BAR_Y - 2, BAR_W + 4, BAR_H + 4, 12).fill(NIGHT);
      washes[i].position.set(x, BAR_Y);
      washes[i].mask = masks[i];
      // Five columns of the painted frame: ends and centre keep their shape, the plain runs stretch.
      const fixed = (FRAME_CUTS[1] + FRAME_CUTS[3] - FRAME_CUTS[2] + FRAME.w - FRAME_CUTS[4]) * s;
      const total = BAR_W + (FRAME.winX0 + FRAME.w - FRAME.winX1) * s;
      const stretch = (total - fixed) / 2;
      let px = x - FRAME.winX0 * s;
      for (let c = 0; c < 5; c++) {
        const tw = FRAME_CUTS[c + 1] - FRAME_CUTS[c];
        const piece = new Sprite(
          new Texture({
            source: this.art.bar.source,
            frame: new Rectangle(FRAME_CUTS[c], 0, tw, FRAME.h),
          }),
        );
        const w = c === 1 || c === 3 ? stretch : tw * s;
        piece.position.set(px - 0.5, BAR_Y - FRAME.winY0 * s);
        piece.width = w + 1;
        piece.height = FRAME.h * s;
        frames.addChild(piece);
        px += w;
      }
    }

    const names = pair((i) => place(new Text({ text: "", style: display(25) }), i, false, 60));
    const picks = pair((i) => place(new Text({ text: "", style: body(11.5) }), i, true, 68));
    const info = pair((i) =>
      place(new Text({ text: "", style: body(12.5, 0xfbe7a8) }), i, false, 90),
    );
    const moves = pair((i) =>
      place(
        new Text({ text: "", style: display(19, MUSTARD, { ...ink, width: 4.5 }) }),
        i,
        true,
        86,
      ),
    );
    for (const t of [...picks, ...moves]) t.alpha = 0;
    for (const t of picks) t.alpha = 0.9;

    const clock = new Sprite(this.art.clock);
    clock.anchor.set(0.5, 0.62);
    clock.scale.set(128 / this.art.clock.height);
    clock.position.set(VIEW_W / 2, 74);
    const timer = new Text({
      text: "40",
      style: display(40, INK, { color: PAPER, width: 0, join: "round" }),
    });
    timer.anchor.set(0.5);
    timer.position.set(VIEW_W / 2, 72);

    const banner = new Sprite(this.art.fight);
    banner.anchor.set(0.5);
    banner.position.set(VIEW_W / 2, 250);
    banner.visible = false;
    const ribbon = new Container();
    const band = new Sprite(this.art.ribbon);
    band.anchor.set(0.5);
    band.scale.set(470 / this.art.ribbon.width);
    const ribbonText = new Text({ text: "", style: display(30) });
    ribbonText.anchor.set(0.5);
    ribbonText.position.set(0, -6);
    ribbon.addChild(band, ribbonText);
    ribbon.position.set(VIEW_W / 2, 398);
    ribbon.visible = false;

    const ticker = new Text({ text: "", style: body(14) });
    ticker.anchor.set(0.5, 1);
    ticker.alpha = 0;

    this.hud.addChild(
      tracks,
      this.fills,
      ...washes,
      ...masks,
      frames,
      clock,
      timer,
      ...names,
      ...info,
      ...picks,
      ...moves,
      ticker,
    );
    this.center.addChild(banner, ribbon);
    this.ui = {
      names,
      info,
      picks,
      moves,
      washes,
      masks,
      clock,
      timer,
      banner,
      ribbon,
      ribbonText,
      ticker,
    };
  }

  private banner(key: "fight" | "ko" | "time" | "draw", ms: number) {
    const b = this.ui.banner;
    b.texture = this.art[key];
    b.visible = true;
    this.bannerAge = 0;
    this.bannerLife = ms;
  }

  private frame(dtMs: number) {
    const playback = this.playback;
    const defs = this.defs;
    if (!playback || !defs || !this.fighters || !this.opening) return;

    const started = playback.advance(dtMs);
    if (started) this.onTickStart(started, defs);
    const tick = playback.current;
    const fi = playback.frameIndex;
    const snap = tick?.result.frames[fi] ?? openingSnapshot(this.opening, defs);

    for (const i of [0, 1] as const) this.fighters[i].update(snap.fighters[i], dtMs);
    if (tick) {
      for (const e of tick.result.events) {
        if (e.frame <= fi && !this.fired.has(e)) {
          this.fired.add(e);
          this.onEvent(e, snap);
        }
      }
    }
    this.drawDebug(snap);
    this.drawHud(snap, tick, defs, dtMs);
    this.animate(dtMs);

    const state = tick?.result.state ?? this.opening;
    this.onStatus?.({
      over: state.over && fi >= 59,
      winner: state.winner,
      waiting: playback.waiting && !state.over,
    });
  }

  private onTickStart(tick: TickMessage, defs: [FighterDef, FighterDef]) {
    for (const i of [0, 1] as const) {
      const action = tick.result.actions[i];
      const move =
        action in defs[i].moves ? defs[i].moves[action as keyof FighterDef["moves"]] : null;
      const label = this.ui.moves[i];
      if (!move) continue;
      label.text = move.name.toUpperCase();
      label.alpha = 1;
      label.scale.set(1.25);
    }
  }

  private onEvent(e: FightEvent, snap: FrameSnapshot) {
    this.ui.ticker.text = e.text;
    this.tickerAge = 0;
    if (e.type === "hit" || e.type === "block") {
      const d = snap.fighters[1 - (e.side ?? 0)];
      // A small word that pops over the defender's head, so the fighters stay in view.
      const top = d.hurtboxes.reduce((y, b) => Math.max(y, b.y + b.h), 0) || 150;
      const p = toScreen(d.x, top + 26);
      const hit = e.type === "hit";
      const big = hit && (e.damage ?? 0) >= 10;
      const key = hit ? HIT_ART[(e.tick + e.frame) % HIT_ART.length] : "clang";
      const spark = new Sprite(this.art[key]);
      spark.anchor.set(0.5);
      spark.position.set(p.x, p.y);
      spark.rotation = (((e.tick * 7 + e.frame) % 9) - 4) * 0.04;
      this.pop(spark, (hit ? (big ? 58 : 46) : 38) / this.art[key].width, hit ? 520 : 380, 0);
      if (hit) {
        const power = Math.min(1, 0.35 + (e.damage ?? 0) / 20);
        this.shake = Math.min(16, 4 + (e.damage ?? 0) * 0.7);
        this.onImpact?.(power);
        if ((e.effectiveness ?? 1) > 1) this.tagline("Super effective!", p.x, p.y - 44, MUSTARD);
        else if ((e.effectiveness ?? 1) < 1)
          this.tagline("Not very effective...", p.x, p.y - 44, 0xc9d3ea);
      }
    }
    if (e.type === "trade") this.tagline("Trade!", VIEW_W / 2, 232, PAPER);
    if (e.type === "knockdown") this.tagline("Down they go!", VIEW_W / 2, 232, PAPER);
    if (e.type === "punish") this.tagline("Wide open!", VIEW_W / 2, 232, PAPER);
    if (e.type === "ko" || e.type === "timeout") {
      const defs = this.defs;
      const w = e.type === "ko" ? e.side : this.playback?.current?.result.state.winner;
      const name = defs && (w === 0 || w === 1) ? defs[w].name : null;
      this.banner(e.type === "ko" ? "ko" : name ? "time" : "draw", Infinity);
      this.ui.ribbonText.text = name ? `${name.toUpperCase()} WINS!` : "NOBODY WINS";
      this.ui.ribbon.visible = true;
      this.ui.ribbon.alpha = 0;
      this.onImpact?.(1);
    }
  }

  /** A paper cut-out that pops up, hangs for a moment and fades. */
  private pop(node: Container, size: number, life: number, drift: number) {
    node.scale.set(size * 0.4);
    this.fx.addChild(node);
    this.pops.push({ node, age: 0, life, size, drift });
  }

  private tagline(text: string, x: number, y: number, fill: number) {
    const t = new Text({
      text,
      style: new TextStyle({
        fontFamily: DISPLAY,
        fontSize: 32,
        fill,
        stroke: { color: INK, width: 7, join: "round" },
        padding: 8,
      }),
    });
    t.anchor.set(0.5);
    t.rotation = -0.05;
    t.position.set(Math.min(VIEW_W - 170, Math.max(170, x)), Math.max(190, y));
    this.pop(t, 1, 1300, 26);
  }

  private animate(dtMs: number) {
    this.pops = this.pops.filter((p) => {
      p.age += dtMs;
      const t = p.age / p.life;
      if (t >= 1) {
        p.node.destroy({ children: true });
        return false;
      }
      p.node.scale.set(p.size * springIn(Math.min(1, p.age / 170)));
      p.node.alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      p.node.y -= (p.drift * dtMs) / p.life;
      return true;
    });

    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dtMs / 16);
      this.world.pivot.set((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    } else this.world.pivot.set(0, 0);

    // The banner lands with a bounce, then leaves unless it is the final word.
    const b = this.ui.banner;
    if (b.visible) {
      this.bannerAge += dtMs;
      // The opening call is big; the final word stays up, so it keeps clear of the fighters.
      const size = (Number.isFinite(this.bannerLife) ? 560 : 400) / b.texture.width;
      b.scale.set(size * springIn(Math.min(1, this.bannerAge / 260)));
      b.rotation = Math.sin(this.bannerAge / 420) * 0.018 - 0.03;
      const left = this.bannerLife - this.bannerAge;
      b.alpha = left > 220 ? 1 : Math.max(0, left / 220);
      if (left <= 0) b.visible = false;
      const r = this.ui.ribbon;
      if (r.visible) {
        r.alpha = Math.min(1, Math.max(0, (this.bannerAge - 380) / 240));
        r.scale.set(0.9 + 0.1 * springIn(Math.min(1, Math.max(0, (this.bannerAge - 380) / 260))));
      }
    }

    for (const m of this.ui.moves) {
      if (m.alpha <= 0) continue;
      m.alpha = Math.max(0, m.alpha - dtMs / 1500);
      m.scale.set(Math.max(1, m.scale.x - dtMs / 400));
    }
    this.tickerAge += dtMs;
    this.ui.ticker.alpha =
      this.tickerAge < 2600 ? 0.92 : Math.max(0, 0.92 - (this.tickerAge - 2600) / 500);
  }

  private drawDebug(snap: FrameSnapshot) {
    const g = this.debug.clear();
    if (!this.showBoxes) return;
    // Floor line and each fighter's ground point: what sprite anchors must line up with.
    const floor = toScreen(0, 0).y;
    g.moveTo(-2000, floor)
      .lineTo(VIEW_W + 2000, floor)
      .stroke({ color: PAPER, width: 1, alpha: 0.7 });
    for (const f of snap.fighters) {
      const o = toScreen(f.x, f.y);
      g.moveTo(o.x - 8, o.y)
        .lineTo(o.x + 8, o.y)
        .moveTo(o.x, o.y - 8)
        .lineTo(o.x, o.y + 8);
      g.stroke({ color: PAPER, width: 2 });
    }
    for (const f of snap.fighters) {
      for (const r of f.hurtboxes) rectPath(g, r).stroke({ color: 0x7dffb0, width: 2, alpha: 0.9 });
      if (f.hitbox)
        rectPath(g, f.hitbox)
          .fill({ color: HERO_RED, alpha: 0.3 })
          .stroke({ color: HERO_RED, width: 2 });
    }
  }

  private drawHud(
    snap: FrameSnapshot,
    tick: TickMessage | null,
    defs: [FighterDef, FighterDef],
    dtMs: number,
  ) {
    const g = this.fills.clear();
    for (const i of [0, 1] as const) {
      const pct = Math.max(0, snap.fighters[i].hp / defs[i].stats.maxHp);
      // Fresh damage hangs for a moment as a pale strip before it drains away.
      this.lag[i] = pct > this.lag[i] ? pct : Math.max(pct, this.lag[i] - dtMs / 1400);
      const x = this.ui.washes[i].x;
      const at = (p: number) => (i === 0 ? x + BAR_W * (1 - p) : x);
      g.roundRect(at(this.lag[i]), BAR_Y, BAR_W * this.lag[i], BAR_H, 10).fill(0xfbe7a8);
      this.ui.masks[i]
        .clear()
        .roundRect(at(pct), BAR_Y, BAR_W * pct, BAR_H, 10)
        .fill(0xffffff);
      // Nearly out: the fill throbs.
      this.ui.washes[i].tint =
        pct <= 0.35 ? (Math.sin(this.clockT / 110) > 0 ? 0xffffff : 0xffc9a8) : 0xffffff;
      if (tick) this.ui.picks[i].text = pickLabel(tick.picks[i]);
    }
    const ticksLeft = Math.max(
      0,
      (tick?.result.state.config.roundTicks ?? 40) - (tick ? tick.result.state.tick - 1 : 0),
    );
    this.ui.timer.text = String(Math.min(ticksLeft, 99));
    // The alarm clock gets the jitters in the last five seconds.
    this.clockT += dtMs;
    const over = tick?.result.state.over ?? false;
    const rattle = !over && ticksLeft <= 5 ? Math.sin(this.clockT / 28) * 0.07 : 0;
    this.ui.clock.rotation = rattle;
    this.ui.timer.rotation = rattle;
    this.ui.ticker.y = this.frameH - 22;
  }
}

/** Overshoots a little on the way to 1, like card springing upright. */
function springIn(t: number): number {
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

/** One HUD line per fighter: which brain picked, or which model failed and what happened instead. */
function pickLabel(p: PickInfo): string {
  const model = (id: ModelBrain) => {
    const m = BRAIN_MODELS[id];
    return (id === "gemini" ? m.name : `${m.company} ${m.name}`).toUpperCase();
  };
  switch (p.source) {
    case "gemini":
    case "jev":
    case "clef":
      return `${model(p.source)}${p.confidence != null ? ` · ${Math.round(p.confidence * 100)}% SURE` : ""}${p.latencyMs != null ? ` · ${p.latencyMs} MS` : ""}`;
    case "fallback":
      return `${p.provider ? model(p.provider) : "MODEL"} UNAVAILABLE · HEURISTIC PICKED`;
    case "late":
      return `${p.provider ? `${model(p.provider)} ` : ""}DECISION LATE · IDLED`;
    case "forced":
      return "NO PICK THIS TICK";
    default:
      return `${p.source.toUpperCase()} BRAIN`;
  }
}

function rectPath(g: Graphics, r: Rect): Graphics {
  const tl = toScreen(r.x, r.y + r.h);
  return g.rect(tl.x, tl.y, r.w, r.h);
}

function openingSnapshot(state: MatchState, defs: [FighterDef, FighterDef]): FrameSnapshot {
  const one = (i: 0 | 1): FighterFrame => {
    const f = state.fighters[i];
    return {
      x: f.x,
      y: f.y,
      facing: f.facing,
      hp: f.hp,
      action: "idle",
      actionFrame: 0,
      stance: "standing",
      status: f.hp <= 0 ? "ko" : "normal",
      phase: "none",
      hitbox: null,
      hurtboxes: defs[i].hurtboxes.standing.map((b) => ({
        x: f.facing === 1 ? f.x + b.x : f.x - b.x - b.w,
        y: f.y + b.y,
        w: b.w,
        h: b.h,
      })),
    };
  };
  return { frame: 0, fighters: [one(0), one(1)] };
}
