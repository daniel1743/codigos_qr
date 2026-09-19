import { describe, expect, it } from "vitest";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { createBlock } from "../constants/blockDefinitions";
import { getHeaderMode, replaceHeroPresetBlocks } from "../engine/headerMode";

describe("canonical header mode and Hero replacement", () => {
  it("derives custom versus full Hero mode from the canonical block list", () => {
    expect(getHeaderMode([])).toBe("custom");
    expect(getHeaderMode([createBlock("text")])).toBe("custom");
    expect(getHeaderMode([createBlock("hero")])).toBe("full-hero");
  });

  it("replaces an existing Hero and keeps exactly one Hero", () => {
    const oldHero = createBlock("hero");
    const existingText = createBlock("text");
    const nextPreset = SECTION_PRESETS.find((preset) => preset.category === "Hero")!.createBlocks();
    const next = replaceHeroPresetBlocks([oldHero, existingText], nextPreset);

    expect(next.filter((block) => block.type === "hero")).toHaveLength(1);
    expect(next).toContain(existingText);
    expect(next[0]?.type).toBe("hero");
  });

  it("inserts a first Hero when switching from the custom header", () => {
    const existingText = createBlock("text");
    const preset = SECTION_PRESETS.find((item) => item.category === "Hero")!.createBlocks();
    const next = replaceHeroPresetBlocks([existingText], preset);

    expect(next[0]?.type).toBe("hero");
    expect(next.filter((block) => block.type === "hero")).toHaveLength(1);
  });
});
