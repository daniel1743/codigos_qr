import { useCallback, useEffect, useRef } from 'react';

/**
 * Direct Manipulation Pinch Zoom
 *
 * PRINCIPLE: Finger is the only source of truth during gesture
 *
 * - NO React state updates during gesture
 * - Direct DOM transform manipulation
 * - Immediate response to finger movement
 * - Scale commits to state only after finger lift
 */

interface UsePinchZoomDirectOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  onScaleChange?: (scale: number) => void;
}

interface PinchState {
  active: boolean;
  initialDistance: number;
  initialScale: number;
  startX: number;
  startY: number;
}

export function usePinchZoomDirect({
  minScale = 0.4,
  maxScale = 3.0,
  initialScale = 1.0,
  onScaleChange,
}: UsePinchZoomDirectOptions = {}) {
  const elementRef = useRef<HTMLElement | null>(null);
  const currentScale = useRef(initialScale);
  const pinchState = useRef<PinchState>({
    active: false,
    initialDistance: 0,
    initialScale: initialScale,
    startX: 0,
    startY: 0,
  });
  const activePointers = useRef<Map<number, Touch>>(new Map());

  const clamp = useCallback((value: number) => {
    return Math.max(minScale, Math.min(maxScale, value));
  }, [minScale, maxScale]);

  const getDistance = (t1: Touch, t2: Touch): number => {
    const dx = t2.clientX - t1.clientX;
    const dy = t2.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const applyTransform = useCallback((scale: number) => {
    if (!elementRef.current) return;

    const clampedScale = clamp(scale);
    currentScale.current = clampedScale;

    // Direct DOM manipulation - no React re-render
    elementRef.current.style.transform = `scale(${clampedScale})`;
  }, [clamp]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Store all active touches
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch) {
        activePointers.current.set(touch.identifier, touch);
      }
    }

    // Start pinch when 2 fingers detected
    if (activePointers.current.size === 2) {
      const touches = Array.from(activePointers.current.values());
      const t1 = touches[0];
      const t2 = touches[1];

      if (t1 && t2) {
        pinchState.current = {
          active: true,
          initialDistance: getDistance(t1, t2),
          initialScale: currentScale.current,
          startX: (t1.clientX + t2.clientX) / 2,
          startY: (t1.clientY + t2.clientY) / 2,
        };

        // Prevent native pinch zoom
        e.preventDefault();
      }
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pinchState.current.active) return;
    if (activePointers.current.size !== 2) return;

    // Update pointer positions
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch && activePointers.current.has(touch.identifier)) {
        activePointers.current.set(touch.identifier, touch);
      }
    }

    const touches = Array.from(activePointers.current.values());
    const t1 = touches[0];
    const t2 = touches[1];
    if (!t1 || !t2) return;

    const currentDistance = getDistance(t1, t2);

    // DIRECT MANIPULATION: scale proportional to finger distance
    const ratio = currentDistance / pinchState.current.initialDistance;
    const newScale = pinchState.current.initialScale * ratio;

    // Apply immediately to DOM
    applyTransform(newScale);

    // Prevent native behavior
    e.preventDefault();
  }, [applyTransform]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    // Remove ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch) {
        activePointers.current.delete(touch.identifier);
      }
    }

    // End pinch when less than 2 fingers
    if (activePointers.current.size < 2 && pinchState.current.active) {
      pinchState.current.active = false;

      // Commit final scale to state (after gesture ends)
      onScaleChange?.(currentScale.current);
    }
  }, [onScaleChange]);

  const handleTouchCancel = useCallback((e: TouchEvent) => {
    // Same as touchend
    handleTouchEnd(e);
  }, [handleTouchEnd]);

  const attachTo = useCallback((element: HTMLElement | null) => {
    // Detach from previous element
    if (elementRef.current) {
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      elementRef.current.removeEventListener('touchcancel', handleTouchCancel);
      elementRef.current.style.touchAction = '';
    }

    elementRef.current = element;

    if (element) {
      // Disable native pinch zoom
      element.style.touchAction = 'pan-y';

      // Attach listeners (non-passive to allow preventDefault)
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: false });
      element.addEventListener('touchcancel', handleTouchCancel, { passive: false });

      // Set initial transform
      applyTransform(initialScale);
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, applyTransform, initialScale]);

  // Programmatic zoom (for buttons or reset)
  const setScale = useCallback((scale: number) => {
    applyTransform(scale);
    onScaleChange?.(currentScale.current);
  }, [applyTransform, onScaleChange]);

  // Update scale when initialScale prop changes
  useEffect(() => {
    if (!pinchState.current.active) {
      applyTransform(initialScale);
    }
  }, [initialScale, applyTransform]);

  return {
    attachTo,
    setScale,
    getCurrentScale: () => currentScale.current,
    isPinching: pinchState.current.active,
  };
}
