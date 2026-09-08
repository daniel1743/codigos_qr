import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent, PointerEvent, RefObject, WheelEvent } from "react";
import {
  calculateEffectiveScale,
  calculateFitZoom,
  calculateFocalZoomScroll,
  calculatePanScroll,
  calculateStageGeometry,
  clampScrollPosition,
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

export interface PowerCanvasCameraInteraction {
  isPanReady: boolean;
  isPanning: boolean;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
  onClickCapture: (event: MouseEvent<HTMLDivElement>) => void;
}

export interface PowerCanvasCameraResult {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  camera: PowerCanvasCameraState;
  stage: ReturnType<typeof calculateStageGeometry>;
  controls: PowerCanvasCameraControls;
  interaction: PowerCanvasCameraInteraction;
}

interface MeasuredSize {
  viewportWidth: number;
  viewportHeight: number;
  viewportOuterWidth: number;
  viewportOuterHeight: number;
  contentWidth: number;
  contentHeight: number;
}

const INITIAL_SIZE: MeasuredSize = {
  viewportWidth: 0,
  viewportHeight: 0,
  viewportOuterWidth: 0,
  viewportOuterHeight: 0,
  contentWidth: 0,
  contentHeight: 0,
};
const PAN_CLICK_SUPPRESSION_THRESHOLD = 3;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

function measure(viewport: HTMLDivElement | null, content: HTMLDivElement | null): MeasuredSize {
  if (!viewport || !content) return INITIAL_SIZE;
  return {
    viewportWidth: viewport.clientWidth,
    viewportHeight: viewport.clientHeight,
    // offsetWidth/offsetHeight include the scrollbar, so they remain stable when a
    // scrollbar appears/disappears, whereas clientWidth/clientHeight shrink/grow by
    // the scrollbar width. fitZoom must use the stable (outer) size so effectiveScale
    // does not bounce when zooming crosses the scrollbar threshold. Scroll clamping
    // keeps using clientWidth/clientHeight (the true scrollport).
    viewportOuterWidth: viewport.offsetWidth,
    viewportOuterHeight: viewport.offsetHeight,
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
    a.viewportOuterWidth === b.viewportOuterWidth &&
    a.viewportOuterHeight === b.viewportOuterHeight &&
    a.contentWidth === b.contentWidth &&
    a.contentHeight === b.contentHeight
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, button, [contenteditable=''], [contenteditable='true']",
    ),
  );
}

export function usePowerCanvasCamera(): PowerCanvasCameraResult {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<MeasuredSize>(INITIAL_SIZE);
  const [userZoom, setUserZoom] = useState(1);
  const [isPanReady, setIsPanReady] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const pointerInsideViewportRef = useRef(false);
  const pendingScrollRef = useRef<{ scrollLeft: number; scrollTop: number } | null>(null);
  const panSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

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

  // fitZoom uses the scrollbar-stable outer viewport size so that zooming across
  // the scrollbar threshold does not change fitZoom and bounce effectiveScale.
  const fitZoom = calculateFitZoom({
    viewportWidth: size.viewportOuterWidth,
    viewportHeight: size.viewportOuterHeight,
    contentWidth: size.contentWidth,
    contentHeight: size.contentHeight,
  });
  const scale = calculateEffectiveScale(fitZoom, userZoom);
  const stage = useMemo(() => calculateStageGeometry(size, scale), [size, scale]);

  useLayoutEffect(() => {
    const pendingScroll = pendingScrollRef.current;
    const viewport = viewportRef.current;
    if (!pendingScroll || !viewport) return;
    pendingScrollRef.current = null;
    viewport.scrollLeft = pendingScroll.scrollLeft;
    viewport.scrollTop = pendingScroll.scrollTop;
  }, [scale, stage.stageHeight, stage.stageWidth]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const bounded = clampScrollPosition(
      { scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop },
      size,
      stage,
    );
    if (bounded.scrollLeft !== viewport.scrollLeft) viewport.scrollLeft = bounded.scrollLeft;
    if (bounded.scrollTop !== viewport.scrollTop) viewport.scrollTop = bounded.scrollTop;
  }, [size, stage]);

  const applyZoomAroundAnchor = useCallback(
    (nextUserZoom: number, anchor: { x: number; y: number }) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const boundedUserZoom = clamp(
        nextUserZoom,
        POWER_CANVAS_MIN_USER_ZOOM,
        POWER_CANVAS_MAX_USER_ZOOM,
      );
      const nextScale = calculateEffectiveScale(fitZoom, boundedUserZoom);
      const nextStage = calculateStageGeometry(size, nextScale);
      pendingScrollRef.current = calculateFocalZoomScroll({
        dimensions: size,
        oldStage: stage,
        newStage: nextStage,
        oldScale: scale,
        newScale: nextScale,
        currentScroll: {
          scrollLeft: viewport.scrollLeft,
          scrollTop: viewport.scrollTop,
        },
        anchor,
      });
      setUserZoom(boundedUserZoom);
    },
    [fitZoom, scale, size, stage],
  );

  const zoomAroundViewportCenter = useCallback(
    (nextUserZoom: number) => {
      applyZoomAroundAnchor(nextUserZoom, {
        x: Math.max(0, size.viewportWidth / 2),
        y: Math.max(0, size.viewportHeight / 2),
      });
    },
    [applyZoomAroundAnchor, size.viewportHeight, size.viewportWidth],
  );

  const centerStageOnNextLayout = useCallback(
    (nextScale: number) => {
      const nextStage = calculateStageGeometry(size, nextScale);
      pendingScrollRef.current = clampScrollPosition(
        {
          scrollLeft: nextStage.originX + nextStage.scaledContentWidth / 2 - size.viewportWidth / 2,
          scrollTop:
            nextStage.originY + nextStage.scaledContentHeight / 2 - size.viewportHeight / 2,
        },
        size,
        nextStage,
      );
    },
    [size],
  );

  const controls = useMemo<PowerCanvasCameraControls>(
    () => ({
      zoomIn: () => zoomAroundViewportCenter(userZoom * POWER_CANVAS_ZOOM_STEP),
      zoomOut: () => zoomAroundViewportCenter(userZoom / POWER_CANVAS_ZOOM_STEP),
      fit: () => {
        centerStageOnNextLayout(calculateEffectiveScale(fitZoom, 1));
        setUserZoom(1);
      },
      reset: () => {
        centerStageOnNextLayout(calculateEffectiveScale(fitZoom, 1));
        setUserZoom(1);
      },
    }),
    [centerStageOnNextLayout, fitZoom, userZoom, zoomAroundViewportCenter],
  );

  const endPanSession = useCallback((event?: PointerEvent<HTMLDivElement>, updateState = true) => {
    const viewport = viewportRef.current;
    const panSession = panSessionRef.current;
    const pointerId = event?.pointerId ?? panSession?.pointerId;
    if (viewport && pointerId !== undefined && viewport.hasPointerCapture(pointerId)) {
      viewport.releasePointerCapture(pointerId);
    }
    if (panSession?.moved) {
      suppressNextClickRef.current = true;
    }
    panSessionRef.current = null;
    if (updateState) setIsPanning(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || isEditableTarget(event.target)) return;
      if (pointerInsideViewportRef.current) {
        event.preventDefault();
      }
      setIsPanReady(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      setIsPanReady(false);
      endPanSession();
    };
    const onBlur = () => {
      setIsPanReady(false);
      endPanSession();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      endPanSession(undefined, false);
    };
  }, [endPanSession]);

  const interaction = useMemo<PowerCanvasCameraInteraction>(
    () => ({
      isPanReady,
      isPanning,
      onWheel: (event) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        event.stopPropagation();
        const rect = event.currentTarget.getBoundingClientRect();
        const zoomMultiplier = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
        applyZoomAroundAnchor(userZoom * zoomMultiplier, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      },
      onPointerEnter: () => {
        pointerInsideViewportRef.current = true;
      },
      onPointerLeave: () => {
        pointerInsideViewportRef.current = false;
      },
      onPointerDown: (event) => {
        if (!isPanReady || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        panSessionRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          startScrollLeft: event.currentTarget.scrollLeft,
          startScrollTop: event.currentTarget.scrollTop,
          moved: false,
        };
        setIsPanning(true);
      },
      onPointerMove: (event) => {
        const panSession = panSessionRef.current;
        if (!panSession || panSession.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const deltaX = event.clientX - panSession.startX;
        const deltaY = event.clientY - panSession.startY;
        if (!panSession.moved && Math.hypot(deltaX, deltaY) >= PAN_CLICK_SUPPRESSION_THRESHOLD) {
          panSession.moved = true;
        }
        const nextScroll = calculatePanScroll({
          startScroll: {
            scrollLeft: panSession.startScrollLeft,
            scrollTop: panSession.startScrollTop,
          },
          deltaX,
          deltaY,
          dimensions: size,
          stage,
        });
        event.currentTarget.scrollLeft = nextScroll.scrollLeft;
        event.currentTarget.scrollTop = nextScroll.scrollTop;
      },
      onPointerUp: (event) => {
        endPanSession(event);
      },
      onPointerCancel: (event) => {
        endPanSession(event);
      },
      onClickCapture: (event) => {
        if (!suppressNextClickRef.current) return;
        suppressNextClickRef.current = false;
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
      },
    }),
    [applyZoomAroundAnchor, endPanSession, isPanReady, isPanning, size, stage, userZoom],
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
    interaction,
  };
}
