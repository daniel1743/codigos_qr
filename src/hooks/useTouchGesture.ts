import { useRef, useCallback, useEffect } from 'react';

/**
 * Mobile Touch Gesture Hook
 * Distinguishes between TAP (select) and SCROLL (navigate)
 *
 * Rule: TOUCH SELECTS. TOUCH DOES NOT REPOSITION.
 */

interface TouchGestureState {
  startX: number;
  startY: number;
  startTime: number;
  candidateTarget: string | null;
  isScrolling: boolean;
}

interface UseTouchGestureOptions {
  onTap?: (target: string) => void;
  onTapOutside?: () => void;
  movementThreshold?: number; // px
  tapTimeThreshold?: number; // ms
}

export function useTouchGesture({
  onTap,
  onTapOutside,
  movementThreshold = 10,
  tapTimeThreshold = 300,
}: UseTouchGestureOptions = {}) {
  const gestureState = useRef<TouchGestureState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    candidateTarget: null,
    isScrolling: false,
  });

  const handlePointerDown = useCallback((e: PointerEvent) => {
    const target = e.target as HTMLElement;

    // Find editable target by data attribute
    const editableElement = target.closest('[data-editor-target]');
    const candidateTarget = editableElement?.getAttribute('data-editor-target') || null;

    gestureState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      candidateTarget,
      isScrolling: false,
    };
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const state = gestureState.current;

    // Calculate movement delta
    const deltaX = Math.abs(e.clientX - state.startX);
    const deltaY = Math.abs(e.clientY - state.startY);
    const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // If movement exceeds threshold, it's a scroll/drag gesture
    if (totalMovement > movementThreshold) {
      state.isScrolling = true;
    }
  }, [movementThreshold]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const state = gestureState.current;
    const duration = Date.now() - state.startTime;

    // Determine if this was a TAP or SCROLL
    const isTap = !state.isScrolling && duration < tapTimeThreshold;

    if (isTap) {
      if (state.candidateTarget && onTap) {
        // Valid tap on editable element
        onTap(state.candidateTarget);
      } else if (!state.candidateTarget && onTapOutside) {
        // Tap outside any editable element
        onTapOutside();
      }
    }

    // Reset state
    gestureState.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      candidateTarget: null,
      isScrolling: false,
    };
  }, [tapTimeThreshold, onTap, onTapOutside]);

  const handlePointerCancel = useCallback(() => {
    // Reset on gesture cancel (e.g., pinch zoom started)
    gestureState.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      candidateTarget: null,
      isScrolling: false,
    };
  }, []);

  // Attach listeners
  useEffect(() => {
    const element = document.body; // Or specific container

    element.addEventListener('pointerdown', handlePointerDown, { passive: true });
    element.addEventListener('pointermove', handlePointerMove, { passive: true });
    element.addEventListener('pointerup', handlePointerUp, { passive: true });
    element.addEventListener('pointercancel', handlePointerCancel, { passive: true });

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown);
      element.removeEventListener('pointermove', handlePointerMove);
      element.removeEventListener('pointerup', handlePointerUp);
      element.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  return {
    // Can expose additional state if needed
    isGestureActive: gestureState.current.isScrolling,
  };
}

/**
 * Parse editor target string into type and ID
 * Examples:
 * - "profile.photo" -> { type: "profile.photo", id: null }
 * - "link:abc123" -> { type: "link", id: "abc123" }
 */
export function parseEditorTarget(target: string | null): {
  type: string | null;
  id: string | null;
} {
  if (!target) return { type: null, id: null };

  const [type, id] = target.split(':');
  return {
    type: type || null,
    id: id || null,
  };
}
