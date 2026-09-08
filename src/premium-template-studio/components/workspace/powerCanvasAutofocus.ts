/**
 * Pure visibility/scroll-delta math for Phase 4A selection autofocus.
 *
 * All inputs are DOM rectangles in the SAME coordinate space (screen pixels).
 * The returned deltas are applied directly to the owning scroll container's
 * `scrollTop` / `scrollLeft`.
 *
 * This helper is deliberately free of any Stage/intrinsic/zoom knowledge: it
 * only decides whether a selected element is already visible and, if not, how
 * much the scroll container must move to recover it with minimal movement.
 */

export interface AutofocusRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface AutofocusScrollDelta {
  top: number;
  left: number;
}

export const POWER_CANVAS_AUTOFOCUS_MARGIN = 8;

export function computeAutofocusScrollDelta(
  viewport: AutofocusRect,
  element: AutofocusRect,
  margin = POWER_CANVAS_AUTOFOCUS_MARGIN,
): AutofocusScrollDelta {
  let top = 0;
  let left = 0;

  // Reveal whichever edge is clipped. When both vertical edges are clipped the
  // element is taller than the viewport; prioritize aligning the top, matching
  // common editor behavior.
  if (element.top < viewport.top + margin) {
    top = element.top - (viewport.top + margin);
  } else if (element.bottom > viewport.bottom - margin) {
    top = element.bottom - (viewport.bottom - margin);
  }

  if (element.left < viewport.left + margin) {
    left = element.left - (viewport.left + margin);
  } else if (element.right > viewport.right - margin) {
    left = element.right - (viewport.right - margin);
  }

  return { top, left };
}
