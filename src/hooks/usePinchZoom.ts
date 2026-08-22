import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pinch Zoom Hook - Premium Mobile UX
 *
 * Direct manipulation rules:
 * - scale = actualScaleAtGestureStart * currentDistance / initialDistance
 * - native browser pinch is disabled on the target to avoid pointercancel races
 * - programmatic zoom changes are synchronized into the gesture base
 */

interface FocalPoint {
  x: number;
  y: number;
}

interface UsePinchZoomOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  onZoomStart?: () => void;
  onZoomEnd?: () => void;
  onZoomChange?: (scale: number, focalPoint: FocalPoint) => void;
}

interface PinchState {
  isPinching: boolean;
  initialDistance: number;
  initialScale: number;
  currentScale: number;
  focalPoint: FocalPoint;
}

const DEFAULT_FOCAL_POINT: FocalPoint = { x: 0, y: 0 };

export function usePinchZoom({
  minScale = 0.45,
  maxScale = 3.0,
  initialScale = 1.0,
  onZoomStart,
  onZoomEnd,
  onZoomChange,
}: UsePinchZoomOptions = {}) {
  const clampScale = useCallback(
    (scale: number): number => Math.max(minScale, Math.min(maxScale, scale)),
    [maxScale, minScale],
  );

  const pinchState = useRef<PinchState>({
    isPinching: false,
    initialDistance: 0,
    initialScale: clampScale(initialScale),
    currentScale: clampScale(initialScale),
    focalPoint: DEFAULT_FOCAL_POINT,
  });
  const activePointers = useRef<Map<number, PointerEvent>>(new Map());
  const targetElement = useRef<HTMLElement | null>(null);
  const [isPinching, setIsPinching] = useState(false);

  const getDistance = (p1: PointerEvent, p2: PointerEvent): number => {
    const dx = p2.clientX - p1.clientX;
    const dy = p2.clientY - p1.clientY;
    return Math.hypot(dx, dy);
  };

  const getFocalPoint = (p1: PointerEvent, p2: PointerEvent): FocalPoint => ({
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2,
  });

  const getTwoPointers = (): [PointerEvent, PointerEvent] | null => {
    const pointers = Array.from(activePointers.current.values());
    const first = pointers[0];
    const second = pointers[1];
    if (!first || !second) return null;
    return [first, second];
  };

  const syncScale = useCallback(
    (scale: number) => {
      const clampedScale = clampScale(scale);
      pinchState.current.currentScale = clampedScale;
      if (!pinchState.current.isPinching) {
        pinchState.current.initialScale = clampedScale;
      }
      return clampedScale;
    },
    [clampScale],
  );

  useEffect(() => {
    syncScale(initialScale);
  }, [initialScale, syncScale]);

  const endPinch = useCallback(() => {
    if (!pinchState.current.isPinching) return;
    pinchState.current.isPinching = false;
    pinchState.current.initialScale = pinchState.current.currentScale;
    setIsPinching(false);
    onZoomEnd?.();
  }, [onZoomEnd]);

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      activePointers.current.set(event.pointerId, event);
      targetElement.current?.setPointerCapture?.(event.pointerId);

      const pointers = getTwoPointers();
      if (!pointers) return;

      event.preventDefault();
      const [p1, p2] = pointers;
      pinchState.current = {
        isPinching: true,
        initialDistance: Math.max(1, getDistance(p1, p2)),
        initialScale: pinchState.current.currentScale,
        currentScale: pinchState.current.currentScale,
        focalPoint: getFocalPoint(p1, p2),
      };
      setIsPinching(true);
      onZoomStart?.();
    },
    [onZoomStart],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!activePointers.current.has(event.pointerId)) return;
      activePointers.current.set(event.pointerId, event);

      if (activePointers.current.size !== 2 || !pinchState.current.isPinching) return;
      const pointers = getTwoPointers();
      if (!pointers) return;

      event.preventDefault();
      const [p1, p2] = pointers;
      const currentDistance = Math.max(1, getDistance(p1, p2));
      const nextScale = clampScale(
        pinchState.current.initialScale *
          (currentDistance / Math.max(1, pinchState.current.initialDistance)),
      );
      const focalPoint = getFocalPoint(p1, p2);

      pinchState.current.currentScale = nextScale;
      pinchState.current.focalPoint = focalPoint;
      onZoomChange?.(nextScale, focalPoint);
    },
    [clampScale, onZoomChange],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      activePointers.current.delete(event.pointerId);
      targetElement.current?.releasePointerCapture?.(event.pointerId);
      if (activePointers.current.size < 2) endPinch();
    },
    [endPinch],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent) => {
      activePointers.current.delete(event.pointerId);
      if (activePointers.current.size < 2) endPinch();
    },
    [endPinch],
  );

  const attachToElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return () => {};

      targetElement.current = element;
      const previousTouchAction = element.style.touchAction;
      element.style.touchAction = "pan-y";

      element.addEventListener("pointerdown", handlePointerDown, { passive: false });
      element.addEventListener("pointermove", handlePointerMove, { passive: false });
      element.addEventListener("pointerup", handlePointerUp);
      element.addEventListener("pointercancel", handlePointerCancel);

      return () => {
        element.style.touchAction = previousTouchAction;
        element.removeEventListener("pointerdown", handlePointerDown);
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerup", handlePointerUp);
        element.removeEventListener("pointercancel", handlePointerCancel);
        activePointers.current.clear();
        targetElement.current = null;
        endPinch();
      };
    },
    [endPinch, handlePointerCancel, handlePointerDown, handlePointerMove, handlePointerUp],
  );

  const resetZoom = useCallback(() => {
    const clampedScale = syncScale(initialScale);
    onZoomChange?.(clampedScale, pinchState.current.focalPoint);
  }, [initialScale, onZoomChange, syncScale]);

  const setZoom = useCallback(
    (scale: number) => {
      const clampedScale = syncScale(scale);
      onZoomChange?.(clampedScale, pinchState.current.focalPoint);
    },
    [onZoomChange, syncScale],
  );

  return {
    attachToElement,
    isPinching,
    currentScale: pinchState.current.currentScale,
    focalPoint: pinchState.current.focalPoint,
    resetZoom,
    setZoom,
  };
}
