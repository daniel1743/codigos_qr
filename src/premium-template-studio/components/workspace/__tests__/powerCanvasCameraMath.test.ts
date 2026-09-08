import { describe, expect, it } from "vitest";
import {
  calculateEffectiveScale,
  calculateFitZoom,
  calculateStageGeometry,
  POWER_CANVAS_MIN_USER_ZOOM,
  POWER_CANVAS_OVERSCAN,
} from "../powerCanvasCameraMath";

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

  it("represents scaled content and overscan in stage geometry", () => {
    const stage = calculateStageGeometry(
      { viewportWidth: 500, viewportHeight: 500, contentWidth: 600, contentHeight: 900 },
      0.8,
    );
    expect(stage.stageWidth).toBe(600 * 0.8 + POWER_CANVAS_OVERSCAN * 2);
    expect(stage.stageHeight).toBe(900 * 0.8 + POWER_CANVAS_OVERSCAN * 2);
    expect(stage.originX).toBe(POWER_CANVAS_OVERSCAN);
    expect(stage.originY).toBe(POWER_CANVAS_OVERSCAN);
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
    expect(stage.originX).toBeGreaterThan(0);
  });
});
