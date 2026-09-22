import { describe, expect, it } from "vitest";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { getBlockDefinition } from "../constants/blockDefinitions";

describe("Phase 7 preset productization contract", () => {
  it("exposes all 29 presets with valid, independently identified blocks", () => {
    expect(SECTION_PRESETS).toHaveLength(29);

    for (const preset of SECTION_PRESETS) {
      const blocks = preset.createBlocks();
      const ids = blocks.map((block) => block.id);

      expect(blocks.length, preset.name).toBeGreaterThan(0);
      expect(new Set(ids).size, preset.name).toBe(ids.length);
      expect(
        blocks.every((block) => getBlockDefinition(block.type)),
        preset.name,
      ).toBe(true);
      expect(JSON.parse(JSON.stringify(blocks)), preset.name).toEqual(blocks);
    }
  });

  it("covers every certified family without broken preset construction", () => {
    const families = new Map<string, number>();
    for (const preset of SECTION_PRESETS) {
      preset.createBlocks();
      families.set(preset.category, (families.get(preset.category) ?? 0) + 1);
    }

    expect(Object.fromEntries(families)).toEqual({
      Hero: 6,
      Services: 4,
      Booking: 3,
      Portfolio: 3,
      Reviews: 3,
      Products: 3,
      Media: 3,
      Contact: 4,
    });
  });
});
