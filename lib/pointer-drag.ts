/**
 * Starts a window-level pointer drag: attempts native capture (best-effort — some browsers/
 * elements don't support it, so the window listeners below are what actually make the drag
 * work), forwards `pointermove` to `onMove` until `pointerup`, then cleans up.
 */
export function capturePointerDrag(
  el: HTMLElement,
  pointerId: number,
  onMove: (e: PointerEvent) => void,
  onUp?: (e: PointerEvent) => void,
) {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // Capture is a nice-to-have — the window-level listeners below do the real work.
  }

  const move = (ev: PointerEvent) => onMove(ev);
  const up = (ev: PointerEvent) => {
    try {
      el.releasePointerCapture(ev.pointerId);
    } catch {
      // no-op if it was never captured
    }
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    onUp?.(ev);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}
