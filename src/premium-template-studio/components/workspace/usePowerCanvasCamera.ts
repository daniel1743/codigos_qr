import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  calculateEffectiveScale,
  calculateFitZoom,
  calculateStageGeometry,
  clamp,
  POWER_CANVAS_MAX_USER_ZOOM,
  POWER_CANVAS_MIN_USER_ZOOM,
  POWER_CANVAS_ZOOM_STEP,
} from "./powerCanvasCameraMath";

export interface PowerCanvasCameraState {
  fitZoom: number;
  userZoom: number;
  scale: number;
  translateX: number;
  translateY: number;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
}

export interface PowerCanvasCameraControls {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  reset: () => void;
}

export interface PowerCanvasCameraResult {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  camera: PowerCanvasCameraState;
  stage: ReturnType<typeof calculateStageGeometry>;
  controls: PowerCanvasCameraControls;
}

interface MeasuredSize {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
}

const INITIAL_SIZE: MeasuredSize = {
  viewportWidth: 0,
  viewportHeight: 0,
  contentWidth: 0,
  contentHeight: 0,
};

function measure(viewport: HTMLDivElement | null, content: HTMLDivElement | null): MeasuredSize {
  if (!viewport || !content) return INITIAL_SIZE;
  return {
    viewportWidth: viewport.clientWidth,
    viewportHeight: viewport.clientHeight,
    // scrollWidth/scrollHeight and offsetWidth/offsetHeight are layout-space
    // measurements. getBoundingClientRect() is intentionally excluded because
    // it includes the camera transform and would feed scaled geometry back as
    // intrinsic content, creating a resize/scale feedback loop.
    contentWidth: Math.max(content.scrollWidth, content.offsetWidth),
    contentHeight: Math.max(content.scrollHeight, content.offsetHeight),
  };
}

function sameSize(a: MeasuredSize, b: MeasuredSize): boolean {
  return (
    a.viewportWidth === b.viewportWidth &&
    a.viewportHeight === b.viewportHeight &&
    a.contentWidth === b.contentWidth &&
    a.contentHeight === b.contentHeight
  );
}

export function usePowerCanvasCamera(): PowerCanvasCameraResult {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<MeasuredSize>(INITIAL_SIZE);
  const [userZoom, setUserZoom] = useState(1);

  const measureNow = useCallback(() => {
    const next = measure(viewportRef.current, contentRef.current);
    setSize((previous) => (sameSize(previous, next) ? previous : next));
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || typeof ResizeObserver === "undefined") return;

    let callbackCount = 0;
    const observer = new ResizeObserver(() => {
      callbackCount += 1;
      if (import.meta.env.DEV) {
        viewport.dataset["cameraResizeObserverCallbacks"] = String(callbackCount);
      }
      measureNow();
    });
    observer.observe(viewport);
    observer.observe(content);
    measureNow();
    return () => {
      observer.disconnect();
      if (import.meta.env.DEV) {
        delete viewport.dataset["cameraResizeObserverCallbacks"];
      }
    };
  }, [measureNow]);

  const fitZoom = calculateFitZoom(size);
  const scale = calculateEffectiveScale(fitZoom, userZoom);
  const stage = useMemo(() => calculateStageGeometry(size, scale), [size, scale]);

  const updateUserZoom = useCallback((next: number) => {
    setUserZoom(clamp(next, POWER_CANVAS_MIN_USER_ZOOM, POWER_CANVAS_MAX_USER_ZOOM));
  }, []);

  const controls = useMemo<PowerCanvasCameraControls>(
    () => ({
      zoomIn: () => updateUserZoom(userZoom * POWER_CANVAS_ZOOM_STEP),
      zoomOut: () => updateUserZoom(userZoom / POWER_CANVAS_ZOOM_STEP),
      fit: () => {
        setUserZoom(1);
      },
      reset: () => {
        setUserZoom(1);
      },
    }),
    [updateUserZoom, userZoom],
  );

  return {
    viewportRef,
    contentRef,
    camera: {
      fitZoom,
      userZoom,
      scale,
      translateX: 0,
      translateY: 0,
      viewportWidth: size.viewportWidth,
      viewportHeight: size.viewportHeight,
      contentWidth: size.contentWidth,
      contentHeight: size.contentHeight,
    },
    stage,
    controls,
  };
}
