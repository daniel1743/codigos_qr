import { test, expect } from "@playwright/test";

import { validateTemplateConfig } from "../../src/lib/template-factory/config";
import { generateTemplate } from "../../src/lib/template-factory/generator";
import type { IndustryId } from "../../src/lib/template-factory/industries";
import {
  TEMPLATE_PALETTES,
  getPalettesForIndustry,
  getTemplatePalette,
  paletteToThemeAppearance,
  type SemanticPaletteTokens,
} from "../../src/lib/template-factory/palettes";
import { openRenderer, loadConfig, validateInRenderer } from "./helpers/renderer";

const REQUIRED_TOKENS: (keyof SemanticPaletteTokens)[] = [
  "background",
  "surface",
  "textPrimary",
  "textSecondary",
  "accent",
  "accentSoft",
  "border",
];

const MINIMUM_NAMES = [
  "Obsidian Gold",
  "Platinum Graphite",
  "Rose Platinum",
  "Silver Frost",
  "Champagne Noir",
  "Ivory Bronze",
  "Clinical Trust",
  "Executive Medical",
  "Calm Teal",
  "Luxury Clinic",
  "Warm Wellness",
  "Legal Heritage",
  "Executive Navy",
  "Burgundy Brass",
  "Graphite Counsel",
  "Ivory Executive",
  "Emerald Care",
  "Calm Veterinary",
  "Forest Cream",
  "Modern Teal",
  "Hospitality Terracotta",
  "Gourmet Noir",
  "Mediterranean",
  "Coffee Heritage",
  "Modern Bistro",
  "Barber Heritage",
  "Black Gold",
  "Urban Steel",
  "Classic Bronze",
  "Beauty Champagne",
  "Soft Luxury",
  "Modern Nude",
  "Midnight Beauty",
  "Editorial Creator",
  "Midnight Magenta",
  "Minimal Monochrome",
  "Electric Creator",
  "Warm Editorial",
  "Real Estate Executive",
  "Stone Luxury",
  "Navy Champagne",
  "Modern Architectural",
  "Fitness Carbon",
  "Performance Blue",
  "Electric Lime",
  "Dark Athletic",
  "Gaming Emerald",
  "Midnight Gold",
  "Electric Blue",
  "Dark Neon",
];

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

test.describe("Template Factory palette registry", () => {
  test("resuelve todas las paletas requeridas con tokens completos, IDs únicos y contraste legible", () => {
    const ids = TEMPLATE_PALETTES.map((palette) => palette.id);
    expect(new Set(ids).size, "IDs duplicados").toBe(ids.length);

    for (const name of MINIMUM_NAMES) {
      expect(
        TEMPLATE_PALETTES.some((palette) => palette.name === name),
        `paleta mínima ausente: ${name}`,
      ).toBe(true);
    }

    for (const palette of TEMPLATE_PALETTES) {
      expect(getTemplatePalette(palette.id)).toBe(palette);
      expect(palette.industries.length, `${palette.name}: industrias`).toBeGreaterThan(0);
      for (const token of REQUIRED_TOKENS) {
        expect(palette.tokens[token], `${palette.name}: token ${token}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
      expect(
        contrast(palette.tokens.textPrimary, palette.tokens.background),
        `${palette.name}: textPrimary/background`,
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(palette.tokens.textPrimary, palette.tokens.surface),
        `${palette.name}: textPrimary/surface`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("el generador selecciona paletas determinísticas y variadas por industria", () => {
    const industries: IndustryId[] = ["medical", "legal", "restaurant", "barber"];
    for (const industry of industries) {
      expect(getPalettesForIndustry(industry).length, `${industry}: paletas disponibles`).toBeGreaterThanOrEqual(4);

      const generated = [0, 1, 2, 3, 4].map((index) =>
        generateTemplate({
          industry,
          recipe: "auto",
          buttonCount: ((index % 5) + 1) as 1 | 2 | 3 | 4 | 5,
          seed: `palette-registry-${industry}`,
          batchId: "palette-registry-test",
          index,
        }),
      );

      const rerun = generateTemplate({
        industry,
        recipe: "auto",
        buttonCount: 3,
        seed: `palette-registry-${industry}-fixed`,
        batchId: "palette-registry-determinism",
        index: 2,
      });
      const rerunAgain = generateTemplate({
        industry,
        recipe: "auto",
        buttonCount: 3,
        seed: `palette-registry-${industry}-fixed`,
        batchId: "palette-registry-determinism",
        index: 2,
      });

      expect(JSON.stringify(rerun.config)).toBe(JSON.stringify(rerunAgain.config));
      expect(rerun.metadata.paletteId).toBe(rerunAgain.metadata.paletteId);
      expect(rerun.metadata.paletteTokens).toEqual(rerunAgain.metadata.paletteTokens);
      expect(new Set(generated.map((item) => item.metadata.paletteId)).size, `${industry}: variedad de paletas`).toBeGreaterThan(1);

      for (const item of generated) {
        const appearance = paletteToThemeAppearance(getTemplatePalette(item.metadata.paletteId));
        expect(item.config.appearance.bgStart).toBe(appearance.bgStart);
        expect(item.config.appearance.textPrimary).toBe(item.metadata.paletteTokens.textPrimary);
        expect(validateTemplateConfig(item.config).valid).toBe(true);
      }
    }
  });

  test("el renderer acepta colores resueltos por paleta y templates existentes siguen cargando", async ({
    page,
  }) => {
    await openRenderer(page);

    const generated = generateTemplate({
      industry: "restaurant",
      recipe: "restaurant_premium",
      buttonCount: 4,
      seed: "palette-renderer-acceptance",
      batchId: "palette-renderer",
      index: 0,
    });
    const loadResult = await loadConfig(page, generated.config);
    const rendererValidation = await validateInRenderer(page, generated.config);

    expect(loadResult.ok).toBe(true);
    expect(rendererValidation.valid).toBe(true);
    expect(rendererValidation.errors).toEqual([]);
  });
});
