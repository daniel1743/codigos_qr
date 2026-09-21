import { describe, expect, it } from "vitest";
import { createPageStarterConfig, PAGE_TYPE_STARTER_TEMPLATE_IDS } from "../pageStarterConfig";

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
    expect(landing.blocks.map((block) => block.type)).not.toEqual(
      menu.blocks.map((block) => block.type),
    );

    const catalog = createPageStarterConfig("Catalog QA", "catalog");
    const portfolio = createPageStarterConfig("Portfolio QA", "portfolio");
    const catalogText = JSON.stringify(catalog);
    const portfolioText = JSON.stringify(portfolio);
    expect(catalog.metadata.templateDefinitionId).toBe("store-bento");
    expect(portfolio.metadata.templateDefinitionId).toBe("portfolio-bento");
    expect(catalog.metadata.templateDefinitionId).not.toBe(portfolio.metadata.templateDefinitionId);
    expect(catalog.blocks.map((block) => block.type)).toContain("productGrid");
    expect(catalog.blocks.find((block) => block.type === "hero")?.content.title).toBe("Catalog QA");
    expect(catalogText).toContain("Productos y soluciones");
    expect(catalogText).toContain("Producto destacado");
    expect(catalogText).not.toContain("Hi, I'm Alex");
    expect(catalogText).not.toContain("Selected Works");
    expect(portfolioText).toContain("Selected Works");
  });

  it("preserves the entered title in metadata and profile identity", () => {
    const config = createPageStarterConfig("  luz maria  ", "menu");

    expect(config.metadata.name).toBe("luz maria");
    expect(config.profile.name).toBe("luz maria");
  });

  it.each([
    ["QA Menu Title", "menu"],
    ["Fusion Biotech", "catalog"],
    ["Daniel Fotografía", "portfolio"],
    ["Barbería Daniel", "services"],
  ] as const)(
    "uses the supplied title as the primary visible identity for %s",
    (title, pageType) => {
      const config = createPageStarterConfig(title, pageType);
      const hero = config.blocks.find((block) => block.type === "hero");

      expect(hero?.content.title).toBe(title);
      expect(config.profile.name).toBe(title);
    },
  );

  it("keeps menu and catalog supporting semantics independent from the page title", () => {
    const menu = createPageStarterConfig("QA Menu Title", "menu");
    const catalog = createPageStarterConfig("Fusion Biotech", "catalog");

    expect(menu.blocks.find((block) => block.type === "heading")?.content.title).toBe(
      "Nuestro menú",
    );
    expect(catalog.blocks.find((block) => block.type === "heading")?.content.title).toBe(
      "Productos destacados",
    );
    expect(JSON.stringify(menu)).not.toContain("Casa Mediterránea");
    expect(JSON.stringify(catalog)).not.toContain("Nuestro catálogo");
  });
});
