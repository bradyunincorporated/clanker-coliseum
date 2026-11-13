/** The stage box: the 16:9 part of the frame the sim is drawn in, always 1280 x 720 design units. */
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const MARGIN_X = 40;
/** The diorama's standing line: 87.5% down the stage box. */
export const FLOOR_Y = 630;
/**
 * A frame taller than 16:9 has spare height. This share of it goes above the stage box (more
 * awning for the scoreboard) and the rest below (more floor). The diorama uses the same number.
 */
export const STAGE_TOP_SHARE = 0.6;

/** Where the stage box sits inside a frame of the given size, in design units. */
export function stageOrigin(frameW: number, frameH: number): { x: number; y: number } {
  return { x: (frameW - VIEW_W) / 2, y: Math.max(0, frameH - VIEW_H) * STAGE_TOP_SHARE };
}

/** World (x right, y up from floor) to stage-box pixels (y down). */
export function toScreen(x: number, y: number): { x: number; y: number } {
  return { x: MARGIN_X + x, y: FLOOR_Y - y };
}
