/**
 * Template Factory — Sistema de recetas
 * PASS C · generator-v1
 *
 * Una receta describe una combinación COHERENTE de capacidades que el editor
 * ya soporta. No introduce capacidades nuevas: solo restringe el espacio de
 * variación a combinaciones que sabemos que se ven bien.
 *
 * `ctaPriority` define el orden de importancia de los roles de acción. El motor
 * de conteo (1..5 botones) recorta esa lista por prioridad, de modo que un
 * template de 1 botón conserve el CTA primario y no un enlace secundario.
 */

import type { ActionRole, IndustryId } from "./industries";
import type { ButtonPresetId, ThemeId } from "./registries";
import { BTN_RADII, PROFILE_RADII } from "./registries";

export type BtnRadiusValue = (typeof BTN_RADII)[number];
export type ProfileRadiusValue = (typeof PROFILE_RADII)[number];

export interface Recipe {
  id: string;
  label: string;
  industry: IndustryId;
  /** Temas admitidos, en orden de preferencia. */
  themes: readonly ThemeId[];
  /** Presets de botón admitidos. */
  buttonPresets: readonly ButtonPresetId[];
  /** Prioridad de roles: el primero sobrevive incluso con buttonCount = 1. */
  ctaPriority: readonly ActionRole[];
  /** Formas de avatar coherentes con el estilo de la receta. */
  profileRadii: readonly ProfileRadiusValue[];
  /** Redondeos de botón coherentes con el estilo. */
  btnRadii: readonly BtnRadiusValue[];
  /** Columnas de grilla admitidas (1 = lista, 2 = grid). */
  gridCols: readonly (1 | 2)[];
  /** Rango de cantidad de socials a incluir. */
  socialRange: readonly [number, number];
  /** Probabilidad de usar banner cuando la industria tiene banners. */
  bannerProbability: number;
  /** Etiqueta de estilo que se persiste como metadata. */
  style: string;
}

export const RECIPES: Record<string, Recipe> = {
  medical_clean: {
    id: "medical_clean",
    label: "Salud · Limpio",
    industry: "medical",
    themes: ["premium-white", "executive-blue", "emerald-luxury"],
    buttonPresets: ["solid", "outline", "premium"],
    ctaPriority: ["primary", "contact", "info", "location", "social"],
    profileRadii: ["50%", "24px"],
    btnRadii: ["16px", "9999px"],
    gridCols: [1, 2],
    socialRange: [1, 3],
    bannerProbability: 0.6,
    style: "profesional",
  },

  lawyer_executive: {
    id: "lawyer_executive",
    label: "Legal · Ejecutivo",
    industry: "legal",
    themes: ["black-gold", "executive-blue", "graphite"],
    buttonPresets: ["solid", "outline", "premium", "minimal"],
    ctaPriority: ["primary", "contact", "info", "location", "social"],
    profileRadii: ["24px", "0px", "50%"],
    btnRadii: ["0px", "16px"],
    gridCols: [1, 2],
    socialRange: [1, 3],
    bannerProbability: 0.5,
    style: "ejecutivo",
  },

  restaurant_premium: {
    id: "restaurant_premium",
    label: "Restaurante · Premium",
    industry: "restaurant",
    themes: ["burgundy-elegant", "black-gold", "ivory-gold"],
    buttonPresets: ["premium", "glass", "solid"],
    ctaPriority: ["primary", "info", "contact", "location", "social"],
    profileRadii: ["50%", "24px"],
    btnRadii: ["9999px", "16px"],
    gridCols: [1, 2],
    socialRange: [2, 4],
    bannerProbability: 0.85,
    style: "premium",
  },

  barber_modern: {
    id: "barber_modern",
    label: "Barbería · Moderno",
    industry: "barber",
    themes: ["graphite", "black-silver", "black-gold"],
    buttonPresets: ["outline", "minimal", "soft", "solid"],
    ctaPriority: ["primary", "contact", "info", "location", "social"],
    profileRadii: ["0px", "24px", "50%"],
    btnRadii: ["0px", "16px"],
    gridCols: [1, 2],
    socialRange: [2, 3],
    bannerProbability: 0.7,
    style: "moderno",
  },
};

export const RECIPE_IDS = Object.keys(RECIPES);

/** Recetas disponibles para una industria dada. */
export function getRecipesForIndustry(industry: IndustryId): Recipe[] {
  return Object.values(RECIPES).filter((recipe) => recipe.industry === industry);
}

export function getRecipe(recipeId: string): Recipe {
  const recipe = RECIPES[recipeId];
  if (!recipe) throw new Error(`Receta desconocida: ${recipeId}`);
  return recipe;
}

/**
 * Receta por defecto de una industria. Se usa cuando el input pide
 * `recipe: "auto"`.
 */
export function getDefaultRecipe(industry: IndustryId): Recipe {
  const candidates = getRecipesForIndustry(industry);
  if (candidates.length === 0) {
    throw new Error(`La industria ${industry} no tiene recetas registradas`);
  }
  return candidates[0]!;
}
