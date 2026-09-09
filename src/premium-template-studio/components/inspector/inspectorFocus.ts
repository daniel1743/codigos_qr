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

export type InspectorFocusTarget = "profile-cover" | "hero-cta";

type Listener = (target: InspectorFocusTarget) => void;

const listeners = new Set<Listener>();

/** Request that the Inspector bring `target` into view (user click only). */
export function requestInspectorFocus(target: InspectorFocusTarget): void {
  for (const listener of listeners) listener(target);
}

/** Subscribe to focus requests. Returns an unsubscribe function. */
export function subscribeInspectorFocus(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
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
