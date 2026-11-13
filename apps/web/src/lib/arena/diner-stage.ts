// The first stage: a 1950s diner laid out side-on (STYLE-NOTES ref 05), drawn in code until
// painted art exists. It stays softer and lower in contrast than the fighters so they pop.

import { BlurFilter, Container, Graphics, Text, TextStyle } from "pixi.js";
import { FLOOR_Y, MARGIN_X, VIEW_H, VIEW_W } from "./coords.js";
import {
  HERO_RED,
  INK,
  MINT,
  MUSTARD,
  NAVY,
  NEON_RED,
  PAPER,
  PAPER_DEEP,
  TEAL,
} from "./palette.js";

const STAGE_W = 1200;

export class DinerStage extends Container {
  private neon: Text;
  private glow: Text;
  private jukeboxGlow = new Graphics();
  private time = 0;
  private flare = 0;

  constructor() {
    super();
    const g = new Graphics();

    // Back wall: mint above, a red tile band at counter height.
    g.rect(0, 0, VIEW_W, FLOOR_Y).fill(MINT);
    // Windows onto a dusk lot.
    for (const x of [90, 330, 830, 1070]) {
      g.roundRect(x, 70, 160, 150, 10).fill(0x8e8fb8).stroke({ color: 0xd9d4c4, width: 8 });
      g.rect(x, 170, 160, 50).fill({ color: NAVY, alpha: 0.35 });
      g.rect(x + 78, 70, 4, 150).fill(0xd9d4c4);
    }
    // Chrome trim.
    g.rect(0, 250, VIEW_W, 10).fill(0xd9d4c4);
    g.rect(0, 258, VIEW_W, 3).fill({ color: 0xffffff, alpha: 0.6 });
    // Red tiles with cream grout.
    g.rect(0, 380, VIEW_W, FLOOR_Y - 380).fill(HERO_RED);
    for (let y = 380; y < FLOOR_Y; y += 34)
      g.rect(0, y, VIEW_W, 3).fill({ color: PAPER, alpha: 0.55 });
    for (let row = 0; row * 34 + 380 < FLOOR_Y; row++) {
      for (let x = row % 2 ? 0 : 34; x < VIEW_W; x += 68)
        g.rect(x, 380 + row * 34, 3, 34).fill({ color: PAPER, alpha: 0.55 });
    }
    // Counter top and stools.
    g.rect(0, 360, VIEW_W, 22).fill(PAPER_DEEP).stroke({ color: INK, width: 2, alpha: 0.4 });
    for (let x = 70; x < VIEW_W; x += 150) {
      if (x > 540 && x < 760) continue; // jukebox gap
      g.rect(x - 4, 470, 8, FLOOR_Y - 470).fill(0xb9b4a8);
      g.roundRect(x - 34, 450, 68, 24, 12)
        .fill(TEAL)
        .stroke({ color: INK, width: 2, alpha: 0.5 });
    }
    // Jukebox (ref 08): arched cabinet with bubble tubes.
    const jx = VIEW_W / 2;
    g.roundRect(jx - 80, 300, 160, FLOOR_Y - 300, 80)
      .fill(0x8a5a32)
      .stroke({ color: INK, width: 3, alpha: 0.6 });
    g.roundRect(jx - 62, 318, 124, 130, 62).fill(0xf0c56a);
    for (let i = 0; i < 6; i++) g.rect(jx - 50 + i * 20, 470, 10, 90).fill({ color: 0x6b4325 });
    this.jukeboxGlow.roundRect(jx - 62, 318, 124, 130, 62).fill({ color: MUSTARD, alpha: 0.6 });
    this.jukeboxGlow.filters = [new BlurFilter({ strength: 18 })];

    // Checkerboard floor, knocked back in contrast.
    g.rect(0, FLOOR_Y, VIEW_W, VIEW_H - FLOOR_Y).fill(PAPER);
    const tile = 45;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col * tile < VIEW_W; col++) {
        if ((row + col) % 2)
          g.rect(col * tile, FLOOR_Y + row * tile, tile, tile).fill({ color: INK, alpha: 0.72 });
      }
    }
    g.rect(0, FLOOR_Y - 3, VIEW_W, 6).fill(0xd9d4c4);

    // Booths at the stage walls: red-and-cream stripes.
    for (const left of [true, false]) {
      const x = left ? 0 : MARGIN_X + STAGE_W;
      const w = left ? MARGIN_X : VIEW_W - x;
      for (let i = 0; i * 12 < w; i++)
        g.rect(x + i * 12, 280, 6, FLOOR_Y - 280).fill(i % 2 ? PAPER : HERO_RED);
    }
    this.addChild(g, this.jukeboxGlow);

    // Neon script sign, invented for the game.
    const style = (stroke: number) =>
      new TextStyle({
        fontFamily: "Yellowtail",
        fontSize: 76,
        fill: stroke ? NEON_RED : 0xffd7cf,
        stroke: { color: NEON_RED, width: stroke },
      });
    this.glow = new Text({ text: "Clanker's", style: style(10) });
    this.glow.filters = [new BlurFilter({ strength: 14 })];
    this.neon = new Text({ text: "Clanker's", style: style(0) });
    for (const t of [this.glow, this.neon]) {
      t.anchor.set(0.5);
      t.position.set(VIEW_W / 2, 140);
      this.addChild(t);
    }
    // Soften the whole room so the fighters read first.
    const wash = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: PAPER, alpha: 0.18 });
    this.addChild(wash);
  }

  /** Neon flares on big hits and KOs. */
  flareNeon(strength = 1) {
    this.flare = Math.max(this.flare, strength);
  }

  update(dtMs: number) {
    this.time += dtMs;
    this.flare = Math.max(0, this.flare - dtMs / 600);
    const flicker = Math.sin(this.time / 90) > 0.97 ? 0.55 : 1;
    this.glow.alpha = Math.min(1, 0.55 * flicker + this.flare * 0.6);
    this.neon.alpha = 0.85 * flicker + 0.15;
    this.jukeboxGlow.alpha = 0.5 + 0.25 * Math.sin(this.time / 500);
  }
}
