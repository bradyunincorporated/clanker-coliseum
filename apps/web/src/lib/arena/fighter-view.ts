// One fighter on screen. Until sprites exist it draws a placeholder body from the fighter's
// hurtboxes in the billboard style: flat colour, thick ink outline, a big expressive eye.
// When a fighter file sets sprites.sheet, the matching animation is shown instead, with its
// frame chosen from the sim's actionFrame so the art stays in lockstep with the hitboxes.

import { AnimatedSprite, Assets, Container, Graphics, Spritesheet, Texture } from "pixi.js";
import { FRAMES_PER_TICK, type FighterDef, type FighterFrame, type Rect } from "@clanker/game";
import { INK, PAPER } from "./palette.js";
import { toScreen } from "./coords.js";

export class FighterView extends Container {
  private shadow = new Graphics();
  private body = new Graphics();
  private sprite: AnimatedSprite | null = null;
  private sheet: Spritesheet | null = null;
  private lastStatus: FighterFrame["status"] = "normal";
  private flash = 0;
  private disposed = false;

  constructor(private readonly def: FighterDef) {
    super();
    this.addChild(this.shadow, this.body);
    if (def.sprites.sheet) void this.loadSheet(def.sprites.sheet);
  }

  private async loadSheet(url: string) {
    try {
      const sheet = (await Assets.load(url)) as Spritesheet;
      if (this.disposed) return;
      this.sheet = sheet;
      this.sprite = new AnimatedSprite([Texture.EMPTY]);
      this.sprite.anchor.set(this.def.sprites.anchor?.x ?? 0.5, this.def.sprites.anchor?.y ?? 1);
      this.sprite.scale.set(this.def.sprites.scale ?? 1);
      this.addChild(this.sprite);
    } catch (err) {
      console.warn(`Could not load sprites for ${this.def.id}; drawing placeholders`, err);
    }
  }

  update(f: FighterFrame) {
    if (f.status === "hitstun" && this.lastStatus !== "hitstun") this.flash = 6;
    this.lastStatus = f.status;
    if (this.flash > 0) this.flash--;
    this.drawShadow(f);
    if (this.sprite && this.sheet && this.drawSprite(f)) {
      this.body.clear();
      return;
    }
    this.drawBody(f);
  }

  override destroy() {
    this.disposed = true;
    super.destroy({ children: true });
  }

  private drawShadow(f: FighterFrame) {
    const p = toScreen(f.x, 0);
    const shrink = Math.max(0.45, 1 - f.y / 260);
    this.shadow
      .clear()
      .ellipse(p.x, p.y + 4, 62 * shrink, 9 * shrink)
      .fill({ color: INK, alpha: 0.22 });
  }

  private drawSprite(f: FighterFrame): boolean {
    const anims = this.def.sprites.animations ?? {};
    const key = f.status === "normal" ? f.action : f.status;
    const name = anims[key];
    const textures = name ? this.sheet?.animations[name] : undefined;
    const sp = this.sprite;
    if (!textures || !sp) {
      if (sp) sp.visible = false;
      return false;
    }
    sp.visible = true;
    if (sp.textures !== textures) sp.textures = textures;
    sp.gotoAndStop(
      Math.min(
        textures.length - 1,
        Math.floor((f.actionFrame / FRAMES_PER_TICK) * textures.length),
      ),
    );
    const p = toScreen(f.x, f.y);
    sp.position.set(p.x, p.y);
    sp.scale.x = Math.abs(sp.scale.x) * f.facing;
    sp.tint = this.flash > 0 ? 0xffb0a8 : 0xffffff;
    return true;
  }

  private drawBody(f: FighterFrame) {
    const g = this.body.clear();
    const { color, accent } = this.def.sprites;
    const fill = this.flash > 0 ? PAPER : f.status === "ko" ? 0x9a9187 : color;
    const line = { color: INK, width: 4, join: "round" as const };

    if (f.status === "ko" || f.action === "knockdown") {
      const w = 170;
      const p = toScreen(f.x - w / 2, 38);
      g.roundRect(p.x, p.y, w, 38, 16).fill(fill).stroke(line);
      const eye = toScreen(f.x + f.facing * 50, 22);
      // X-eyes while down.
      g.moveTo(eye.x - 7, eye.y - 7)
        .lineTo(eye.x + 7, eye.y + 7)
        .moveTo(eye.x + 7, eye.y - 7)
        .lineTo(eye.x - 7, eye.y + 7)
        .stroke({ color: INK, width: 3 });
      return;
    }

    // Invincible frames have no hurtboxes: draw the stance outline, translucent.
    let boxes = f.hurtboxes;
    const invincible = boxes.length === 0;
    if (invincible) {
      const set = this.def.hurtboxes[f.stance];
      boxes = set.map((b) => ({
        x: f.facing === 1 ? f.x + b.x : f.x - b.x - b.w,
        y: f.y + b.y,
        w: b.w,
        h: b.h,
      }));
    }
    const u = union(boxes);
    const tl = toScreen(u.x, u.y + u.h);
    const alpha = invincible ? 0.6 : 1;
    g.roundRect(tl.x, tl.y, u.w, u.h, 22)
      .fill({ color: fill, alpha })
      .stroke({ ...line, alpha });
    // Belly panel in the accent colour, like a printed two-tone figure.
    g.roundRect(tl.x + u.w * 0.2, tl.y + u.h * 0.42, u.w * 0.6, u.h * 0.42, 14).fill({
      color: accent,
      alpha: 0.25 * alpha,
    });

    // Big eye; it squeezes shut on a hit.
    const eye = toScreen(f.x + f.facing * u.w * 0.2, u.y + u.h - 28);
    if (f.status === "hitstun") {
      g.moveTo(eye.x - 9, eye.y - 5)
        .lineTo(eye.x + 9, eye.y)
        .lineTo(eye.x - 9, eye.y + 5)
        .stroke({ color: INK, width: 4, cap: "round" });
    } else {
      g.circle(eye.x, eye.y, 10).fill(PAPER).stroke({ color: INK, width: 3 });
      g.circle(eye.x + f.facing * 4, eye.y, 4.5).fill(INK);
    }

    // Guard: a cream shield on the leading side.
    if (f.action === "block" || f.action === "crouchBlock" || f.status === "blockstun") {
      const gx = toScreen(f.x + f.facing * (u.w / 2 + 10), u.y + u.h * 0.85);
      g.roundRect(gx.x - 7, gx.y, 14, u.h * 0.7, 7)
        .fill(PAPER)
        .stroke({ color: INK, width: 3 });
    }

    // Limb: telegraphs in startup, reaches the hitbox in active frames, retracts in recovery.
    if (f.phase !== "none" && f.action in this.def.moves) {
      const hb = this.def.moves[f.action as keyof FighterDef["moves"]].hitbox;
      const cy = f.y + hb.y + hb.h / 2;
      const ext =
        f.phase === "active" ? hb.x + hb.w : f.phase === "startup" ? hb.x * 0.6 : hb.x + hb.w * 0.4;
      const from = toScreen(f.x, cy);
      const to = toScreen(f.x + f.facing * ext, cy);
      const thick = Math.max(12, Math.min(hb.h, 28));
      g.moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({ color: INK, width: thick + 8, cap: "round" });
      g.moveTo(from.x, from.y)
        .lineTo(to.x, to.y)
        .stroke({ color: accent, width: thick, cap: "round" });
      if (f.phase === "active")
        g.circle(to.x, to.y, thick * 0.8)
          .fill(fill)
          .stroke({ color: INK, width: 4 });
    }
  }
}

function union(rs: Rect[]): Rect {
  const x0 = Math.min(...rs.map((r) => r.x));
  const y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.w));
  const y1 = Math.max(...rs.map((r) => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
