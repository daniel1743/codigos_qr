export const POWER_CANVAS_OVERSCAN = 48;
export const POWER_CANVAS_HORIZONTAL_PADDING = 64;
export const POWER_CANVAS_VERTICAL_PADDING = 64;
export const POWER_CANVAS_MIN_ZOOM = 0.35;
export const POWER_CANVAS_MIN_USER_ZOOM = 0.6;
export const POWER_CANVAS_MAX_USER_ZOOM = 3;
export const POWER_CANVAS_ZOOM_STEP = 1.1;

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

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateFitZoom({
  viewportWidth,
  viewportHeight,
  contentWidth,
  contentHeight,
}: PowerCanvasDimensions): number {
  if (viewportWidth <= 0 || viewportHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return 1;
  }

  const availableWidth = Math.max(1, viewportWidth - POWER_CANVAS_HORIZONTAL_PADDING);
  const availableHeight = Math.max(1, viewportHeight - POWER_CANVAS_VERTICAL_PADDING);
  return clamp(
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1),
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
  const scaledContentWidth = Math.max(1, dimensions.contentWidth) * safeScale;
  const scaledContentHeight = Math.max(1, dimensions.contentHeight) * safeScale;
  const widthFits = scaledContentWidth + POWER_CANVAS_OVERSCAN * 2 <= dimensions.viewportWidth;
  const heightFits = scaledContentHeight + POWER_CANVAS_OVERSCAN * 2 <= dimensions.viewportHeight;
  const stageWidth = Math.max(
    1,
    widthFits ? dimensions.viewportWidth : scaledContentWidth + POWER_CANVAS_OVERSCAN * 2,
  );
  const stageHeight = Math.max(
    1,
    heightFits ? dimensions.viewportHeight : scaledContentHeight + POWER_CANVAS_OVERSCAN * 2,
  );

  return {
    stageWidth,
    stageHeight,
    originX: widthFits
      ? (dimensions.viewportWidth - scaledContentWidth) / 2
      : POWER_CANVAS_OVERSCAN,
    originY: heightFits
      ? (dimensions.viewportHeight - scaledContentHeight) / 2
      : POWER_CANVAS_OVERSCAN,
    scaledContentWidth,
    scaledContentHeight,
  };
}
