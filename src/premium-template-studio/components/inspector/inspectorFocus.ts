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
  | "hero-eyebrow"
  | "hero-title"
  | "hero-subtitle"
  | "hero-description"
  | "hero-cta";

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
 * Pure Inspector-positioning helper (canvas → inspector direction).
 *
 * Returns the `scrollTop` delta that places the target's top edge in the
 * comfortable upper portion of the Inspector (≈ upper fifth, clamped by a
 * minimum pixel margin), while leaving breathing room above the bottom edge.
 * If the target is already comfortably visible, returns 0 — no movement.
 *
 * "Comfortable" means the target is never placed at the very top edge, never
 * left clipped at the bottom, and never moved when it is already in view.
 */
export function computeInspectorFocusScroll(viewport: FocusRect, element: FocusRect): number {
  const height = viewport.bottom - viewport.top;
  const topMargin = Math.max(16, height * 0.1);
  const bottomMargin = Math.max(16, height * 0.1);
  const visibleTop = viewport.top + topMargin;
  const visibleBottom = viewport.bottom - bottomMargin;
  // Already comfortably visible → no movement.
  if (element.top >= visibleTop && element.bottom <= visibleBottom) return 0;

  // Bring the target's top edge into the comfortable upper band (never the raw
  // top edge), so it is clearly in view with room above and below.
  const targetTop = viewport.top + Math.max(24, height * 0.18);
  return element.top - targetTop;
}
