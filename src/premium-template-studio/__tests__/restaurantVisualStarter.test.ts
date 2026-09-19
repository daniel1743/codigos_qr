import { describe, expect, it } from "vitest";
import { getTemplateDefinition } from "../templates/definitions";

describe("Restaurant Visual menu starter", () => {
  it("uses menu-oriented blocks instead of creator portfolio defaults", () => {
    const config = getTemplateDefinition("restaurant-visual").build();
    const blockTypes = config.blocks.map((block) => block.type);

    expect(config.metadata.templateDefinitionId).toBe("restaurant-visual");
    expect(blockTypes).toContain("productGrid");
    expect(blockTypes).not.toContain("featuredMedia");
    expect(blockTypes).not.toContain("portfolio");

    const serialized = JSON.stringify(config);
    expect(serialized).toContain("Casa Mediterránea");
    expect(serialized).toContain("Pasta de la casa");
    expect(serialized).toContain("Reservar una mesa");
    expect(serialized).toContain("Cocina mediterránea");
    expect(serialized).toContain("Nuestro menú");
    expect(serialized).not.toContain("Legal Counsel You Can Trust");
    expect(serialized).not.toContain("Boutique Law Firm");
    expect(serialized).not.toContain("Wireless Mouse");
    expect(serialized).not.toContain("Mechanical Keyboard");
    expect(serialized).not.toContain("Creative Director");
    expect(serialized).not.toContain("Diseño productos y experiencias digitales.");
    expect(serialized).not.toContain('"Shop"');
  });
});
