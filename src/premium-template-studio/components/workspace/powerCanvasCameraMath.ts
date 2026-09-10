export const POWER_CANVAS_OVERSCAN = 48;
export const POWER_CANVAS_HORIZONTAL_PADDING = 64;
export const POWER_CANVAS_VERTICAL_PADDING = 64;
export const POWER_CANVAS_MIN_ZOOM = 0.35;
export const POWER_CANVAS_MIN_USER_ZOOM = 0.6;
export const POWER_CANVAS_MAX_USER_ZOOM = 3;
export const POWER_CANVAS_ZOOM_STEP = 1.1;
// Minimum meaningful pinch ratio change. Finger distance below this relative
// change (sub-pixel jitter) is treated as "no zoom", so a pure two-finger
// translation never produces spurious scale drift or re-render churn.
export const POWER_CANVAS_PINCH_RATIO_EPSILON = 0.01;

export interface PowerCanvasDimensions {
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
}

export interface PowerCanvasStageGeometry {
  stageWidth: number;
  stageHeight: number;
  originX: number;
  originY: number;
  scaledContentWidth: number;
  scaledContentHeight: number;
}

export interface PowerCanvasScrollPosition {
  scrollLeft: number;
  scrollTop: number;
}

export interface PowerCanvasAnchorPoint {
  x: number;
  y: number;
}

function finiteDimension(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateFitZoom({
  viewportWidth,
  viewportHeight,
  contentWidth,
  contentHeight,
}: PowerCanvasDimensions): number {
  const safeViewportWidth = finiteDimension(viewportWidth);
  const safeViewportHeight = finiteDimension(viewportHeight);
  const safeContentWidth = finiteDimension(contentWidth);
  const safeContentHeight = finiteDimension(contentHeight);

  if (
    safeViewportWidth === 0 ||
    safeViewportHeight === 0 ||
    safeContentWidth === 0 ||
    safeContentHeight === 0
  ) {
    return 1;
  }

  const availableWidth = Math.max(1, safeViewportWidth - POWER_CANVAS_HORIZONTAL_PADDING);
  const availableHeight = Math.max(1, safeViewportHeight - POWER_CANVAS_VERTICAL_PADDING);
  return clamp(
    Math.min(availableWidth / safeContentWidth, availableHeight / safeContentHeight, 1),
    POWER_CANVAS_MIN_ZOOM,
    1,
  );
}

export function calculateEffectiveScale(fitZoom: number, userZoom: number): number {
  const safeFitZoom = clamp(
    Number.isFinite(fitZoom) && fitZoom > 0 ? fitZoom : 1,
    POWER_CANVAS_MIN_ZOOM,
    1,
  );
  const safeUserZoom = clamp(
    Number.isFinite(userZoom) && userZoom > 0 ? userZoom : 1,
    POWER_CANVAS_MIN_USER_ZOOM,
    POWER_CANVAS_MAX_USER_ZOOM,
  );
  return clamp(
    safeFitZoom * safeUserZoom,
    POWER_CANVAS_MIN_ZOOM,
    Math.max(POWER_CANVAS_MIN_ZOOM, safeFitZoom * POWER_CANVAS_MAX_USER_ZOOM),
  );
}

export function calculateStageGeometry(
  dimensions: PowerCanvasDimensions,
  scale: number,
): PowerCanvasStageGeometry {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  // Stage dimensions derive ONLY from intrinsic content dimensions and the
  // effective scale. They must NOT depend on viewport clientWidth/clientHeight,
  // because viewport size depends on scrollbar visibility, which depends on
  // Stage size — reintroducing that dependency creates a scrollbar↔geometry
  // feedback loop (growing scrollWidth/scrollHeight, shrinking thumb).
  const scaledContentWidth = Math.max(1, finiteDimension(dimensions.contentWidth)) * safeScale;
  const scaledContentHeight = Math.max(1, finiteDimension(dimensions.contentHeight)) * safeScale;

  return {
    stageWidth: scaledContentWidth,
    stageHeight: scaledContentHeight,
    originX: 0,
    originY: 0,
    scaledContentWidth,
    scaledContentHeight,
  };
}

export function calculateMaxScroll(
  dimensions: Pick<PowerCanvasDimensions, "viewportWidth" | "viewportHeight">,
  stage: Pick<PowerCanvasStageGeometry, "stageWidth" | "stageHeight">,
): PowerCanvasScrollPosition {
  return {
    scrollLeft: Math.max(
      0,
      finiteDimension(stage.stageWidth) - finiteDimension(dimensions.viewportWidth),
    ),
    scrollTop: Math.max(
      0,
      finiteDimension(stage.stageHeight) - finiteDimension(dimensions.viewportHeight),
    ),
  };
}

export function clampScrollPosition(
  scroll: PowerCanvasScrollPosition,
  dimensions: Pick<PowerCanvasDimensions, "viewportWidth" | "viewportHeight">,
  stage: Pick<PowerCanvasStageGeometry, "stageWidth" | "stageHeight">,
): PowerCanvasScrollPosition {
  const maxScroll = calculateMaxScroll(dimensions, stage);
  return {
    scrollLeft: clamp(
      Number.isFinite(scroll.scrollLeft) ? scroll.scrollLeft : 0,
      0,
      maxScroll.scrollLeft,
    ),
    scrollTop: clamp(
      Number.isFinite(scroll.scrollTop) ? scroll.scrollTop : 0,
      0,
      maxScroll.scrollTop,
    ),
  };
}

export function calculateFocalZoomScroll({
  dimensions,
  oldStage,
  newStage,
  oldScale,
  newScale,
  currentScroll,
  anchor,
}: {
  dimensions: PowerCanvasDimensions;
  oldStage: PowerCanvasStageGeometry;
  newStage: PowerCanvasStageGeometry;
  oldScale: number;
  newScale: number;
  currentScroll: PowerCanvasScrollPosition;
  anchor: PowerCanvasAnchorPoint;
}): PowerCanvasScrollPosition {
  const safeOldScale = Number.isFinite(oldScale) && oldScale > 0 ? oldScale : 1;
  const safeNewScale = Number.isFinite(newScale) && newScale > 0 ? newScale : safeOldScale;
  const safeAnchor = {
    x: Number.isFinite(anchor.x) ? anchor.x : finiteDimension(dimensions.viewportWidth) / 2,
    y: Number.isFinite(anchor.y) ? anchor.y : finiteDimension(dimensions.viewportHeight) / 2,
  };
  const safeCurrentScroll = clampScrollPosition(currentScroll, dimensions, oldStage);
  const worldX = (safeCurrentScroll.scrollLeft + safeAnchor.x - oldStage.originX) / safeOldScale;
  const worldY = (safeCurrentScroll.scrollTop + safeAnchor.y - oldStage.originY) / safeOldScale;

  return clampScrollPosition(
    {
      scrollLeft: newStage.originX + worldX * safeNewScale - safeAnchor.x,
      scrollTop: newStage.originY + worldY * safeNewScale - safeAnchor.y,
    },
    dimensions,
    newStage,
  );
}

export interface PowerCanvasPinchGesture {
  startDistance: number;
  currentDistance: number;
  startCentroid: PowerCanvasAnchorPoint;
  currentCentroid: PowerCanvasAnchorPoint;
}

export interface PowerCanvasPinchCameraInput {
  gesture: PowerCanvasPinchGesture;
  startUserZoom: number;
  startScroll: PowerCanvasScrollPosition;
  fitZoom: number;
  dimensions: PowerCanvasDimensions;
}

export interface PowerCanvasPinchCameraResult {
  userZoom: number;
  scale: number;
  scroll: PowerCanvasScrollPosition;
}

/**
 * Compute the next camera from a two-finger pinch/pan gesture in one coherent
 * correction. Zoom derives from the ratio of pointer distance; pan derives from
 * centroid movement. A single world point (the one under the start centroid)
 * is kept anchored under the moving centroid, so the element being pinched
 * stays approximately under the fingers instead of flying away.
 *
 * This is the scroll-space equivalent of the stabilized Basic Editor pinch
 * (`startScale * (distance/startDistance)` with centroid-anchored translation).
 */
export function calculatePinchCamera(
  input: PowerCanvasPinchCameraInput,
): PowerCanvasPinchCameraResult {
  const { gesture, startUserZoom, startScroll, fitZoom, dimensions } = input;

  const safeStartDistance = Number.isFinite(gesture.startDistance)
    ? Math.max(1, gesture.startDistance)
    : 1;
  const safeCurrentDistance = Number.isFinite(gesture.currentDistance)
    ? Math.max(0, gesture.currentDistance)
    : safeStartDistance;
  const rawRatio = safeCurrentDistance / safeStartDistance;

  // Absorb sub-pixel finger jitter: a pure two-finger translation keeps the
  // distance (nearly) constant, so snap tiny ratio deviations to 1 and avoid
  // spurious scale drift / oscillation during pan.
  const ratio = Math.abs(rawRatio - 1) < POWER_CANVAS_PINCH_RATIO_EPSILON ? 1 : rawRatio;

  const userZoom = clamp(
    startUserZoom * ratio,
    POWER_CANVAS_MIN_USER_ZOOM,
    POWER_CANVAS_MAX_USER_ZOOM,
  );

  const startScale = calculateEffectiveScale(fitZoom, startUserZoom);
  const scale = calculateEffectiveScale(fitZoom, userZoom);
  const scaleRatio = startScale > 0 ? scale / startScale : 1;

  const nextStage = calculateStageGeometry(dimensions, scale);

  // Keep the world point under the start centroid anchored under the CURRENT
  // centroid. `(startScroll + startCentroid) / startScale` is the world point;
  // at `scale` it should sit at `currentCentroid`, which also carries the
  // centroid-movement (two-finger pan) contribution.
  const scroll = clampScrollPosition(
    {
      scrollLeft: (startScroll.scrollLeft + gesture.startCentroid.x) * scaleRatio - gesture.currentCentroid.x,
      scrollTop: (startScroll.scrollTop + gesture.startCentroid.y) * scaleRatio - gesture.currentCentroid.y,
    },
    dimensions,
    nextStage,
  );

  return { userZoom, scale, scroll };
}

export function calculatePanScroll({
  startScroll,
  deltaX,
  deltaY,
  dimensions,
  stage,
}: {
  startScroll: PowerCanvasScrollPosition;
  deltaX: number;
  deltaY: number;
  dimensions: Pick<PowerCanvasDimensions, "viewportWidth" | "viewportHeight">;
  stage: Pick<PowerCanvasStageGeometry, "stageWidth" | "stageHeight">;
}): PowerCanvasScrollPosition {
  return clampScrollPosition(
    {
      scrollLeft: startScroll.scrollLeft - (Number.isFinite(deltaX) ? deltaX : 0),
      scrollTop: startScroll.scrollTop - (Number.isFinite(deltaY) ? deltaY : 0),
    },
    dimensions,
    stage,
  );
}
