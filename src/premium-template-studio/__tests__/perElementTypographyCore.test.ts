// Fast core tests for per-element typography overrides — pure helper + canonical
// persistence (no renderer import, so they run quickly).
import { describe, expect, it } from "vitest";
import { applyTypographyOverride } from "../engine/styleEngine";
import { createDemoConfig } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";

describe("applyTypographyOverride (inheritance model)", () => {
  it("returns the base style unchanged when override is absent (backward compatible)", () => {
    const base = { fontSize: 16, color: "red" };
    expect(applyTypographyOverride(base, undefined)).toBe(base);
  });

  it("returns the base style unchanged when override is empty", () => {
    const base = { fontSize: 16, color: "red" };
    expect(applyTypographyOverride(base, {})).toEqual(base);
  });

  it("applies every supported override field", () => {
    const result = applyTypographyOverride(
      { fontSize: 16, color: "red" },
      { fontFamily: '"DM Sans", sans-serif', fontWeight: 700, fontSize: 24, textAlign: "center", textColor: "blue" },
    );
    expect(result).toEqual({
      fontSize: 24,
      color: "blue",
      fontFamily: '"DM Sans", sans-serif',
      fontWeight: 700,
      textAlign: "center",
    });
  });

  it("a partial override changes only the specified field", () => {
    const result = applyTypographyOverride({ fontSize: 16, color: "red" }, { fontWeight: 700 });
    expect(result.fontWeight).toBe(700);
    expect(result.fontSize).toBe(16);
    expect(result.color).toBe("red");
    expect(result.textAlign).toBeUndefined();
  });
});

describe("canonical persistence via patchBlockField", () => {
  it("persists a title typography override and marks the document dirty", () => {
    const state = createInitialState(createDemoConfig());
    const heroId = state.config.blocks[0]!.id;
    const next = templateReducer(state, {
      type: "patchBlockField",
      id: heroId,
      path: "style.titleTypography",
      value: { fontWeight: 900 },
    });
    expect(next.config.blocks.find((b) => b.id === heroId)!.style.titleTypography).toEqual({
      fontWeight: 900,
    });
    expect(next.dirty).toBe(true);
  });

  it("removing the override restores inheritance (undefined)", () => {
    const state = createInitialState(createDemoConfig());
    const heroId = state.config.blocks[0]!.id;
    const withOverride = templateReducer(state, {
      type: "patchBlockField",
      id: heroId,
      path: "style.titleTypography",
      value: { fontWeight: 900 },
    });
    const cleared = templateReducer(withOverride, {
      type: "patchBlockField",
      id: heroId,
      path: "style.titleTypography",
      value: undefined,
    });
    expect(cleared.config.blocks.find((b) => b.id === heroId)!.style.titleTypography).toBeUndefined();
  });

  it("does not mutate unrelated config when adding an override", () => {
    const config = createDemoConfig();
    const state = createInitialState(config);
    const heroId = state.config.blocks[0]!.id;
    const next = templateReducer(state, {
      type: "patchBlockField",
      id: heroId,
      path: "style.titleTypography",
      value: { fontWeight: 900 },
    });
    // Profile, theme and other blocks are untouched by a per-element override.
    expect(next.config.profile).toEqual(config.profile);
    expect(next.config.theme).toEqual(config.theme);
    expect(next.config.blocks.length).toBe(config.blocks.length);
  });
});
