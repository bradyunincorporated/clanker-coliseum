// PixiJS renderer for a server-run match. It never simulates: it plays back the 60 frames
// of each tick the arena service sends, fires that tick's events at their frame, and draws
// the HUD as printed ad copy (coupon-strip health bars, ribbon move names, script banners).

import { Application, Container, Graphics, Text, TextStyle } from "pixi.js";
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
  PickInfo,
  TickMessage,
} from "@clanker/arena-service/protocol";
import { DinerStage } from "./diner-stage.js";
import { FighterView } from "./fighter-view.js";
import { FLOOR_Y, toScreen, VIEW_H, VIEW_W } from "./coords.js";
import { HERO_RED, INK, MUSTARD, PANEL_BLUE, PAPER, PAPER_DEEP } from "./palette.js";
import { TickPlayback } from "./playback.js";

const FONTS = ["76px Yellowtail", "20px 'Alfa Slab One'", "italic 800 16px 'Archivo Variable'"];
const BAR_W = 470;
const HIT_WORDS = ["POW!", "WHAM!", "BOP!", "ZAP!", "SOCK!"];

export interface ArenaStatus {
  over: boolean;
  winner: 0 | 1 | "draw" | null;
  waiting: boolean;
}

export class ArenaRenderer {
  private readonly app = new Application();
  private readonly stage = new DinerStage();
  private readonly world = new Container();
  private readonly debug = new Graphics();
  private readonly fx = new Container();
  private readonly hud = new Container();
  private readonly bars = new Graphics();
  private fighters: [FighterView, FighterView] | null = null;
  private defs: [FighterDef, FighterDef] | null = null;
  private playback: TickPlayback | null = null;
  private opening: MatchState | null = null;
  private log: FightEvent[] = [];
  private fired = new Set<FightEvent>();
  private text!: {
    names: [Text, Text];
    info: [Text, Text];
    picks: [Text, Text];
    ribbons: [Container, Container];
    ribbonText: [Text, Text];
    timer: Text;
    banner: Text;
    bannerShadow: Text;
    sub: Text;
    log: Text;
  };
  private bannerUntil = 0;
  private shake = 0;
  private ready = false;
  private destroyed = false;
  showBoxes = false;
  onStatus: ((s: ArenaStatus) => void) | null = null;

  async init(host: HTMLElement) {
    await Promise.all(FONTS.map((f) => document.fonts.load(f).catch(() => [])));
    await this.app.init({
      width: VIEW_W,
      height: VIEW_H,
      background: PAPER,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
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
    this.app.stage.addChild(this.stage, this.world, this.fx, this.hud);
    this.buildHud();
    this.app.ticker.add((t) => this.frame(t.deltaMS));
    this.ready = true;
  }

  receive(message: ArenaMessage) {
    if (message.type === "hello")
      this.start(message.match, message.state, message.events, message.last);
    else this.playback?.push(message);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.ready) this.app.destroy(true, { children: true });
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
    this.log = [...events];
    this.fired = new Set(events);
    if (last) {
      // Joined mid-match: show the newest tick instead of replaying the past.
      this.log = this.log.filter((e) => !last.result.events.includes(e));
      this.playback.push(last);
    }
    this.fx.removeChildren();
    for (const f of this.fighters ?? []) f.destroy();
    this.fighters = [new FighterView(defs[0]), new FighterView(defs[1])];
    this.world.removeChildren();
    this.world.addChild(this.fighters[0], this.fighters[1], this.debug);
    for (const i of [0, 1] as const) {
      this.text.names[i].text = defs[i].name.toUpperCase();
      this.text.info[i].text =
        `${defs[i].types.join(" / ").toUpperCase()}  ·  ${defs[i].passive.name}`;
    }
    if (!state.over) this.banner("Fight!", "", match.introMs);
  }

  private buildHud() {
    const slab = (size: number, fill = INK) =>
      new TextStyle({ fontFamily: "Alfa Slab One", fontSize: size, fill });
    const callout = (size: number, fill = INK) =>
      new TextStyle({
        fontFamily: "Archivo Variable",
        fontStyle: "italic",
        fontWeight: "800",
        fontSize: size,
        fill,
        letterSpacing: 0.5,
      });
    const pair = <T>(make: (i: 0 | 1) => T): [T, T] => [make(0), make(1)];
    const edge = (i: 0 | 1) => (i === 0 ? 40 : VIEW_W - 40);
    const place = (t: Text, i: 0 | 1, y: number) => {
      t.anchor.set(i === 0 ? 0 : 1, 0);
      t.position.set(edge(i), y);
      return t;
    };

    const names = pair((i) => place(new Text({ text: "", style: slab(24) }), i, 14));
    const info = pair((i) => place(new Text({ text: "", style: callout(14) }), i, 84));
    const picks = pair((i) => place(new Text({ text: "", style: callout(13, 0x5b524b) }), i, 104));
    const ribbonText = pair(() => new Text({ text: "", style: callout(18, PAPER) }));
    const ribbons = pair((i) => {
      const c = new Container();
      c.position.set(i === 0 ? 40 : VIEW_W - 40, 146);
      c.addChild(new Graphics(), ribbonText[i]);
      ribbonText[i].anchor.set(i === 0 ? 0 : 1, 0.5);
      ribbonText[i].x = i === 0 ? 18 : -18;
      c.alpha = 0;
      return c;
    });

    const timerBadge = new Graphics()
      .circle(VIEW_W / 2, 52, 44)
      .fill(HERO_RED)
      .stroke({ color: INK, width: 4 })
      .circle(VIEW_W / 2, 52, 36)
      .stroke({ color: PAPER, width: 2 });
    const timer = new Text({ text: "40", style: slab(40, PAPER) });
    timer.anchor.set(0.5);
    timer.position.set(VIEW_W / 2, 54);

    const bannerStyle = (fill: number, stroke: number) =>
      new TextStyle({
        fontFamily: "Yellowtail",
        fontSize: 150,
        fill,
        stroke: { color: stroke, width: 10, join: "round" },
        padding: 30,
      });
    const bannerShadow = new Text({ text: "", style: bannerStyle(INK, INK) });
    const banner = new Text({ text: "", style: bannerStyle(HERO_RED, PAPER) });
    for (const [t, d] of [
      [bannerShadow, 8],
      [banner, 0],
    ] as const) {
      t.anchor.set(0.5);
      t.position.set(VIEW_W / 2 + d, 300 + d);
    }
    const sub = new Text({ text: "", style: callout(30, INK) });
    sub.anchor.set(0.5);
    sub.position.set(VIEW_W / 2, 400);

    const log = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "Archivo Variable",
        fontStyle: "italic",
        fontWeight: "600",
        fontSize: 15,
        fill: PAPER,
        lineHeight: 21,
      }),
    });
    log.position.set(56, FLOOR_Y + 40);
    const logPanel = new Graphics()
      .roundRect(40, FLOOR_Y + 30, 640, 84, 8)
      .fill({ color: INK, alpha: 0.82 });

    this.hud.addChild(
      this.bars,
      timerBadge,
      timer,
      ...names,
      ...info,
      ...picks,
      ...ribbons,
      logPanel,
      log,
      bannerShadow,
      banner,
      sub,
    );
    this.text = { names, info, picks, ribbons, ribbonText, timer, banner, bannerShadow, sub, log };
  }

  private banner(text: string, sub: string, ms: number) {
    this.text.banner.text = text;
    this.text.bannerShadow.text = text;
    this.text.sub.text = sub;
    for (const t of [this.text.banner, this.text.bannerShadow, this.text.sub]) t.alpha = 1;
    this.bannerUntil = performance.now() + ms;
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
          this.log.push(e);
          this.onEvent(e, snap);
        }
      }
    }
    this.drawDebug(snap);
    this.drawHud(snap, tick, defs);
    this.stage.update(dtMs);
    this.animateFx(dtMs);

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
      const ribbon = this.text.ribbons[i];
      if (!move) {
        ribbon.alpha = 0;
        continue;
      }
      const label = this.text.ribbonText[i];
      label.text = move.name.toUpperCase();
      const w = label.width + 36;
      const g = ribbon.getChildAt(0) as Graphics;
      const x0 = i === 0 ? 0 : -w;
      const notch = i === 0 ? x0 + w : x0;
      g.clear()
        .poly([x0, -16, x0 + w, -16, notch + (i === 0 ? -12 : 12), 0, x0 + w, 16, x0, 16])
        .fill(HERO_RED)
        .stroke({ color: INK, width: 3 });
      if (i === 1)
        g.clear()
          .poly([x0, -16, x0 + w, -16, x0 + w, 16, x0, 16, x0 + 12, 0])
          .fill(HERO_RED)
          .stroke({ color: INK, width: 3 });
      ribbon.alpha = 1;
    }
  }

  private onEvent(e: FightEvent, snap: FrameSnapshot) {
    if (e.type === "hit" || e.type === "block") {
      const a = snap.fighters[e.side ?? 0];
      const d = snap.fighters[1 - (e.side ?? 0)];
      const hb = a.hitbox ?? d.hurtboxes[1] ?? null;
      const p = toScreen(hb ? hb.x + hb.w / 2 : d.x, hb ? hb.y + hb.h / 2 : 100);
      const spark = new Container();
      spark.position.set(p.x, p.y);
      const g = new Graphics();
      if (e.type === "hit") {
        const big = (e.damage ?? 0) >= 10;
        g.star(0, 0, 12, big ? 66 : 50, big ? 30 : 24)
          .fill(HERO_RED)
          .stroke({ color: INK, width: 4 });
        const word = new Text({
          text: HIT_WORDS[(e.tick + e.frame) % HIT_WORDS.length],
          style: new TextStyle({
            fontFamily: "Alfa Slab One",
            fontSize: big ? 30 : 24,
            fill: PAPER,
            stroke: { color: INK, width: 5 },
          }),
        });
        word.anchor.set(0.5);
        word.rotation = -0.12;
        spark.addChild(g, word);
        this.shake = Math.min(16, 4 + (e.damage ?? 0) * 0.7);
        if (big) this.stage.flareNeon(0.8);
        if ((e.effectiveness ?? 1) > 1) this.tagline("Super effective!", p.x, p.y - 80, HERO_RED);
        else if ((e.effectiveness ?? 1) < 1)
          this.tagline("Not very effective...", p.x, p.y - 80, 0x5b524b);
      } else {
        g.circle(0, 0, 30)
          .fill({ color: PAPER, alpha: 0.85 })
          .stroke({ color: PANEL_BLUE, width: 6 });
        const word = new Text({
          text: "BLOCK",
          style: new TextStyle({ fontFamily: "Alfa Slab One", fontSize: 16, fill: INK }),
        });
        word.anchor.set(0.5);
        spark.addChild(g, word);
      }
      this.fx.addChild(spark);
    }
    if (e.type === "trade") this.banner("Trade!", "", 600);
    if (e.type === "knockdown") this.tagline("Down he goes!", VIEW_W / 2, 220, INK);
    if (e.type === "punish") this.tagline("Wide open!", VIEW_W / 2, 220, INK);
    if (e.type === "ko" || e.type === "timeout") {
      const defs = this.defs;
      const w = e.type === "ko" ? e.side : this.playback?.current?.result.state.winner;
      const name = defs && (w === 0 || w === 1) ? defs[w].name : null;
      this.banner(
        e.type === "ko" ? "Knock-Out!" : "Time!",
        name ? `${name.toUpperCase()} WINS` : "A DRAW",
        600_000,
      );
      this.stage.flareNeon(1.5);
    }
  }

  private tagline(text: string, x: number, y: number, fill: number) {
    const t = new Text({
      text,
      style: new TextStyle({
        fontFamily: "Yellowtail",
        fontSize: 40,
        fill,
        stroke: { color: PAPER, width: 6 },
      }),
    });
    t.anchor.set(0.5);
    t.rotation = -0.08;
    t.position.set(Math.min(VIEW_W - 160, Math.max(160, x)), Math.max(150, y));
    t.label = "tagline";
    this.fx.addChild(t);
  }

  private animateFx(dtMs: number) {
    for (const c of this.fx.children.slice()) {
      const slow = c.label === "tagline";
      c.alpha -= dtMs / (slow ? 1100 : 380);
      if (slow) c.y -= dtMs / 30;
      else c.scale.set(c.scale.x + dtMs / 900);
      if (c.alpha <= 0) c.destroy({ children: true });
    }
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dtMs / 16);
      this.world.position.set(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
    } else this.world.position.set(0, 0);
    if (performance.now() > this.bannerUntil) {
      for (const t of [this.text.banner, this.text.bannerShadow, this.text.sub])
        t.alpha = Math.max(0, t.alpha - dtMs / 250);
    }
    for (const r of this.text.ribbons)
      if (r.alpha > 0) r.alpha = Math.max(0, r.alpha - dtMs / 2400);
  }

  private drawDebug(snap: FrameSnapshot) {
    const g = this.debug.clear();
    if (!this.showBoxes) return;
    // Floor line and each fighter's ground point: what sprite anchors must line up with.
    const floor = toScreen(0, 0).y;
    g.moveTo(0, floor).lineTo(VIEW_W, floor).stroke({ color: INK, width: 1, alpha: 0.6 });
    for (const f of snap.fighters) {
      const o = toScreen(f.x, f.y);
      g.moveTo(o.x - 8, o.y)
        .lineTo(o.x + 8, o.y)
        .moveTo(o.x, o.y - 8)
        .lineTo(o.x, o.y + 8);
      g.stroke({ color: INK, width: 2 });
    }
    for (const f of snap.fighters) {
      for (const r of f.hurtboxes) rectPath(g, r).stroke({ color: 0x2f6b3f, width: 2, alpha: 0.9 });
      if (f.hitbox)
        rectPath(g, f.hitbox)
          .fill({ color: HERO_RED, alpha: 0.3 })
          .stroke({ color: HERO_RED, width: 2 });
    }
  }

  private drawHud(snap: FrameSnapshot, tick: TickMessage | null, defs: [FighterDef, FighterDef]) {
    const g = this.bars.clear();
    for (const i of [0, 1] as const) {
      const f = snap.fighters[i];
      const pct = Math.max(0, f.hp / defs[i].stats.maxHp);
      const x = i === 0 ? 40 : VIEW_W - 40 - BAR_W;
      // Coupon strip: cream with a dashed inner border; red fill drains toward the outside edge.
      g.rect(x + 5, 53, BAR_W, 26).fill(INK);
      g.rect(x, 48, BAR_W, 26).fill(PAPER_DEEP).stroke({ color: INK, width: 3 });
      const fillW = (BAR_W - 8) * pct;
      g.rect(i === 0 ? x + 4 + (BAR_W - 8 - fillW) : x + 4, 52, fillW, 18).fill(
        pct > 0.35 ? HERO_RED : MUSTARD,
      );
      for (let dx = 8; dx < BAR_W - 8; dx += 14) g.rect(x + dx, 46, 6, 2).fill(PAPER);
      if (tick) this.text.picks[i].text = pickLabel(tick.picks[i]);
    }
    const ticksLeft = Math.max(
      0,
      (tick?.result.state.config.roundTicks ?? 40) - (tick ? tick.result.state.tick - 1 : 0),
    );
    this.text.timer.text = String(Math.min(ticksLeft, 99));
    this.text.log.text = this.log
      .slice(-3)
      .map((e) => e.text)
      .join("\n");
  }
}

function pickLabel(p: PickInfo): string {
  switch (p.source) {
    case "gemini":
      return `GEMINI DECISION 1${p.confidence != null ? ` · ${Math.round(p.confidence * 100)}% SURE` : ""}${p.latencyMs != null ? ` · ${p.latencyMs} MS` : ""}`;
    case "fallback":
      return "GEMINI UNAVAILABLE · HEURISTIC PICKED";
    case "late":
      return "DECISION LATE · IDLED";
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
