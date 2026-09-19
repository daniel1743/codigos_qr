import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SECTION_PRESETS } from "../constants/sectionPresets";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { TEMPLATE_DEFINITIONS, createDemoConfig } from "../templates/definitions";
import type { BioTemplateConfig } from "../types";

function renderConfig(config: BioTemplateConfig) {
  return renderToStaticMarkup(<TemplateRenderer config={config} mode="public" />);
}

describe("Phase 7B preset and full-template runtime render sweep", () => {
  it("renders every exposed preset through TemplateRenderer", () => {
    expect(SECTION_PRESETS).toHaveLength(29);

    for (const preset of SECTION_PRESETS) {
      const config = { ...createDemoConfig(), blocks: preset.createBlocks() };
      expect(() => renderConfig(config), preset.name).not.toThrow();
    }
  });

  it("renders all three canonical full template definitions as compositions", () => {
    const fullTemplates = TEMPLATE_DEFINITIONS.slice(0, 3);
    expect(fullTemplates.map((template) => template.name)).toEqual([
      "Creator Premium",
      "Executive Premium",
      "Modern Bento",
    ]);

    for (const template of fullTemplates) {
      const config = template.build();
      expect(config.blocks.length, template.name).toBeGreaterThan(0);
      expect(() => renderConfig(config), template.name).not.toThrow();
    }
  });
});
