export type HandlePosition = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const MIN_FIELD_SIZE_RATIO = 0.02;

export interface FieldRect {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
}

/** Whether two ratio-space rects overlap at all (used for rubber-band selection hit-testing). */
export function rectsIntersect(a: FieldRect, b: FieldRect): boolean {
  return (
    a.xRatio < b.xRatio + b.widthRatio &&
    a.xRatio + a.widthRatio > b.xRatio &&
    a.yRatio < b.yRatio + b.heightRatio &&
    a.yRatio + a.heightRatio > b.yRatio
  );
}

/** The smallest rect that contains every given rect — a multi-selection's shared bounding box. */
export function groupBounds(rects: FieldRect[]): FieldRect {
  const left = Math.min(...rects.map((r) => r.xRatio));
  const top = Math.min(...rects.map((r) => r.yRatio));
  const right = Math.max(...rects.map((r) => r.xRatio + r.widthRatio));
  const bottom = Math.max(...rects.map((r) => r.yRatio + r.heightRatio));
  return { xRatio: left, yRatio: top, widthRatio: right - left, heightRatio: bottom - top };
}

/**
 * Maps `rect` from its proportional position/size within `fromBounds` to the equivalent
 * proportional position/size within `toBounds` — the core of group-resize: resizing the shared
 * bounding box of several fields, then scaling each field the same amount relative to it, so
 * (for example) widening a box of fields widens every field in it together.
 */
export function remapRectToBounds(rect: FieldRect, fromBounds: FieldRect, toBounds: FieldRect): FieldRect {
  const relX = fromBounds.widthRatio > 0 ? (rect.xRatio - fromBounds.xRatio) / fromBounds.widthRatio : 0;
  const relY = fromBounds.heightRatio > 0 ? (rect.yRatio - fromBounds.yRatio) / fromBounds.heightRatio : 0;
  const relWidth = fromBounds.widthRatio > 0 ? rect.widthRatio / fromBounds.widthRatio : 1;
  const relHeight = fromBounds.heightRatio > 0 ? rect.heightRatio / fromBounds.heightRatio : 1;
  return {
    xRatio: toBounds.xRatio + relX * toBounds.widthRatio,
    yRatio: toBounds.yRatio + relY * toBounds.heightRatio,
    widthRatio: Math.max(MIN_FIELD_SIZE_RATIO, relWidth * toBounds.widthRatio),
    heightRatio: Math.max(MIN_FIELD_SIZE_RATIO, relHeight * toBounds.heightRatio),
  };
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

export interface SnapGuide {
  axis: "x" | "y";
  ratio: number;
}

function edgesOf(rect: FieldRect) {
  return {
    left: rect.xRatio,
    centerX: rect.xRatio + rect.widthRatio / 2,
    right: rect.xRatio + rect.widthRatio,
    top: rect.yRatio,
    centerY: rect.yRatio + rect.heightRatio / 2,
    bottom: rect.yRatio + rect.heightRatio,
  };
}

/** Among every (own value, candidate value) pair within `threshold`, returns the closest one. */
function closestAlignment(
  ownValues: number[],
  candidateValues: number[],
  threshold: number,
): { delta: number; guideRatio: number } | null {
  let best: { delta: number; guideRatio: number; distance: number } | null = null;
  for (const own of ownValues) {
    for (const candidate of candidateValues) {
      const distance = Math.abs(candidate - own);
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { delta: candidate - own, guideRatio: candidate, distance };
      }
    }
  }
  return best;
}

/**
 * Nudges a freshly-moved (not resized) rect onto the nearest edge/center line shared with a
 * sibling field on the same page, independently per axis, so dragging a field near another one
 * "catches" into visual alignment instead of requiring pixel-perfect placement.
 */
export function snapMovedRect(
  rect: FieldRect,
  siblings: FieldRect[],
  thresholdXRatio: number,
  thresholdYRatio: number,
): { rect: FieldRect; guides: SnapGuide[] } {
  const own = edgesOf(rect);
  const siblingEdges = siblings.map(edgesOf);
  const guides: SnapGuide[] = [];

  const xSnap = closestAlignment(
    [own.left, own.centerX, own.right],
    siblingEdges.flatMap((e) => [e.left, e.centerX, e.right]),
    thresholdXRatio,
  );
  const ySnap = closestAlignment(
    [own.top, own.centerY, own.bottom],
    siblingEdges.flatMap((e) => [e.top, e.centerY, e.bottom]),
    thresholdYRatio,
  );

  const xRatio = xSnap ? rect.xRatio + xSnap.delta : rect.xRatio;
  const yRatio = ySnap ? rect.yRatio + ySnap.delta : rect.yRatio;
  if (xSnap) guides.push({ axis: "x", ratio: xSnap.guideRatio });
  if (ySnap) guides.push({ axis: "y", ratio: ySnap.guideRatio });

  return { rect: { ...rect, xRatio, yRatio }, guides };
}

/**
 * Nudges a freshly-resized rect's moving edge(s) — only the ones the given handle actually
 * controls — onto the nearest matching edge of a sibling field, so resizing to match another
 * field's width/height/edge "catches" the same way a move does.
 */
export function snapResizedRect(
  rect: FieldRect,
  handle: HandlePosition,
  siblings: FieldRect[],
  thresholdXRatio: number,
  thresholdYRatio: number,
): { rect: FieldRect; guides: SnapGuide[] } {
  const siblingEdges = siblings.map(edgesOf);
  const xCandidates = siblingEdges.flatMap((e) => [e.left, e.right]);
  const yCandidates = siblingEdges.flatMap((e) => [e.top, e.bottom]);
  const guides: SnapGuide[] = [];

  let { xRatio, yRatio, widthRatio, heightRatio } = rect;

  if (handle.includes("w")) {
    const snap = closestAlignment([xRatio], xCandidates, thresholdXRatio);
    if (snap) {
      widthRatio = Math.max(MIN_FIELD_SIZE_RATIO, widthRatio - snap.delta);
      xRatio += snap.delta;
      guides.push({ axis: "x", ratio: snap.guideRatio });
    }
  } else if (handle.includes("e")) {
    const snap = closestAlignment([xRatio + widthRatio], xCandidates, thresholdXRatio);
    if (snap) {
      widthRatio = Math.max(MIN_FIELD_SIZE_RATIO, widthRatio + snap.delta);
      guides.push({ axis: "x", ratio: snap.guideRatio });
    }
  }

  if (handle.includes("n")) {
    const snap = closestAlignment([yRatio], yCandidates, thresholdYRatio);
    if (snap) {
      heightRatio = Math.max(MIN_FIELD_SIZE_RATIO, heightRatio - snap.delta);
      yRatio += snap.delta;
      guides.push({ axis: "y", ratio: snap.guideRatio });
    }
  } else if (handle.includes("s")) {
    const snap = closestAlignment([yRatio + heightRatio], yCandidates, thresholdYRatio);
    if (snap) {
      heightRatio = Math.max(MIN_FIELD_SIZE_RATIO, heightRatio + snap.delta);
      guides.push({ axis: "y", ratio: snap.guideRatio });
    }
  }

  return { rect: { xRatio, yRatio, widthRatio, heightRatio }, guides };
}
