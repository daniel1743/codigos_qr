import { describe, expect, it } from "vitest";
import { GENERIC_PRESET, resolvePreset, SEMANTIC_PRESETS } from "../smart-pages";

describe("business-presets (SMART_PAGES_2)", () => {
  it("selects deterministic presets", () => {
    expect(resolvePreset("restaurant").id).toBe("food_service");
    expect(resolvePreset("restaurant").experienceType).toBe("menu");
    expect(resolvePreset("photographer").experienceType).toBe("portfolio");
    expect(resolvePreset("veterinarian").experienceType).toBe("services");
    expect(resolvePreset("retail").experienceType).toBe("catalog");
    expect(resolvePreset("real_estate").experienceType).toBe("listings");
    expect(resolvePreset("totally unknown business").id).toBe("generic");
  });

  it("presets remain semantic hints without fabricated commercial claims", () => {
    for (const preset of SEMANTIC_PRESETS) {
      expect((preset.sequence as string[]).includes("checkout")).toBe(false);
      expect(preset).not.toHaveProperty("price");
      expect(preset).not.toHaveProperty("rating");
      expect(preset).not.toHaveProperty("testimonials");
    }
    expect((resolvePreset("retail").sequence as string[]).includes("discount")).toBe(false);
  });

  it("preserves listings as a semantic-only preset", () => {
    expect(SEMANTIC_PRESETS.some((p) => p.id === "listings")).toBe(true);
    expect(resolvePreset("real_estate").experienceType).toBe("listings");
  });

  it("falls back to the generic landing preset for unknown business types", () => {
    const preset = resolvePreset("asdfghjklqwerty");
    expect(preset).toBe(GENERIC_PRESET);
    expect(preset.experienceType).toBe("landing");
  });
});
