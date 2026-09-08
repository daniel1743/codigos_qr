import { describe, expect, it } from "vitest";
import {
  calculateEffectiveScale,
  calculateFitZoom,
  calculateFocalZoomScroll,
  calculatePanScroll,
  calculateStageGeometry,
  clampScrollPosition,
  POWER_CANVAS_MIN_USER_ZOOM,
} from "../powerCanvasCameraMath";

function worldPointUnderAnchor({
  scrollLeft,
  scrollTop,
  anchorX,
  anchorY,
  originX,
  originY,
  scale,
}: {
  scrollLeft: number;
  scrollTop: number;
  anchorX: number;
  anchorY: number;
  originX: number;
  originY: number;
  scale: number;
}) {
  return {
    x: (scrollLeft + anchorX - originX) / scale,
    y: (scrollTop + anchorY - originY) / scale,
  };
}

describe("power canvas camera math", () => {
  it("fits content smaller than the viewport without exceeding 1", () => {
    expect(
      calculateFitZoom({
        viewportWidth: 1200,
        viewportHeight: 900,
        contentWidth: 500,
        contentHeight: 600,
      }),
    ).toBe(1);
  });

  it("fits the limiting content dimension", () => {
    expect(
      calculateFitZoom({
        viewportWidth: 800,
        viewportHeight: 700,
        contentWidth: 1200,
        contentHeight: 600,
      }),
    ).toBeCloseTo(0.6133, 3);
  });

  it("protects against zero-size measurements and clamps effective zoom", () => {
    expect(
      calculateFitZoom({ viewportWidth: 0, viewportHeight: 0, contentWidth: 0, contentHeight: 0 }),
    ).toBe(1);
    expect(calculateEffectiveScale(0, POWER_CANVAS_MIN_USER_ZOOM)).toBeCloseTo(0.6);
    expect(calculateEffectiveScale(0.35, POWER_CANVAS_MIN_USER_ZOOM)).toBeCloseTo(0.35);
    expect(calculateEffectiveScale(0.8, 99)).toBeCloseTo(2.4);
  });

  it("keeps user zoom independent from fit zoom", () => {
    expect(calculateEffectiveScale(0.75, 1.2)).toBeCloseTo(0.9);
  });

  it("represents scaled content in stage geometry with a neutral origin", () => {
    const stage = calculateStageGeometry(
      { viewportWidth: 500, viewportHeight: 500, contentWidth: 600, contentHeight: 900 },
      0.8,
    );
    expect(stage.stageWidth).toBe(600 * 0.8);
    expect(stage.stageHeight).toBe(900 * 0.8);
    expect(stage.scaledContentWidth).toBe(600 * 0.8);
    expect(stage.scaledContentHeight).toBe(900 * 0.8);
    expect(stage.originX).toBe(0);
    expect(stage.originY).toBe(0);
  });

  it("always returns finite stage geometry for invalid measurements", () => {
    const stage = calculateStageGeometry(
      {
        viewportWidth: Number.NaN,
        viewportHeight: Number.POSITIVE_INFINITY,
        contentWidth: Number.NaN,
        contentHeight: Number.NEGATIVE_INFINITY,
      },
      Number.NaN,
    );

    expect(Object.values(stage).every(Number.isFinite)).toBe(true);
    expect(stage.stageWidth).toBeGreaterThan(0);
    expect(stage.stageHeight).toBeGreaterThan(0);
  });

  it("does not mutate intrinsic source dimensions when scale changes", () => {
    const dimensions = {
      viewportWidth: 900,
      viewportHeight: 700,
      contentWidth: 1180,
      contentHeight: 2400,
    };
    const source = { ...dimensions };

    const half = calculateStageGeometry(dimensions, 0.5);
    const enlarged = calculateStageGeometry(dimensions, 1.25);

    expect(dimensions).toEqual(source);
    expect(half.scaledContentWidth).toBe(590);
    expect(enlarged.scaledContentWidth).toBe(1475);
    expect(dimensions.contentWidth).toBe(1180);
    expect(dimensions.contentHeight).toBe(2400);
  });

  it("keeps effective scale finite for non-finite inputs", () => {
    expect(Number.isFinite(calculateEffectiveScale(Number.NaN, Number.NaN))).toBe(true);
    expect(Number.isFinite(calculateEffectiveScale(Number.POSITIVE_INFINITY, 1))).toBe(true);
    expect(Number.isFinite(calculateEffectiveScale(0.75, Number.NEGATIVE_INFINITY))).toBe(true);
  });

  it("protects fit zoom from a zero viewport and non-finite dimensions", () => {
    expect(
      calculateFitZoom({
        viewportWidth: 0,
        viewportHeight: 700,
        contentWidth: 1180,
        contentHeight: 2400,
      }),
    ).toBe(1);
    expect(
      calculateFitZoom({
        viewportWidth: Number.NaN,
        viewportHeight: 700,
        contentWidth: 1180,
        contentHeight: 2400,
      }),
    ).toBe(1);
  });

  it("bounds an extremely tall document to a finite minimum fit zoom", () => {
    const fitZoom = calculateFitZoom({
      viewportWidth: 900,
      viewportHeight: 700,
      contentWidth: 390,
      contentHeight: 1_000_000,
    });
    const stage = calculateStageGeometry(
      { viewportWidth: 900, viewportHeight: 700, contentWidth: 390, contentHeight: 1_000_000 },
      fitZoom,
    );

    expect(fitZoom).toBe(0.35);
    expect(Number.isFinite(stage.stageHeight)).toBe(true);
  });

  it("keeps an extremely narrow document finite and centered", () => {
    const dimensions = {
      viewportWidth: 900,
      viewportHeight: 700,
      contentWidth: 1,
      contentHeight: 600,
    };
    const fitZoom = calculateFitZoom(dimensions);
    const stage = calculateStageGeometry(dimensions, fitZoom);

    expect(fitZoom).toBe(1);
    expect(Object.values(stage).every(Number.isFinite)).toBe(true);
    expect(stage.originX).toBe(0);
    expect(stage.originY).toBe(0);
  });

  it("regression: stage dimensions derive only from intrinsic content and scale, not the viewport", () => {
    const content = { contentWidth: 600, contentHeight: 900 };
    const scale = 0.8;
    const wide = calculateStageGeometry(
      { viewportWidth: 2000, viewportHeight: 2000, ...content },
      scale,
    );
    const narrow = calculateStageGeometry(
      { viewportWidth: 200, viewportHeight: 200, ...content },
      scale,
    );

    expect(wide.stageWidth).toBe(600 * 0.8);
    expect(narrow.stageWidth).toBe(600 * 0.8);
    expect(wide.stageHeight).toBe(900 * 0.8);
    expect(narrow.stageHeight).toBe(900 * 0.8);
    expect(wide.originX).toBe(0);
    expect(wide.originY).toBe(0);
    expect(narrow.originX).toBe(0);
    expect(narrow.originY).toBe(0);
  });

  it("keeps scroll unchanged for identity focal zoom", () => {
    const dimensions = {
      viewportWidth: 900,
      viewportHeight: 700,
      contentWidth: 1180,
      contentHeight: 2400,
    };
    const stage = calculateStageGeometry(dimensions, 1);
    const scroll = calculateFocalZoomScroll({
      dimensions,
      oldStage: stage,
      newStage: stage,
      oldScale: 1,
      newScale: 1,
      currentScroll: { scrollLeft: 120, scrollTop: 240 },
      anchor: { x: 450, y: 350 },
    });

    expect(scroll.scrollLeft).toBe(120);
    expect(scroll.scrollTop).toBe(240);
  });

  it("preserves the world point under the viewport center while zooming in and out", () => {
    const dimensions = {
      viewportWidth: 400,
      viewportHeight: 300,
      contentWidth: 2000,
      contentHeight: 2400,
    };
    const anchor = { x: 200, y: 150 };
    const currentScroll = { scrollLeft: 140, scrollTop: 260 };
    const oldScale = 0.5;
    const zoomedInScale = 0.8;
    const zoomedOutScale = 0.35;
    const oldStage = calculateStageGeometry(dimensions, oldScale);
    const zoomedInStage = calculateStageGeometry(dimensions, zoomedInScale);
    const zoomedOutStage = calculateStageGeometry(dimensions, zoomedOutScale);
    const before = worldPointUnderAnchor({
      ...currentScroll,
      anchorX: anchor.x,
      anchorY: anchor.y,
      originX: oldStage.originX,
      originY: oldStage.originY,
      scale: oldScale,
    });

    const zoomedInScroll = calculateFocalZoomScroll({
      dimensions,
      oldStage,
      newStage: zoomedInStage,
      oldScale,
      newScale: zoomedInScale,
      currentScroll,
      anchor,
    });
    const zoomedOutScroll = calculateFocalZoomScroll({
      dimensions,
      oldStage,
      newStage: zoomedOutStage,
      oldScale,
      newScale: zoomedOutScale,
      currentScroll,
      anchor,
    });

    expect(
      worldPointUnderAnchor({
        ...zoomedInScroll,
        anchorX: anchor.x,
        anchorY: anchor.y,
        originX: zoomedInStage.originX,
        originY: zoomedInStage.originY,
        scale: zoomedInScale,
      }),
    ).toEqual({ x: expect.closeTo(before.x, 5), y: expect.closeTo(before.y, 5) });
    expect(
      worldPointUnderAnchor({
        ...zoomedOutScroll,
        anchorX: anchor.x,
        anchorY: anchor.y,
        originX: zoomedOutStage.originX,
        originY: zoomedOutStage.originY,
        scale: zoomedOutScale,
      }),
    ).toEqual({ x: expect.closeTo(before.x, 5), y: expect.closeTo(before.y, 5) });
  });

  it("preserves focal anchors near the top-left and bottom-right when bounds allow it", () => {
    const dimensions = {
      viewportWidth: 300,
      viewportHeight: 300,
      contentWidth: 3000,
      contentHeight: 4000,
    };
    const oldScale = 0.6;
    const newScale = 0.9;
    const oldStage = calculateStageGeometry(dimensions, oldScale);
    const newStage = calculateStageGeometry(dimensions, newScale);
    const anchors = [
      { x: 24, y: 28, scrollLeft: 280, scrollTop: 320 },
      { x: 276, y: 272, scrollLeft: 360, scrollTop: 680 },
    ];

    for (const sample of anchors) {
      const before = worldPointUnderAnchor({
        scrollLeft: sample.scrollLeft,
        scrollTop: sample.scrollTop,
        anchorX: sample.x,
        anchorY: sample.y,
        originX: oldStage.originX,
        originY: oldStage.originY,
        scale: oldScale,
      });
      const afterScroll = calculateFocalZoomScroll({
        dimensions,
        oldStage,
        newStage,
        oldScale,
        newScale,
        currentScroll: { scrollLeft: sample.scrollLeft, scrollTop: sample.scrollTop },
        anchor: { x: sample.x, y: sample.y },
      });
      const after = worldPointUnderAnchor({
        ...afterScroll,
        anchorX: sample.x,
        anchorY: sample.y,
        originX: newStage.originX,
        originY: newStage.originY,
        scale: newScale,
      });

      expect(after.x).toBeCloseTo(before.x, 5);
      expect(after.y).toBeCloseTo(before.y, 5);
    }
  });

  it("clamps focal zoom scroll to finite stage bounds and rejects invalid values", () => {
    const dimensions = {
      viewportWidth: 700,
      viewportHeight: 500,
      contentWidth: 1000,
      contentHeight: 1600,
    };
    const oldStage = calculateStageGeometry(dimensions, 0.7);
    const newStage = calculateStageGeometry(dimensions, 1.2);
    const scroll = calculateFocalZoomScroll({
      dimensions,
      oldStage,
      newStage,
      oldScale: Number.NaN,
      newScale: Number.POSITIVE_INFINITY,
      currentScroll: { scrollLeft: Number.NaN, scrollTop: Number.NEGATIVE_INFINITY },
      anchor: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
    });
    const clamped = clampScrollPosition(scroll, dimensions, newStage);

    expect(scroll).toEqual(clamped);
    expect(Object.values(scroll).every(Number.isFinite)).toBe(true);
  });

  it("uses viewport scroll as pan ownership and clamps finite bounds", () => {
    const dimensions = {
      viewportWidth: 500,
      viewportHeight: 400,
      contentWidth: 1200,
      contentHeight: 1800,
    };
    const stage = calculateStageGeometry(dimensions, 1);

    expect(
      calculatePanScroll({
        startScroll: { scrollLeft: 100, scrollTop: 100 },
        deltaX: 40,
        deltaY: 30,
        dimensions,
        stage,
      }),
    ).toEqual({ scrollLeft: 60, scrollTop: 70 });
    expect(
      calculatePanScroll({
        startScroll: { scrollLeft: 100, scrollTop: 100 },
        deltaX: -40,
        deltaY: -30,
        dimensions,
        stage,
      }),
    ).toEqual({ scrollLeft: 140, scrollTop: 130 });
    expect(
      calculatePanScroll({
        startScroll: { scrollLeft: 10, scrollTop: 10 },
        deltaX: 99,
        deltaY: 99,
        dimensions,
        stage,
      }),
    ).toEqual({ scrollLeft: 0, scrollTop: 0 });
    expect(
      calculatePanScroll({
        startScroll: { scrollLeft: 100, scrollTop: 100 },
        deltaX: 0,
        deltaY: 0,
        dimensions,
        stage,
      }),
    ).toEqual({ scrollLeft: 100, scrollTop: 100 });
  });
});
