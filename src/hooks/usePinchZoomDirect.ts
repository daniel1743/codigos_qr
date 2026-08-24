import { useCallback, useEffect, useRef } from "react";

interface UsePinchZoomDirectOptions {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  baseScale?: number;
  onScaleChange?: (scale: number) => void;
}

interface GestureState {
  mode: "none" | "pan" | "pinch";
  initialDistance: number;
  initialScale: number;
  initialX: number;
  initialY: number;
  startX: number;
  startY: number;
}

interface Point {
  x: number;
  y: number;
}

export function usePinchZoomDirect({
  minScale = 0.4,
  maxScale = 3.0,
  initialScale = 1.0,
  baseScale = initialScale,
  onScaleChange,
}: UsePinchZoomDirectOptions = {}) {
  const viewportRef = useRef<HTMLElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const currentScale = useRef(initialScale);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const baseScaleRef = useRef(baseScale);
  const activeTouches = useRef<Map<number, Touch>>(new Map());
  const gesture = useRef<GestureState>({
    mode: "none",
    initialDistance: 0,
    initialScale,
    initialX: 0,
    initialY: 0,
    startX: 0,
    startY: 0,
  });

  const clamp = useCallback(
    (value: number) => Math.max(minScale, Math.min(maxScale, value)),
    [maxScale, minScale],
  );

  const getDistance = (t1: Touch, t2: Touch): number => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const getCenter = (t1: Touch, t2: Touch): Point => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const getRelativeToViewportCenter = (point: Point): Point => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    return {
      x: point.x - rect.left - rect.width / 2,
      y: point.y - rect.top - rect.height / 2,
    };
  };

  const getBounds = useCallback((scale: number): Point => {
    const viewport = viewportRef.current;
    const target = targetRef.current;
    if (!viewport || !target) return { x: 0, y: 0 };

    const viewportRect = viewport.getBoundingClientRect();
    const scaledWidth = target.offsetWidth * scale;
    const scaledHeight = target.offsetHeight * scale;
    const inspectAllowance = 48;

    return {
      x: Math.max(0, (scaledWidth - viewportRect.width) / 2 + inspectAllowance),
      y: Math.max(0, (scaledHeight - viewportRect.height) / 2 + inspectAllowance),
    };
  }, []);

  const clampTranslate = useCallback(
    (x: number, y: number, scale: number): Point => {
      const bounds = getBounds(scale);
      return {
        x: Math.max(-bounds.x, Math.min(bounds.x, x)),
        y: Math.max(-bounds.y, Math.min(bounds.y, y)),
      };
    },
    [getBounds],
  );

  const applyTransform = useCallback(
    (scale: number, x = currentX.current, y = currentY.current) => {
      const target = targetRef.current;
      if (!target) return;

      const clampedScale = clamp(scale);
      const nextTranslate = clampTranslate(x, y, clampedScale);

      currentScale.current = clampedScale;
      currentX.current = nextTranslate.x;
      currentY.current = nextTranslate.y;
      target.style.transform = `translate3d(${nextTranslate.x}px, ${nextTranslate.y}px, 0) scale(${clampedScale})`;
    },
    [clamp, clampTranslate],
  );

  const syncTouches = (touches: TouchList) => {
    const liveTouchIds = new Set<number>();
    for (let index = 0; index < touches.length; index += 1) {
      const touch = touches[index];
      if (touch) {
        liveTouchIds.add(touch.identifier);
        activeTouches.current.set(touch.identifier, touch);
      }
    }
    for (const touchId of activeTouches.current.keys()) {
      if (!liveTouchIds.has(touchId)) {
        activeTouches.current.delete(touchId);
      }
    }
  };

  const getTwoTouches = (): [Touch, Touch] | null => {
    const touches = Array.from(activeTouches.current.values());
    const first = touches[0];
    const second = touches[1];
    if (!first || !second) return null;
    return [first, second];
  };

  const beginPan = useCallback((touch: Touch) => {
    gesture.current = {
      mode: "pan",
      initialDistance: 0,
      initialScale: currentScale.current,
      initialX: currentX.current,
      initialY: currentY.current,
      startX: touch.clientX,
      startY: touch.clientY,
    };
  }, []);

  const beginPinch = useCallback((t1: Touch, t2: Touch) => {
    const center = getRelativeToViewportCenter(getCenter(t1, t2));
    gesture.current = {
      mode: "pinch",
      initialDistance: Math.max(1, getDistance(t1, t2)),
      initialScale: currentScale.current,
      initialX: currentX.current,
      initialY: currentY.current,
      startX: center.x,
      startY: center.y,
    };
  }, []);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      syncTouches(event.touches);

      const twoTouches = getTwoTouches();
      if (twoTouches) {
        beginPinch(twoTouches[0], twoTouches[1]);
        event.preventDefault();
        return;
      }

      const firstTouch = Array.from(activeTouches.current.values())[0];
      if (firstTouch && currentScale.current > baseScaleRef.current + 0.01) {
        beginPan(firstTouch);
      }
    },
    [beginPan, beginPinch],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      syncTouches(event.touches);

      if (activeTouches.current.size >= 2) {
        const touches = getTwoTouches();
        if (!touches) return;

        if (gesture.current.mode !== "pinch") {
          beginPinch(touches[0], touches[1]);
        }

        const center = getRelativeToViewportCenter(getCenter(touches[0], touches[1]));
        const nextScale = clamp(
          gesture.current.initialScale *
            (getDistance(touches[0], touches[1]) / Math.max(1, gesture.current.initialDistance)),
        );
        const scaleRatio = nextScale / Math.max(0.001, gesture.current.initialScale);
        const nextX = center.x - (gesture.current.startX - gesture.current.initialX) * scaleRatio;
        const nextY = center.y - (gesture.current.startY - gesture.current.initialY) * scaleRatio;

        applyTransform(nextScale, nextX, nextY);
        event.preventDefault();
        return;
      }

      const touch = Array.from(activeTouches.current.values())[0];
      if (!touch || currentScale.current <= baseScaleRef.current + 0.01) return;

      if (gesture.current.mode !== "pan") {
        beginPan(touch);
      }

      const nextX = gesture.current.initialX + touch.clientX - gesture.current.startX;
      const nextY = gesture.current.initialY + touch.clientY - gesture.current.startY;
      applyTransform(currentScale.current, nextX, nextY);
      event.preventDefault();
    },
    [applyTransform, beginPan, beginPinch, clamp],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      for (let index = 0; index < event.changedTouches.length; index += 1) {
        const touch = event.changedTouches[index];
        if (touch) activeTouches.current.delete(touch.identifier);
      }

      if (activeTouches.current.size >= 2) {
        const touches = getTwoTouches();
        if (touches) beginPinch(touches[0], touches[1]);
        return;
      }

      const remainingTouch = Array.from(activeTouches.current.values())[0];
      if (remainingTouch && currentScale.current > baseScaleRef.current + 0.01) {
        beginPan(remainingTouch);
      } else {
        gesture.current.mode = "none";
      }

      onScaleChange?.(currentScale.current);
    },
    [beginPan, beginPinch, onScaleChange],
  );

  const attachTo = useCallback(
    (viewport: HTMLElement | null, target?: HTMLElement | null) => {
      if (viewportRef.current) {
        viewportRef.current.removeEventListener("touchstart", handleTouchStart);
        viewportRef.current.removeEventListener("touchmove", handleTouchMove);
        viewportRef.current.removeEventListener("touchend", handleTouchEnd);
        viewportRef.current.removeEventListener("touchcancel", handleTouchEnd);
        viewportRef.current.style.touchAction = "";
      }

      viewportRef.current = viewport;
      targetRef.current = target || viewport;

      if (viewport && targetRef.current) {
        viewport.style.touchAction = "none";
        viewport.addEventListener("touchstart", handleTouchStart, { passive: false });
        viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
        viewport.addEventListener("touchend", handleTouchEnd, { passive: false });
        viewport.addEventListener("touchcancel", handleTouchEnd, { passive: false });
        applyTransform(initialScale, currentX.current, currentY.current);
      }
    },
    [applyTransform, handleTouchEnd, handleTouchMove, handleTouchStart, initialScale],
  );

  const setScale = useCallback(
    (scale: number) => {
      applyTransform(scale, 0, 0);
      onScaleChange?.(currentScale.current);
    },
    [applyTransform, onScaleChange],
  );

  const setBaseScale = useCallback(
    (scale: number) => {
      baseScaleRef.current = clamp(scale);
      if (currentScale.current <= baseScaleRef.current + 0.01) {
        applyTransform(currentScale.current, 0, 0);
      } else {
        applyTransform(currentScale.current, currentX.current, currentY.current);
      }
    },
    [applyTransform, clamp],
  );

  useEffect(() => {
    baseScaleRef.current = clamp(baseScale);
  }, [baseScale, clamp]);

  useEffect(() => {
    if (gesture.current.mode === "none") {
      applyTransform(initialScale, currentX.current, currentY.current);
    }
  }, [applyTransform, initialScale]);

  return {
    attachTo,
    setScale,
    setBaseScale,
    getCurrentScale: () => currentScale.current,
    getCurrentPan: () => ({ x: currentX.current, y: currentY.current }),
  };
}
