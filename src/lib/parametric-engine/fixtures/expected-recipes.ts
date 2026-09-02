/**
 * Deterministic EXPECTED OUTPUT SUMMARIES for the sample intents.
 *
 * Only the decision-bearing fields are asserted (family, palette accent,
 * geometry, composition, block order). Full recipes are intentionally not
 * snapshotted: they would freeze cosmetic detail and make safe extension
 * impossible. Any change to these values is a behavioural change and must
 * be reviewed.
 *
 * Produced with DEFAULT_CAPABILITIES and options.variant = 0.
 */

import type { FamilyId, PageRecipeV1 } from "../types";

export interface ExpectedRecipeSummary {
  family: FamilyId;
  accent: string;
  background_type: PageRecipeV1["design"]["background"]["type"];
  radius: PageRecipeV1["design"]["geometry"]["radius"];
  density: PageRecipeV1["design"]["geometry"]["density"];
  heading_family: string;
  button_style: string;
  cards_enabled: boolean;
  presentation: PageRecipeV1["structure"]["primary_action"]["presentation"];
  cta_label: string;
  blocks: string[];
}

export const EXPECTED_RECIPES: Record<string, ExpectedRecipeSummary> = {
  "beauty-booking-elegant": {
    family: "luxury",
    accent: "#C8B27A",
    background_type: "radial-gradient",
    radius: "soft",
    density: "balanced",
    heading_family: "serif-text",
    button_style: "solid",
    cards_enabled: true,
    presentation: "button",
    cta_label: "Reservar",
    blocks: ["hero", "identity", "primary_cta", "link_list", "footer"],
  },
  "beauty-whatsapp-premium": {
    family: "luxury",
    accent: "#C9A227",
    background_type: "radial-gradient",
    radius: "soft",
    density: "balanced",
    heading_family: "serif-text",
    button_style: "solid",
    cards_enabled: true,
    presentation: "button",
    cta_label: "Más información",
    blocks: ["hero", "identity", "primary_cta", "link_list", "footer"],
  },
  "professional-leads-professional": {
    family: "corporate",
    accent: "#1D4ED8",
    background_type: "solid",
    radius: "soft",
    density: "balanced",
    heading_family: "sans-neutral",
    button_style: "solid",
    cards_enabled: true,
    presentation: "professional_card",
    cta_label: "Más información",
    blocks: ["hero", "identity", "professional_card", "link_list", "footer"],
  },
  "professional-portfolio-minimal": {
    family: "minimal",
    accent: "#111111",
    background_type: "solid",
    radius: "sharp",
    density: "spacious",
    heading_family: "sans-neutral",
    button_style: "outline",
    cards_enabled: false,
    presentation: "button",
    cta_label: "Ver mi trabajo",
    blocks: ["hero", "identity", "primary_cta", "link_list", "footer"],
  },
  "creator-social-energetic": {
    family: "creator",
    accent: "#C2410C",
    background_type: "linear-gradient",
    radius: "rounded",
    density: "balanced",
    heading_family: "sans-geometric",
    button_style: "soft",
    cards_enabled: false,
    presentation: "button",
    cta_label: "Visitar",
    blocks: ["hero", "identity", "social_links", "primary_cta", "link_list", "footer"],
  },
  "creator-portfolio-modern": {
    family: "creator",
    accent: "#7C3AED",
    background_type: "linear-gradient",
    radius: "rounded",
    density: "balanced",
    heading_family: "sans-humanist",
    button_style: "soft",
    cards_enabled: true,
    presentation: "professional_card",
    cta_label: "Ver mi trabajo",
    blocks: ["hero", "identity", "professional_card", "social_links", "link_list", "media", "footer"],
  },
  "food-booking-premium": {
    family: "luxury",
    accent: "#C9A227",
    background_type: "radial-gradient",
    radius: "soft",
    density: "balanced",
    heading_family: "serif-text",
    button_style: "solid",
    cards_enabled: true,
    presentation: "button",
    cta_label: "Reservar",
    blocks: ["hero", "identity", "primary_cta", "social_links", "link_list", "footer"],
  },
  "fitness-leads-energetic": {
    family: "energetic",
    accent: "#6D28D9",
    background_type: "linear-gradient",
    radius: "pill",
    density: "compact",
    heading_family: "sans-geometric",
    button_style: "solid",
    cards_enabled: true,
    presentation: "button",
    cta_label: "Más información",
    blocks: ["hero", "identity", "primary_cta", "link_list", "footer"],
  },
  "freelancer-portfolio-minimal": {
    family: "minimal",
    accent: "#111111",
    background_type: "solid",
    radius: "sharp",
    density: "spacious",
    heading_family: "sans-humanist",
    button_style: "outline",
    cards_enabled: false,
    presentation: "button",
    cta_label: "Ver mi trabajo",
    blocks: ["hero", "identity", "primary_cta", "social_links", "link_list", "footer"],
  },
  "local-whatsapp-professional": {
    family: "corporate",
    accent: "#155E75",
    background_type: "solid",
    radius: "soft",
    density: "balanced",
    heading_family: "sans-neutral",
    button_style: "solid",
    cards_enabled: true,
    presentation: "button",
    cta_label: "Más información",
    blocks: ["hero", "identity", "primary_cta", "link_list", "footer"],
  },
};

export function summarize(recipe: PageRecipeV1): ExpectedRecipeSummary {
  return {
    family: recipe.meta.family,
    accent: recipe.design.palette.accent,
    background_type: recipe.design.background.type,
    radius: recipe.design.geometry.radius,
    density: recipe.design.geometry.density,
    heading_family: recipe.design.typography.heading_family,
    button_style: recipe.design.button.style,
    cards_enabled: recipe.design.card.enabled,
    presentation: recipe.structure.primary_action.presentation,
    cta_label: recipe.structure.primary_action.cta_label,
    blocks: recipe.blocks.map((b) => b.type),
  };
}
