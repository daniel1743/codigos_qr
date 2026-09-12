// Font-family discoverability (CRIPQER_POWER_FONT_DISCOVERABILITY_V1).
//
// The Inspector now exposes the canonical `theme.typography.headingFont` /
// `theme.typography.bodyFont` authority via a `FONT_OPTIONS` selector. This
// suite asserts the two guarantees the feature depends on — without importing
// the heavy `Inspector.tsx` graph:
//   1. `FONT_OPTIONS` is the canonical, complete 6-font list (not duplicated).
//   2. The `patch` action persists a font change onto the canonical config path
//      (the same authority the renderer/autosave/preview already consume).
import { describe, expect, it } from "vitest";
import { FONT_OPTIONS } from "../constants/themes";
import { createInitialState, templateReducer } from "../state/templateReducer";
import { createDemoConfig } from "../templates/definitions";

describe("Font-family discoverability (FONT_OPTIONS authority)", () => {
  it("exposes the complete canonical 6-font list", () => {
    expect(FONT_OPTIONS).toHaveLength(6);
    expect(FONT_OPTIONS.map((f) => f.label)).toEqual([
      "Inter",
      "Space Grotesk",
      "Instrument Serif",
      "Playfair Display",
      "DM Sans",
      "JetBrains Mono",
    ]);
    // Every option carries a non-empty CSS font stack.
    for (const font of FONT_OPTIONS) {
      expect(font.value.length).toBeGreaterThan(0);
      expect(font.value).toContain(font.label);
    }
  });

  it("has no duplicate option values", () => {
    const values = FONT_OPTIONS.map((f) => f.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe("Font persistence via the canonical theme.typography authority", () => {
  const config = createDemoConfig();
  const initialState = createInitialState(config);

  it("patch('theme.typography.headingFont') updates the heading font and marks dirty", () => {
    const heading = FONT_OPTIONS[1]!.value; // Space Grotesk
    const next = templateReducer(initialState, {
      type: "patch",
      path: "theme.typography.headingFont",
      value: heading,
    });
    expect(next.config.theme.typography.headingFont).toBe(heading);
    expect(next.config.theme.typography.bodyFont).toBe(config.theme.typography.bodyFont);
    expect(next.dirty).toBe(true);
  });

  it("patch('theme.typography.bodyFont') updates the body font independently", () => {
    const body = FONT_OPTIONS[5]!.value; // JetBrains Mono
    const next = templateReducer(initialState, {
      type: "patch",
      path: "theme.typography.bodyFont",
      value: body,
    });
    expect(next.config.theme.typography.bodyFont).toBe(body);
    expect(next.config.theme.typography.headingFont).toBe(config.theme.typography.headingFont);
  });

  it("font selection preserves the rest of the canonical config", () => {
    const next = templateReducer(initialState, {
      type: "patch",
      path: "theme.typography.headingFont",
      value: FONT_OPTIONS[2]!.value,
    });
    // Blocks, profile and theme colors are untouched by a font change.
    expect(next.config.blocks).toEqual(config.blocks);
    expect(next.config.profile).toEqual(config.profile);
    expect(next.config.theme.colors).toEqual(config.theme.colors);
  });
});
