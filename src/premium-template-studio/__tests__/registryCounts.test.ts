import { describe, it, expect } from "vitest";
import { BLOCK_DEFINITIONS } from "../constants/blockDefinitions";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { TEMPLATE_DEFINITIONS } from "../templates/definitions";

describe("Registry Count Verification", () => {
  it("reports exact block type count", () => {
    const uniqueBlockTypes = new Set(BLOCK_DEFINITIONS.map((d) => d.type));
    console.log(`Block Types: ${uniqueBlockTypes.size}`);
    console.log(`Block Definitions Length: ${BLOCK_DEFINITIONS.length}`);
    expect(BLOCK_DEFINITIONS.length).toBeGreaterThan(0);
    expect(uniqueBlockTypes.size).toBe(BLOCK_DEFINITIONS.length);
  });

  it("reports exact section preset count", () => {
    console.log(`Section Presets: ${SECTION_PRESETS.length}`);
    expect(SECTION_PRESETS.length).toBeGreaterThan(0);
    const allIds = SECTION_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("reports exact recipe/template definition count", () => {
    console.log(`Template Definitions: ${TEMPLATE_DEFINITIONS.length}`);
    expect(TEMPLATE_DEFINITIONS.length).toBeGreaterThan(0);
    const allIds = TEMPLATE_DEFINITIONS.map((t) => t.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it("verifies all preset IDs are unique", () => {
    const ids = SECTION_PRESETS.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    console.log(`✓ All ${ids.length} preset IDs are unique`);
  });

  it("verifies all template/recipe IDs are unique", () => {
    const ids = TEMPLATE_DEFINITIONS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    console.log(`✓ All ${ids.length} template IDs are unique`);
  });

  it("verifies all block types are unique", () => {
    const types = BLOCK_DEFINITIONS.map((d) => d.type);
    const uniqueTypes = new Set(types);
    expect(uniqueTypes.size).toBe(types.length);
    console.log(`✓ All ${types.length} block types are unique`);
  });
});
