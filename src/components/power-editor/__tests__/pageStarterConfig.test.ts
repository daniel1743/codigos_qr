import { describe, expect, it } from "vitest";
import {
  createPageStarterConfig,
  PAGE_TYPE_STARTER_TEMPLATE_IDS,
} from "../pageStarterConfig";

describe("createPageStarterConfig", () => {
  it("maps page types to existing canonical starter definitions", () => {
    const landing = createPageStarterConfig("Landing QA", "landing");
    const menu = createPageStarterConfig("Menu QA", "menu");
    const services = createPageStarterConfig("Services QA", "services");

    expect(landing.metadata.templateDefinitionId).toBe(PAGE_TYPE_STARTER_TEMPLATE_IDS.landing);
    expect(menu.metadata.templateDefinitionId).toBe(PAGE_TYPE_STARTER_TEMPLATE_IDS.menu);
    expect(services.metadata.templateDefinitionId).toBe(PAGE_TYPE_STARTER_TEMPLATE_IDS.services);
    expect(menu.metadata.templateDefinitionId).toBe("restaurant-visual");
    expect(menu.blocks.map((block) => block.type)).toContain("productGrid");
    expect(menu.blocks.map((block) => block.type)).not.toContain("featuredMedia");
    expect(services.blocks.map((block) => block.type)).toContain("services");
    expect(landing.blocks.map((block) => block.type)).not.toEqual(menu.blocks.map((block) => block.type));
  });

  it("preserves the entered title in metadata and profile identity", () => {
    const config = createPageStarterConfig("  luz maria  ", "menu");

    expect(config.metadata.name).toBe("luz maria");
    expect(config.profile.name).toBe("luz maria");
  });
});
