import { describe, it, expect } from "vitest";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { TEMPLATE_DEFINITIONS } from "../templates/definitions";

describe("Presets and Recipes", () => {
  it("all preset IDs are unique", () => {
    const ids = SECTION_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("all recipe IDs are unique", () => {
    const ids = TEMPLATE_DEFINITIONS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("preset instantiation generates fresh IDs", () => {
    const preset = SECTION_PRESETS[0]!;
    const blocks1 = preset.createBlocks();
    const blocks2 = preset.createBlocks();

    const ids1 = blocks1.map((b) => b.id);
    const ids2 = blocks2.map((b) => b.id);

    expect(ids1).not.toEqual(ids2);
  });

  it("two recipe instances remain independent", () => {
    const recipe = TEMPLATE_DEFINITIONS[0]!;
    const config1 = recipe.build();
    const config2 = recipe.build();

    // Verify they are different object references
    expect(config1).not.toBe(config2);
    // Verify they have same structure (except timestamps)
    expect(config1.blocks.length).toBe(config2.blocks.length);
    expect(config1.theme.id).toBe(config2.theme.id);
  });

  it("presets have required properties", () => {
    for (const preset of SECTION_PRESETS) {
      expect(preset.id).toBeDefined();
      expect(preset.name).toBeDefined();
      expect(preset.category).toBeDefined();
      expect(preset.createBlocks).toBeDefined();
      expect(typeof preset.createBlocks).toBe("function");
    }
  });

  it("recipes have required properties", () => {
    for (const recipe of TEMPLATE_DEFINITIONS) {
      expect(recipe.id).toBeDefined();
      expect(recipe.name).toBeDefined();
      expect(recipe.category).toBeDefined();
      expect(recipe.build).toBeDefined();
      expect(typeof recipe.build).toBe("function");
    }
  });

  it("recipe.build() returns valid config", () => {
    const recipe = TEMPLATE_DEFINITIONS[0]!;
    const config = recipe.build();
    expect(config.pageInstanceId).toBeDefined();
    expect(config.theme).toBeDefined();
    expect(config.layout).toBeDefined();
    expect(Array.isArray(config.blocks)).toBe(true);
  });

  it("preset blocks have fresh IDs each call", () => {
    const preset = SECTION_PRESETS[0]!;
    const blocks = preset.createBlocks();
    const ids = blocks.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
