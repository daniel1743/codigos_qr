import { describe, expect, it } from "vitest";
import { createPageStarterConfig } from "../../components/power-editor/pageStarterConfig";
import { getTemplateDefinition } from "../templates/definitions";

describe("catalog-default-v1 approved reference starter", () => {
  it("keeps the approved catalog fingerprint", () => {
    const config = getTemplateDefinition("catalog-default-v1").build();

    expect(config.metadata.templateDefinitionId).toBe("catalog-default-v1");
    expect(config.theme.id).toBe("warm");
    expect(config.layout.id).toBe("centered");
    expect(config.blocks.map((block) => block.type)).toEqual(["productGrid", "heading", "contact"]);
    expect(config.blocks[0]?.content.products).toHaveLength(3);
    expect(config.profile.showAvatar).toBe(false);
    expect(config.profile.banner.widthMode).toBe("full-bleed");
  });

  it("allocates document-local block and product identities per new build", () => {
    const first = getTemplateDefinition("catalog-default-v1").build();
    const second = getTemplateDefinition("catalog-default-v1").build();
    const firstProductGrid = first.blocks.find((block) => block.type === "productGrid")!;
    const secondProductGrid = second.blocks.find((block) => block.type === "productGrid")!;

    expect(first.blocks.map((block) => block.id)).not.toEqual(
      second.blocks.map((block) => block.id),
    );
    expect(firstProductGrid.content.products?.map((product) => product.id)).not.toEqual(
      secondProductGrid.content.products?.map((product) => product.id),
    );
  });

  it("propagates a new catalog title without replacing supporting copy", () => {
    const config = createPageStarterConfig("QA Premium Catalog Direct Edit", "catalog");

    expect(config.metadata.templateDefinitionId).toBe("catalog-default-v1");
    expect(config.metadata.name).toBe("QA Premium Catalog Direct Edit");
    expect(config.profile.name).toBe("QA Premium Catalog Direct Edit");
    expect(config.blocks.find((block) => block.type === "heading")?.content.title).toBe(
      "Productos destacados",
    );
  });
});
