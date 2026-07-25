export type HandlePosition = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const MIN_FIELD_SIZE_RATIO = 0.02;

export interface FieldRect {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

/** Resizes a ratio-space rect from a given handle, keeping the opposite edge(s) anchored. */
export function resizeRect(start: FieldRect, handle: HandlePosition, dxRatio: number, dyRatio: number): FieldRect {
  const left = start.xRatio;
  const top = start.yRatio;
  const right = start.xRatio + start.widthRatio;
  const bottom = start.yRatio + start.heightRatio;

  const newLeft = handle.includes("w") ? Math.min(right - MIN_FIELD_SIZE_RATIO, Math.max(0, left + dxRatio)) : left;
  const newRight = handle.includes("e") ? Math.max(left + MIN_FIELD_SIZE_RATIO, Math.min(1, right + dxRatio)) : right;
  const newTop = handle.includes("n") ? Math.min(bottom - MIN_FIELD_SIZE_RATIO, Math.max(0, top + dyRatio)) : top;
  const newBottom = handle.includes("s") ? Math.max(top + MIN_FIELD_SIZE_RATIO, Math.min(1, bottom + dyRatio)) : bottom;

  return {
    xRatio: newLeft,
    yRatio: newTop,
    widthRatio: newRight - newLeft,
    heightRatio: newBottom - newTop,
  };
}

/** Moves a ratio-space rect, clamping so it never leaves the [0,1] page bounds. */
export function moveRect(start: FieldRect, dxRatio: number, dyRatio: number): FieldRect {
  return {
    ...start,
    xRatio: Math.min(1 - start.widthRatio, Math.max(0, start.xRatio + dxRatio)),
    yRatio: Math.min(1 - start.heightRatio, Math.max(0, start.yRatio + dyRatio)),
  };
}

/** Normalizes a drag from (startRatio) to (currentRatio) into a top-left-anchored rect. */
export function rectFromDrag(
  startXRatio: number,
  startYRatio: number,
  currentXRatio: number,
  currentYRatio: number,
): FieldRect {
  const xRatio = Math.min(startXRatio, currentXRatio);
  const yRatio = Math.min(startYRatio, currentYRatio);
  const widthRatio = Math.abs(currentXRatio - startXRatio);
  const heightRatio = Math.abs(currentYRatio - startYRatio);
  return { xRatio, yRatio, widthRatio, heightRatio };
}
