import { describe, expect, it } from "vitest";
import {
  computeAutofocusScrollDelta,
  POWER_CANVAS_AUTOFOCUS_MARGIN,
} from "../powerCanvasAutofocus";

const viewport = { top: 0, bottom: 800, left: 0, right: 1200 };

describe("power canvas autofocus scroll delta", () => {
  it("returns zero when the element is already fully visible", () => {
    const element = { top: 100, bottom: 200, left: 100, right: 300 };
    expect(computeAutofocusScrollDelta(viewport, element)).toEqual({ top: 0, left: 0 });
  });

  it("recovers an element clipped above (negative top delta)", () => {
    const element = { top: -50, bottom: 50, left: 100, right: 300 };
    const delta = computeAutofocusScrollDelta(viewport, element);
    expect(delta.top).toBeLessThan(0);
    expect(delta.top).toBe(-50 - (0 + POWER_CANVAS_AUTOFOCUS_MARGIN));
    expect(delta.left).toBe(0);
  });

  it("recovers an element clipped below (positive top delta)", () => {
    const element = { top: 900, bottom: 1000, left: 100, right: 300 };
    const delta = computeAutofocusScrollDelta(viewport, element);
    expect(delta.top).toBeGreaterThan(0);
    expect(delta.top).toBe(1000 - (800 - POWER_CANVAS_AUTOFOCUS_MARGIN));
    expect(delta.left).toBe(0);
  });

  it("recovers an element clipped to the left (negative left delta)", () => {
    const element = { top: 100, bottom: 200, left: -40, right: 100 };
    const delta = computeAutofocusScrollDelta(viewport, element);
    expect(delta.left).toBeLessThan(0);
    expect(delta.left).toBe(-40 - (0 + POWER_CANVAS_AUTOFOCUS_MARGIN));
    expect(delta.top).toBe(0);
  });

  it("recovers an element clipped to the right (positive left delta)", () => {
    const element = { top: 100, bottom: 200, left: 1150, right: 1300 };
    const delta = computeAutofocusScrollDelta(viewport, element);
    expect(delta.left).toBeGreaterThan(0);
    expect(delta.left).toBe(1300 - (1200 - POWER_CANVAS_AUTOFOCUS_MARGIN));
    expect(delta.top).toBe(0);
  });

  it("does not move for elements exactly at the margin boundary", () => {
    const element = {
      top: 0 + POWER_CANVAS_AUTOFOCUS_MARGIN,
      bottom: 800 - POWER_CANVAS_AUTOFOCUS_MARGIN,
      left: 0 + POWER_CANVAS_AUTOFOCUS_MARGIN,
      right: 1200 - POWER_CANVAS_AUTOFOCUS_MARGIN,
    };
    expect(computeAutofocusScrollDelta(viewport, element)).toEqual({ top: 0, left: 0 });
  });
});
