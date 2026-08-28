import { describe, expect, it } from "vitest";
import { hydrateCompositionPageConfig } from "./compositionModel";
import { GENERATED_RECIPE_CATALOG_VERSION, generatedRecipes } from "./generatedRecipeCatalog";
import { capabilityProfiles, getBlockStyle, getPublishIssues } from "./editorCandidateModel";

describe("generated recipe catalog", () => {
  it("expone las doce recetas V6 únicas del generador local", () => {
    expect(GENERATED_RECIPE_CATALOG_VERSION).toBe("premium-assets-v3");
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

  it("mantiene las doce recetas como plantillas premium editables", () => {
    const requiredCapabilities = Object.entries(capabilityProfiles.premium)
      .filter(([, enabled]) => typeof enabled === "boolean" ? enabled : true)
      .map(([key]) => key as keyof typeof capabilityProfiles.premium);

    expect(generatedRecipes.every((recipe) => recipe.pageConfig.profile === "premium")).toBe(true);
    expect(
      generatedRecipes.every((recipe) =>
        requiredCapabilities.every((capability) => recipe.pageConfig.capabilities[capability] === capabilityProfiles.premium[capability]),
      ),
    ).toBe(true);
    expect(generatedRecipes.every((recipe) => getPublishIssues(recipe.pageConfig).length === 0)).toBe(true);
  });

  it("cubre funciones premium, efectos, animaciones y partículas en el set de prueba", () => {
    const blockTypes = new Set(generatedRecipes.flatMap((recipe) => recipe.pageConfig.blocks.map((block) => block.type)));
    const requiredPremiumBlocks = ["video", "cards", "socials", "gallery", "products", "booking", "shape", "ring", "ornament", "frame", "particles"];
    const visualStyles = generatedRecipes.flatMap((recipe) => recipe.pageConfig.blocks.map(getBlockStyle));

    expect(requiredPremiumBlocks.filter((type) => !blockTypes.has(type as never))).toEqual([]);
    expect(visualStyles.some((style) => style.effectPreset !== "none")).toBe(true);
    expect(visualStyles.some((style) => style.motion.preset !== "none")).toBe(true);
    expect(generatedRecipes.some((recipe) => recipe.pageConfig.blocks.some((block) => block.type === "particles"))).toBe(true);
  });

  it("entrega heroes premium con banner, avatar y botones diferenciados", () => {
    expect(
      generatedRecipes.every((recipe) => {
        const banner = recipe.pageConfig.blocks.find((block) => block.type === "banner");
        const profile = recipe.pageConfig.blocks.find((block) => block.type === "profile");
        const links = recipe.pageConfig.blocks.find((block) => block.type === "links");
        const variants = new Set(
          ((links?.props.items ?? []) as Array<{ style?: { variant?: string } }>).map((item) => item.style?.variant),
        );

        return Boolean(
          banner?.enabled &&
          String(banner.props.imageUrl ?? "").startsWith("/power-editor-samples/banner-") &&
          String(profile?.props.avatarUrl ?? "").startsWith("/power-editor-samples/avatar-") &&
          variants.size >= 2,
        );
      }),
    ).toBe(true);
  });
});
