import { useRef, useCallback, useEffect } from 'react';

/**
 * Pinch Zoom Hook - Premium Mobile UX
 *
 * Native-feeling pinch zoom for canvas viewport
 * Like Canva/PicsArt mobile experience
 *
 * Rules:
 * - User manipulates VIEWPORT, not template geometry
 * - Focal point preserved under fingers
 * - Smooth interpolation (60fps)
 * - Bounds checking
 */

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  onZoomStart?: () => void;
  onZoomEnd?: () => void;
  onZoomChange?: (scale: number) => void;
}

interface PinchState {
  isPinching: boolean;
  initialDistance: number;
  initialScale: number;
  currentScale: number;
  focalPoint: { x: number; y: number };
}

export function usePinchZoom({
  minScale = 0.45,
  maxScale = 3.0,
  initialScale = 1.0,
  onZoomStart,
  onZoomEnd,
  onZoomChange,
}: UsePinchZoomOptions = {}) {
  const pinchState = useRef<PinchState>({
    isPinching: false,
    initialDistance: 0,
    initialScale: initialScale,
    currentScale: initialScale,
    focalPoint: { x: 0, y: 0 },
  });

  const activePointers = useRef<Map<number, PointerEvent>>(new Map());

  /**
   * Calculate distance between two pointers
   */
  const getDistance = (p1: PointerEvent, p2: PointerEvent): number => {
    const dx = p2.clientX - p1.clientX;
    const dy = p2.clientY - p1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Calculate focal point (center between two fingers)
   */
  const getFocalPoint = (p1: PointerEvent, p2: PointerEvent): { x: number; y: number } => {
    return {
      x: (p1.clientX + p2.clientX) / 2,
      y: (p1.clientY + p2.clientY) / 2,
    };
  };

  /**
   * Clamp scale to min/max bounds
   */
  const clampScale = (scale: number): number => {
    return Math.max(minScale, Math.min(maxScale, scale));
  };

  const handlePointerDown = useCallback((e: PointerEvent) => {
    activePointers.current.set(e.pointerId, e);

    // Start pinch when 2 fingers detected
    if (activePointers.current.size === 2) {
      const pointers = Array.from(activePointers.current.values());
      const [p1, p2] = pointers;

      pinchState.current = {
        isPinching: true,
        initialDistance: getDistance(p1, p2),
        initialScale: pinchState.current.currentScale,
        currentScale: pinchState.current.currentScale,
        focalPoint: getFocalPoint(p1, p2),
      };

      onZoomStart?.();
    }
  }, [onZoomStart]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    // Update pointer position
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, e);
    }

    // Process pinch if 2 fingers active
    if (activePointers.current.size === 2 && pinchState.current.isPinching) {
      const pointers = Array.from(activePointers.current.values());
      const [p1, p2] = pointers;

      const currentDistance = getDistance(p1, p2);
      const distanceRatio = currentDistance / pinchState.current.initialDistance;

      // Calculate new scale
      const newScale = clampScale(pinchState.current.initialScale * distanceRatio);

      // Update state
      pinchState.current.currentScale = newScale;
      pinchState.current.focalPoint = getFocalPoint(p1, p2);

      // Notify change
      onZoomChange?.(newScale);
    }
  }, [onZoomChange]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    // End pinch when less than 2 fingers
    if (activePointers.current.size < 2 && pinchState.current.isPinching) {
      pinchState.current.isPinching = false;
      onZoomEnd?.();
    }
  }, [onZoomEnd]);

  const handlePointerCancel = useCallback((e: PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    if (activePointers.current.size < 2 && pinchState.current.isPinching) {
      pinchState.current.isPinching = false;
      onZoomEnd?.();
    }
  }, [onZoomEnd]);

  // Attach listeners to target element
  const attachToElement = useCallback((element: HTMLElement | null) => {
    if (!element) return () => {};

    // Set touch-action CSS for proper pinch support
    element.style.touchAction = 'pan-y pinch-zoom';

    element.addEventListener('pointerdown', handlePointerDown as any);
    element.addEventListener('pointermove', handlePointerMove as any);
    element.addEventListener('pointerup', handlePointerUp as any);
    element.addEventListener('pointercancel', handlePointerCancel as any);

    return () => {
      element.removeEventListener('pointerdown', handlePointerDown as any);
      element.removeEventListener('pointermove', handlePointerMove as any);
      element.removeEventListener('pointerup', handlePointerUp as any);
      element.removeEventListener('pointercancel', handlePointerCancel as any);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  // Reset zoom to initial scale
  const resetZoom = useCallback(() => {
    pinchState.current.currentScale = initialScale;
    onZoomChange?.(initialScale);
  }, [initialScale, onZoomChange]);

  // Programmatically set zoom
  const setZoom = useCallback((scale: number) => {
    const clampedScale = clampScale(scale);
    pinchState.current.currentScale = clampedScale;
    onZoomChange?.(clampedScale);
  }, [onZoomChange]);

  return {
    attachToElement,
    isPinching: pinchState.current.isPinching,
    currentScale: pinchState.current.currentScale,
    focalPoint: pinchState.current.focalPoint,
    resetZoom,
    setZoom,
  };
}
