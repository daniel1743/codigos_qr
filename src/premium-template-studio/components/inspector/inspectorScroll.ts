/**
 * INSPECTOR AUTOFOCUS — scroll reset decision (pure).
 *
 * Phase 5A: the Inspector scroll should reset to the top of the relevant
 * controls ONLY when the selection identity actually changes (clicking a
 * different Hero/Banner/block, or clearing the selection). Editing the
 * currently-selected block (`patchBlockField`) keeps `selectedBlockId`
 * identical and must NOT trigger a scroll, so the panel never "jumps"
 * while the user is typing or dragging a slider.
 *
 * Kept pure so the "no repeated scroll" contract is unit-testable without a DOM.
 */
export function shouldResetInspectorScroll(
  previousSelectionId: string | null,
  nextSelectionId: string | null,
): boolean {
  return previousSelectionId !== nextSelectionId;
}
