// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { PalettePicker } from "../components/editor/controls/PalettePicker";
import {
  colorFamilies,
  legacyPaletteMap,
  visualPaletteById,
  visualPalettes,
} from "../data/visualPresets";

describe("Magic color family matrix", () => {
  it("defines 12 families, six variants each, and 72 unique palettes", () => {
    expect(colorFamilies).toHaveLength(12);
    expect(colorFamilies.every((family) => family.variants).valueOf()).toBe(true);
    expect(colorFamilies.every((family) => family.variants.length === 6)).toBe(true);
    expect(visualPalettes).toHaveLength(72);
    expect(new Set(visualPalettes.map((palette) => palette.id)).size).toBe(72);
  });

  it("provides the full semantic contract for every curated palette", () => {
    const required = [
      "pageBackground",
      "surface",
      "secondarySurface",
      "text",
      "muted",
      "accent",
      "accentFg",
      "line",
      "ctaBackground",
      "ctaForeground",
      "iconSurface",
      "iconForeground",
    ];
    for (const palette of visualPalettes)
      expect(Object.keys(palette.semantic ?? {})).toEqual(expect.arrayContaining(required));
  });

  it("resolves every legacy id without adding legacy entries to the family picker", () => {
    for (const [legacyId, canonicalId] of Object.entries(legacyPaletteMap)) {
      expect(visualPaletteById[legacyId]).toBeDefined();
      expect(visualPaletteById[legacyId].familyId).toBe(visualPaletteById[canonicalId].familyId);
    }
    expect(visualPalettes.some((palette) => palette.id === "red-energy")).toBe(false);
  });

  it("navigates from 12 families to six variants without rendering 72 choices together", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const changes: string[] = [];
    act(() => root.render(<PalettePicker onChange={(value) => changes.push(value)} />));
    expect(host.querySelectorAll("[data-palette-families] button")).toHaveLength(12);
    expect(host.querySelector("[data-palette-grid]")).toBeNull();
    act(() => (host.querySelector("[data-palette-families] button") as HTMLButtonElement).click());
    expect(host.querySelectorAll("[data-palette-grid] button")).toHaveLength(6);
    act(() => (host.querySelector("[data-palette-grid] button") as HTMLButtonElement).click());
    expect(changes).toHaveLength(1);
    act(() => root.unmount());
  });
});
