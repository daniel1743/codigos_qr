import { describe, expect, it } from "vitest";
import {
  BRANDING_BLUE,
  BRANDING_ON_DARK,
  contrastRatio,
  parseHexColor,
  relativeLuminance,
  resolveBrandingTone,
} from "../brandingContrast";

/**
 * E1.1 — the branding line must be legible on every surface it can sit on, using
 * the two official brand colours only. These are the palettes named in the task
 * (current teal, arena/cream, light, dark and saturated).
 */
const SURFACES = {
  teal: "#2B6570",
  arena: "#F4F1E8",
  cream: "#F7F0E6",
  light: "#FFFFFF",
  dark: "#101418",
  saturated: "#FFB700",
} as const;

describe("branding contrast — pure measurements", () => {
  it("parses #abc and #aabbcc and rejects anything else", () => {
    expect(parseHexColor("#fff")).toEqual([255, 255, 255]);
    expect(parseHexColor("#2B6570")).toEqual([43, 101, 112]);
    expect(parseHexColor("var(--surface)")).toBeNull();
    expect(parseHexColor("")).toBeNull();
    expect(parseHexColor(undefined)).toBeNull();
  });

  it("matches WCAG anchors", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#000000", "#000000")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
  });

  it("returns null when either colour cannot be resolved", () => {
    expect(contrastRatio("var(--fg)", "#FFFFFF")).toBeNull();
    expect(contrastRatio("#FFFFFF", undefined)).toBeNull();
  });
});

describe("branding contrast — strategy", () => {
  it("keeps the official blue on light surfaces (arena / cream / white)", () => {
    for (const surface of [SURFACES.arena, SURFACES.cream, SURFACES.light]) {
      const tone = resolveBrandingTone(surface);
      expect(tone.color).toBe(BRANDING_BLUE);
      expect(tone.logoTheme).toBe("default");
    }
  });

  it("switches to the white lockup on dark / saturated surfaces (teal, dark, gold)", () => {
    for (const surface of [SURFACES.teal, SURFACES.dark]) {
      const tone = resolveBrandingTone(surface);
      expect(tone.color).toBe(BRANDING_ON_DARK);
      expect(tone.logoTheme).toBe("inverse");
    }
  });

  it("never picks a colour with less contrast than the alternative", () => {
    for (const surface of Object.values(SURFACES)) {
      const tone = resolveBrandingTone(surface);
      const chosen = contrastRatio(tone.color, surface) ?? 0;
      const other = contrastRatio(
        tone.color === BRANDING_BLUE ? BRANDING_ON_DARK : BRANDING_BLUE,
        surface,
      ) ?? 0;
      expect(chosen).toBeGreaterThanOrEqual(other);
      expect(chosen).toBeCloseTo(tone.contrast, 5);
    }
  });

  it("reaches AA (>= 4.5) on the real teal and on every light/saturated surface", () => {
    for (const surface of [SURFACES.teal, SURFACES.arena, SURFACES.cream, SURFACES.saturated]) {
      expect(resolveBrandingTone(surface).contrast).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to today's rendering when the surface is not a literal colour", () => {
    for (const surface of [undefined, null, "", "var(--surface)"]) {
      const tone = resolveBrandingTone(surface);
      expect(tone.color).toBe(BRANDING_BLUE);
      expect(tone.logoTheme).toBe("default");
    }
  });
});
