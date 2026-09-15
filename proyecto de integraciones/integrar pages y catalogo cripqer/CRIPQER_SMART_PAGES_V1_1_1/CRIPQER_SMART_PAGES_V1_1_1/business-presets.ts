/**
 * CRIPQER SMART PAGES V1 — semantic presets.
 *
 * These are NOT per-industry engines. A preset is a small set of semantic
 * defaults (experience type, section order, CTA intent) that the single
 * orchestrator combines with real content capabilities and the user goal.
 */

import type { ExperienceType, PageGoal, SectionKind } from "./smart-pages.types";
import type { SalesActionKind } from "./catalog.types";

export interface SemanticPreset {
  id: string;
  /** Business types (normalized to lowercase slugs) matched by this preset. */
  match: string[];
  experienceType: ExperienceType;
  goal: PageGoal;
  /** Preferred order of section kinds; unavailable ones are dropped. */
  sequence: SectionKind[];
  primaryActionKind: SalesActionKind;
  secondaryActionKinds: SalesActionKind[];
  catalogTitle: string;
}

export const GENERIC_PRESET: SemanticPreset = {
  id: "generic",
  match: [],
  experienceType: "landing",
  goal: "contact",
  sequence: [
    "hero",
    "about",
    "serviceGrid",
    "gallery",
    "testimonials",
    "faq",
    "location",
    "contact",
    "whatsappCta",
    "footer",
  ],
  primaryActionKind: "contact",
  secondaryActionKinds: ["whatsapp", "call"],
  catalogTitle: "What we offer",
};

export const SEMANTIC_PRESETS: SemanticPreset[] = [
  {
    id: "food_service",
    match: ["restaurant", "cafe", "coffee", "bakery", "bar", "food", "pizzeria", "restaurante", "panaderia"],
    experienceType: "menu",
    goal: "sell",
    sequence: [
      "hero",
      "categoryNav",
      "featured",
      "menuSections",
      "gallery",
      "location",
      "whatsappCta",
      "contact",
      "footer",
    ],
    primaryActionKind: "whatsapp",
    secondaryActionKinds: ["call", "external_url"],
    catalogTitle: "Menu",
  },
  {
    id: "care_service",
    match: ["veterinarian", "vet", "clinic", "dentist", "doctor", "therapist", "spa", "veterinaria"],
    experienceType: "services",
    goal: "book",
    sequence: [
      "hero",
      "serviceGrid",
      "team",
      "testimonials",
      "faq",
      "location",
      "bookingCta",
      "contact",
      "footer",
    ],
    primaryActionKind: "external_booking",
    secondaryActionKinds: ["whatsapp", "call"],
    catalogTitle: "Services",
  },
  {
    id: "appointment_service",
    match: ["hairdresser", "salon", "barber", "nails", "beauty", "peluqueria", "barberia", "tattoo"],
    experienceType: "services",
    goal: "book",
    sequence: [
      "hero",
      "serviceGrid",
      "pricing",
      "gallery",
      "testimonials",
      "bookingCta",
      "whatsappCta",
      "location",
      "footer",
    ],
    primaryActionKind: "whatsapp",
    secondaryActionKinds: ["external_booking", "call"],
    catalogTitle: "Services & prices",
  },
  {
    id: "craft_service",
    match: ["tailor", "carpenter", "designer", "agency", "studio", "sastre", "artesano", "contractor"],
    experienceType: "portfolio",
    goal: "quote",
    sequence: [
      "hero",
      "serviceGrid",
      "portfolioGrid",
      "pricing",
      "testimonials",
      "quoteCta",
      "contact",
      "footer",
    ],
    primaryActionKind: "quote",
    secondaryActionKinds: ["whatsapp", "email"],
    catalogTitle: "Work & services",
  },
  {
    id: "visual_portfolio",
    match: ["photographer", "videographer", "artist", "illustrator", "fotografo", "photography"],
    experienceType: "portfolio",
    goal: "showcase",
    sequence: [
      "hero",
      "categoryNav",
      "portfolioGrid",
      "about",
      "testimonials",
      "quoteCta",
      "contact",
      "footer",
    ],
    primaryActionKind: "quote",
    secondaryActionKinds: ["whatsapp", "email"],
    catalogTitle: "Portfolio",
  },
  {
    id: "listings",
    match: ["real_estate", "realtor", "property", "vehicles", "cars", "equipment", "inmobiliaria", "b2b"],
    experienceType: "listings",
    goal: "contact",
    sequence: [
      "hero",
      "search",
      "filterBar",
      "listingGrid",
      "about",
      "contact",
      "whatsappCta",
      "footer",
    ],
    primaryActionKind: "whatsapp",
    secondaryActionKinds: ["contact", "call"],
    catalogTitle: "Listings",
  },
  {
    id: "retail_catalog",
    match: ["retail", "store", "shop", "boutique", "tienda", "ecommerce", "market"],
    experienceType: "catalog",
    goal: "sell",
    sequence: [
      "hero",
      "categoryNav",
      "search",
      "featured",
      "productGrid",
      "faq",
      "whatsappCta",
      "contact",
      "footer",
    ],
    primaryActionKind: "whatsapp",
    secondaryActionKinds: ["contact", "call"],
    catalogTitle: "Catalog",
  },
];

export function resolvePreset(businessType: string): SemanticPreset {
  const key = businessType.trim().toLowerCase().replace(/\s+/g, "_");
  for (const preset of SEMANTIC_PRESETS) {
    if (preset.match.some((m) => key === m || key.includes(m))) return preset;
  }
  return GENERIC_PRESET;
}
