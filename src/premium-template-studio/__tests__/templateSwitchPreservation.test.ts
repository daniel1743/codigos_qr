import { describe, expect, it } from "vitest";
import { createDemoConfig } from "../templates/definitions";
import { applyTemplateDefinition } from "../engine/TemplateFactory";

describe("template switching owner content preservation", () => {
  it("keeps the full block composition and owner media/link fields", () => {
    const current = createDemoConfig();
    current.blocks[0]!.content = {
      ...current.blocks[0]!.content,
      products: [
        {
          id: "product-a",
          title: "Producto A",
          price: "$10",
          description: "Descripción real",
          imageUrl: "https://cdn.example/product-a.jpg",
          ctaLabel: "Comprar",
          ctaUrl: "https://example.com/product-a",
        },
      ],
    };

    const switched = applyTemplateDefinition(current, "executive-premium-002");

    expect(switched.templateDefinitionId).toBe("executive-premium-002");
    expect(switched.blocks).toEqual(current.blocks);
    expect(switched.blocks).not.toBe(current.blocks);
    expect(switched.blocks[0]!.content.products).toEqual(current.blocks[0]!.content.products);
  });
});
