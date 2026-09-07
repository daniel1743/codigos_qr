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
});
