import { describe, expect, it } from "vitest";
import { clonePageConfig, getBlock, initialPageConfig } from "./editorCandidateModel";
import { ALL_PALETTE_SCOPES, applyPremiumPalette, paletteContrast, premiumPalettes, scopesForPaletteMode } from "./premiumPalettes";

describe("premiumPalettes", () => {
  it("expone las 24 paletas solicitadas con identidades y roles completos", () => {
    expect(premiumPalettes).toHaveLength(24);
    expect(new Set(premiumPalettes.map(palette => palette.id)).size).toBe(24);
    expect(new Set(premiumPalettes.map(palette => palette.category))).toEqual(new Set(["Lujo y elegancia", "Editorial y minimalista", "Elegante y sofisticada", "Moderna y creativa", "Natural y premium"]));
    premiumPalettes.forEach(palette => {
      expect(palette.colors.backgroundPrimary).toMatch(/^#[0-9A-F]{6}$/i);
      expect(palette.colors.buttonPrimaryText).toMatch(/^#[0-9A-F]{6}$/i);
      expect(palette.colors.shadow).toMatch(/rgba\(/);
    });
  });

  it("valida contraste suficiente para texto principal y texto de botón", () => {
    const failing = premiumPalettes.flatMap(palette => {
      const contrast = paletteContrast(palette);
      return [
        ...(contrast.textPass ? [] : [`${palette.name}: texto/fondo ${contrast.textOnBackground.toFixed(2)}`]),
        ...(contrast.buttonPass ? [] : [`${palette.name}: botón ${contrast.buttonTextOnButton.toFixed(2)}`]),
      ];
    });
    expect(failing).toEqual([]);
  });

  it("aplica la paleta completa sin mutar PageConfig y conserva su referencia", () => {
    const original = clonePageConfig(initialPageConfig);
    const next = applyPremiumPalette(original, "imperial_gold", ALL_PALETTE_SCOPES);
    const originalLinks = getBlock(original, "links"); const nextLinks = getBlock(next, "links");
    expect(next).not.toBe(original);
    expect(original.background.base).toBe("#171b24");
    expect(next.background.base).toBe("#0B0B0C");
    expect(next.theme.titleColor).toBe("#F5F0E6");
    expect(next.palette).toMatchObject({ selectedId: "imperial_gold", appliedScopes: ALL_PALETTE_SCOPES });
    expect((originalLinks?.props["items"] as Array<{ style?: { color?: string } }>)[0]?.["style"]?.["color"]).toBeUndefined();
    expect((nextLinks?.props["items"] as Array<{ style?: { color?: string; textColor?: string } }>)[0]?.["style"]).toMatchObject({ color: "#D4AF37", textColor: "#111111" });
  });

  it("aplica ámbitos parciales sin sobrescribir colores fuera de la selección", () => {
    const original = clonePageConfig(initialPageConfig);
    const next = applyPremiumPalette(original, "platinum", scopesForPaletteMode("borders"));
    expect(next.background).toEqual(original.background);
    expect(next.theme).toEqual(original.theme);
    expect(getBlock(next, "heading")?.props["color"]).toBeUndefined();
    expect(getBlock(next, "heading")?.props["style"]).toMatchObject({ border: { color: "#5B646E" } });
  });

  it("aplica roles visibles a tarjetas enriquecidas sin mutar sus estilos anidados originales", () => {
    const original = clonePageConfig(initialPageConfig);
    const withCard = { ...original, blocks: [...original.blocks, { id: "palette-card", type: "cards" as const, enabled: true, props: { items: [{ id: "card-1", title: "Tarjeta", description: "Descripción", background: "#111111", borderColor: "#222222", titleStyle: { color: "#ffffff" }, descriptionStyle: { color: "#eeeeee" }, ctaStyle: { color: "#dddddd" } }] } }] };
    const next = applyPremiumPalette(withCard, "ivory_studio", ALL_PALETTE_SCOPES);
    const originalCard = getBlock(withCard, "palette-card")?.props["items"] as Array<{ background?: string; borderColor?: string; titleStyle?: { color?: string } }>;
    const nextCard = getBlock(next, "palette-card")?.props["items"] as Array<{ background?: string; borderColor?: string; titleStyle?: { color?: string }; descriptionStyle?: { color?: string }; ctaStyle?: { color?: string } }>;
    expect(originalCard[0]).toMatchObject({ background: "#111111", borderColor: "#222222", titleStyle: { color: "#ffffff" } });
    expect(nextCard[0]).toMatchObject({ background: "#FFFFFF", borderColor: "#C9BFAF", titleStyle: { color: "#292622" }, descriptionStyle: { color: "#716B62" }, ctaStyle: { color: "#F7F1E7" } });
  });
});
