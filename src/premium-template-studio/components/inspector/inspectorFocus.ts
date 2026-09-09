/**
 * PROFILE COVER FOCUS — minimal, one-shot signal (Phase 5B2).
 *
 * A canvas surface (the profile cover/banner) can request that the Inspector
 * bring a specific section into view, WITHOUT introducing a second global
 * selection architecture or touching the reducer / StudioProvider (which live
 * in `state/` and are out of scope here).
 *
 * `requestInspectorFocus` is called ONLY from an explicit user click — never on
 * render, edit, image load, resize, or canvas zoom — so the Inspector scroll
 * can never "jump" repeatedly while editing.
 */

/**
 * The canonical set of contextual sub-targets (a sub-element of the profile or
 * of a Hero block). A target is EPHEMERAL UI state — never persisted, never part
 * of canonical config, never a history entry, and never a second selection
 * store. `selectedBlockId` remains the canonical block-selection owner.
 */
export type ContextualTarget =
  | "profile-bio"
  | "profile-cover"
  | "profile-avatar"
  | "hero-eyebrow"
  | "hero-title"
  | "hero-subtitle"
  | "hero-description"
  | "hero-cta"
  | "hero-image"
  | "hero-background"
  | "hero-overlay"
  | "page-background";

export type InspectorFocusTarget = ContextualTarget;

type InspectorListener = (target: InspectorFocusTarget) => void;
type CanvasListener = (target: ContextualTarget) => void;

const inspectorListeners = new Set<InspectorListener>();
const canvasListeners = new Set<CanvasListener>();

/**
 * Canvas → Inspector (source = canvas).
 * Request that the Inspector bring `target` into view (user click only).
 * Only Inspector listeners are notified — never Canvas listeners — so a
 * canvas-originated request can never loop back into a Canvas move.
 */
export function requestInspectorFocus(target: InspectorFocusTarget): void {
  for (const listener of inspectorListeners) listener(target);
}

/** Subscribe to Inspector focus requests. Returns an unsubscribe function. */
export function subscribeInspectorFocus(listener: InspectorListener): () => void {
  inspectorListeners.add(listener);
  return () => {
    inspectorListeners.delete(listener);
  };
}

/**
 * Inspector → Canvas (source = inspector).
 * Request that the Canvas reveal the element matching `data-editor-target`
 * for `target` (fired when the user intentionally enters/interacts with a
 * contextual Inspector group). Only Canvas listeners are notified — never
 * Inspector listeners — so an inspector-originated request can never loop
 * back into an Inspector move.
 */
export function requestCanvasFocus(target: ContextualTarget): void {
  for (const listener of canvasListeners) listener(target);
}

/** Subscribe to Canvas reveal requests. Returns an unsubscribe function. */
export function subscribeCanvasFocus(listener: CanvasListener): () => void {
  canvasListeners.add(listener);
  return () => {
    canvasListeners.delete(listener);
  };
}

/**
 * Pure decision: should the Inspector scroll to a requested focus target?
 * A non-null target warrants a scroll; null never does. Kept pure so the
 * "no repeated scroll" contract is unit-testable without a DOM.
 */
export function shouldScrollInspectorToFocus(target: InspectorFocusTarget | null): boolean {
  return target !== null;
}

export interface FocusRect {
  top: number;
  bottom: number;
}

/**
 * Exact-target positioning constants (Phase 5C2D).
 *
 * The Inspector places the CENTER of the exact target at ~45% of the visible
 * Inspector viewport height (comfortable band: 35%–55%). A target already
 * centered in that band is never moved.
 */
export const INSPECTOR_FOCUS_ANCHOR_RATIO = 0.45;
export const INSPECTOR_FOCUS_BAND_LOW = 0.35;
export const INSPECTOR_FOCUS_BAND_HIGH = 0.55;

/**
 * Pure Inspector-positioning helper (canvas → inspector direction).
 *
 * Returns the `scrollTop` DELTA that centers the target's vertical center at
 * ~45% of the viewport height. Returns 0 when the target center already sits
 * within the comfortable 35%–55% band — so a target that is merely "visible"
 * near the top or bottom edge still gets re-centered, while an already-centered
 * target is left untouched (no repeated jumping).
 */
export function computeInspectorFocusScroll(viewport: FocusRect, element: FocusRect): number {
  const height = viewport.bottom - viewport.top;
  if (height <= 0) return 0;

  const anchor = viewport.top + height * INSPECTOR_FOCUS_ANCHOR_RATIO;
  const targetCenter = element.top + (element.bottom - element.top) / 2;

  const bandLow = viewport.top + height * INSPECTOR_FOCUS_BAND_LOW;
  const bandHigh = viewport.top + height * INSPECTOR_FOCUS_BAND_HIGH;
  if (targetCenter >= bandLow && targetCenter <= bandHigh) return 0;

  return targetCenter - anchor;
}

/**
 * Pure scroll clamping: keep `value` within [0, scrollSize - clientSize].
 * Used by both the Inspector scroll owner and the Canvas viewport scroll owner
 * so a target near either edge never overshoots or goes negative.
 */
export function clampScrollValue(value: number, scrollSize: number, clientSize: number): number {
  const max = Math.max(0, scrollSize - clientSize);
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
}

export interface CanvasFocusRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Canvas reveal anchor: ~47.5% of the visible viewport height (45%–50% band). */
export const CANVAS_FOCUS_ANCHOR_RATIO = 0.475;

/**
 * Pure Canvas-positioning helper (inspector → canvas direction).
 *
 * Returns the `{ top, left }` scroll DELTAs that center the exact element's
 * vertical center near the comfortable anchor band, and keep it comfortably
 * visible horizontally (only moved if it drifts out of a comfortable margin).
 * This only produces scroll deltas — zoom, Stage geometry, camera math and the
 * pan owner are the caller's responsibility and are never touched here.
 */
export function computeCanvasFocusScroll(
  viewport: CanvasFocusRect,
  element: CanvasFocusRect,
): { top: number; left: number } {
  const height = viewport.bottom - viewport.top;
  const width = viewport.right - viewport.left;

  const anchorY = viewport.top + height * CANVAS_FOCUS_ANCHOR_RATIO;
  const centerY = element.top + (element.bottom - element.top) / 2;
  const centerX = element.left + (element.right - element.left) / 2;

  let top = 0;
  if (height > 0) {
    const bandLow = viewport.top + height * INSPECTOR_FOCUS_BAND_LOW;
    const bandHigh = viewport.top + height * INSPECTOR_FOCUS_BAND_HIGH;
    if (centerY < bandLow || centerY > bandHigh) {
      top = centerY - anchorY;
    }
  }

  let left = 0;
  if (width > 0) {
    const hMargin = Math.max(16, width * 0.1);
    if (element.left < viewport.left + hMargin || element.right > viewport.right - hMargin) {
      left = centerX - (viewport.left + width / 2);
    }
  }

  return { top, left };
}
