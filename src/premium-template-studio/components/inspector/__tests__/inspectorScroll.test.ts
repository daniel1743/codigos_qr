import { describe, expect, it } from "vitest";
import { shouldResetInspectorScroll } from "../inspectorScroll";

describe("shouldResetInspectorScroll (Phase 5A inspector autofocus)", () => {
  it("resets when a different block is selected", () => {
    expect(shouldResetInspectorScroll(null, "hero-1")).toBe(true);
    expect(shouldResetInspectorScroll("hero-1", "hero-2")).toBe(true);
  });

  it("resets when the selection is cleared (back to profile)", () => {
    expect(shouldResetInspectorScroll("hero-1", null)).toBe(true);
  });

  it("does NOT reset while editing the currently-selected block", () => {
    expect(shouldResetInspectorScroll("hero-1", "hero-1")).toBe(false);
  });

  it("does NOT reset when there is no selection change at all", () => {
    expect(shouldResetInspectorScroll(null, null)).toBe(false);
  });
});
