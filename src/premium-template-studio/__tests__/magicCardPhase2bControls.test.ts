import { describe, expect, it } from "vitest";
import { getTemplateDefinition } from "../templates/definitions";
import { createInitialState, templateReducer } from "../state/templateReducer";
import type { BioTemplateConfig } from "../types";

function productPath(blockId: string, index: number, field: string) {
  return `content.products.${index}.${field}`;
}

describe("Magic card Phase 2B canonical controls", () => {
  it("routes control values through reducer history and preserves them through save/reload", async () => {
    const initial = getTemplateDefinition("catalog-default-v1").build();
    const block = initial.blocks.find((candidate) => candidate.type === "productGrid")!;
    const product = block.content.products![0]!;
    const initialTitle = product.title;
    const initialImage = product.imageUrl;
    let state = createInitialState(initial);

    state = templateReducer(state, {
      type: "patchBlockField",
      id: block.id,
      path: productPath(block.id, 0, "title"),
      value: "Título persistente",
    });
    expect(state.config.blocks[0]!.content.products![0]!.title).toBe("Título persistente");

    state = templateReducer(state, { type: "undo" });
    expect(state.config.blocks[0]!.content.products![0]!.title).toBe(initialTitle);
    state = templateReducer(state, { type: "redo" });
    expect(state.config.blocks[0]!.content.products![0]!.title).toBe("Título persistente");

    const patches: Array<[string, unknown]> = [
      ["typography.fontFamily", "Inter, system-ui, sans-serif"],
      ["typography.fontSize", 31],
      ["typography.textColor", "#2F6FED"],
      ["typography.fontWeight", 700],
      ["typography.textAlign", "center"],
      ["description", "Descripción persistente"],
      ["descriptionTypography.fontSize", 18],
      ["descriptionTypography.textColor", "#4A443C"],
      ["descriptionTypography.fontWeight", 600],
      ["descriptionTypography.textAlign", "right"],
      ["price", "$49.900"],
      ["priceTypography.fontSize", 21],
      ["priceTypography.textColor", "#B42318"],
      ["priceTypography.fontWeight", 700],
      ["priceTypography.textAlign", "right"],
      ["ctaLabel", "Comprar ahora"],
      ["ctaUrl", "#contacto-premium"],
      ["ctaStyle.backgroundColor", "#17140F"],
      ["ctaStyle.textColor", "#FFFFFF"],
      ["ctaStyle.radius", 14],
      ["ctaStyle.textAlign", "center"],
      ["imageUrl", ""],
      ["imageProvenance", undefined],
    ];
    for (const [path, value] of patches) {
      state = templateReducer(state, {
        type: "patchBlockField",
        id: block.id,
        path: productPath(block.id, 0, path),
        value,
      });
    }

    state = templateReducer(state, { type: "undo" });
    expect(state.config.blocks[0]!.content.products![0]!.imageUrl).toBe("");
    state = templateReducer(state, { type: "redo" });

    state = templateReducer(state, {
      type: "patchBlockField",
      id: block.id,
      path: "style.background",
      value: "#FBF9F6",
    });

    let saved: BioTemplateConfig | null = null;
    const storage = {
      async save(config: BioTemplateConfig) {
        saved = JSON.parse(JSON.stringify(config)) as BioTemplateConfig;
      },
      async load() {
        return saved;
      },
    };
    await storage.save(state.config);
    const reloaded = await storage.load();
    const reloadedProduct = reloaded!.blocks.find((candidate) => candidate.id === block.id)!.content
      .products![0]!;
    const reloadedBlock = reloaded!.blocks.find((candidate) => candidate.id === block.id)!;

    expect(reloadedProduct.title).toBe("Título persistente");
    expect(reloadedProduct.description).toBe("Descripción persistente");
    expect(reloadedProduct.price).toBe("$49.900");
    expect(reloadedProduct.imageUrl).toBe("");
    expect(reloadedProduct.imageUrl).not.toBe(initialImage);
    expect(reloadedProduct.typography?.fontSize).toBe(31);
    expect(reloadedProduct.priceTypography?.fontSize).toBe(21);
    expect(reloadedProduct.priceTypography?.textColor).toBe("#B42318");
    expect(reloadedProduct.priceTypography?.fontWeight).toBe(700);
    expect(reloadedProduct.priceTypography?.textAlign).toBe("right");
    expect(reloadedProduct.descriptionTypography?.fontWeight).toBe(600);
    expect(reloadedProduct.ctaLabel).toBe("Comprar ahora");
    expect(reloadedProduct.ctaUrl).toBe("#contacto-premium");
    expect(reloadedProduct.ctaStyle?.backgroundColor).toBe("#17140F");
    expect(reloadedBlock.style.background).toBe("#FBF9F6");
  });
});
