export const VIEW_W = 1280;
export const VIEW_H = 720;
export const MARGIN_X = 40;
/** The diorama's standing line: 87.5% down the frame. */
export const FLOOR_Y = 630;

/** World (x right, y up from floor) to screen (y down). */
export function toScreen(x: number, y: number): { x: number; y: number } {
  return { x: MARGIN_X + x, y: FLOOR_Y - y };
}
