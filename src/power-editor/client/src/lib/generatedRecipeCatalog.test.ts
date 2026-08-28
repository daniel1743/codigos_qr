import { describe, expect, it } from "vitest";
import { hydrateCompositionPageConfig } from "./compositionModel";
import { GENERATED_RECIPE_CATALOG_VERSION, generatedRecipes } from "./generatedRecipeCatalog";

describe("generated recipe catalog", () => {
  it("expone las doce recetas V6 únicas del generador local", () => {
    expect(GENERATED_RECIPE_CATALOG_VERSION).toBe("diversity-v2");
    expect(generatedRecipes).toHaveLength(12);
    expect(new Set(generatedRecipes.map((recipe) => recipe.id)).size).toBe(12);
    expect(generatedRecipes.every((recipe) => recipe.pageConfig.version === 6)).toBe(true);
    expect(generatedRecipes.every((recipe) => recipe.pageConfig.composition?.kind === "root")).toBe(true);
  });

  it("entrega configuraciones que el editor puede hidratar sin persistencia", () => {
    const hydrated = generatedRecipes.map((recipe) => hydrateCompositionPageConfig(recipe.pageConfig));
    expect(hydrated).toHaveLength(12);
    expect(hydrated.every((page) => page.version === 6 && page.blocks.length > 0)).toBe(true);
  });
});
