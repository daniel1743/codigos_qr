/**
 * V1.5 — archetype strategy packs.
 *
 * Reusable commercial/layout tendencies for whole CLASSES of businesses.
 * These bias composition; they never emit unsupported features.
 */

import type { BusinessArchetype, BusinessSignalsV1 } from "./business-signals";
import type { CompositionPattern } from "./composition-patterns";
import type { FutureBlockType } from "./future-blocks";
import type { FamilyId } from "./types";

export interface ArchetypeStrategy {
  id: BusinessArchetype;
  tendencies: string[];
  /** Additive family score bias, applied only when context is supplied. */
  family_bias: Partial<Record<FamilyId, number>>;
  preferred_patterns: CompositionPattern[];
  /** Future blocks in descending usefulness for this archetype. */
  future_block_priority: FutureBlockType[];
  /** 0-100 tendencies used by scoring and candidate biasing. */
  weights: {
    cta_pressure: number;
    trust: number;
    visual: number;
    locality: number;
  };
}

const S = (
  id: BusinessArchetype,
  tendencies: string[],
  family_bias: Partial<Record<FamilyId, number>>,
  preferred_patterns: CompositionPattern[],
  future_block_priority: FutureBlockType[],
  weights: ArchetypeStrategy["weights"],
): ArchetypeStrategy => ({
  id,
  tendencies,
  family_bias,
  preferred_patterns,
  future_block_priority,
  weights,
});

export const ARCHETYPE_STRATEGIES: Record<BusinessArchetype, ArchetypeStrategy> = {
  home_service: S(
    "home_service",
    [
      "Strong contact or quote CTA.",
      "Trust information early.",
      "Services high priority.",
      "Service area high priority.",
      "Reviews valuable.",
      "Before/after valuable when visual dependency is high.",
    ],
    { corporate: 20, minimal: 8 },
    ["conversion_first", "trust_first", "service_first"],
    [
      "services",
      "service_area",
      "trust_badges",
      "testimonials",
      "before_after",
      "quote_form",
      "hours",
      "faq",
      "sticky_primary_cta",
      "floating_contact",
    ],
    { cta_pressure: 90, trust: 80, visual: 45, locality: 90 },
  ),
  appointment_service: S(
    "appointment_service",
    [
      "Booking CTA dominant.",
      "Services visible.",
      "Visual proof prioritized when available.",
      "Hours/location useful.",
    ],
    { luxury: 12, creator: 8, corporate: 8 },
    ["conversion_first", "service_first", "visual_cover"],
    [
      "booking_widget",
      "services",
      "pricing",
      "gallery",
      "before_after",
      "hours",
      "location",
      "testimonials",
      "sticky_primary_cta",
    ],
    { cta_pressure: 88, trust: 60, visual: 80, locality: 70 },
  ),
  professional_service: S(
    "professional_service",
    [
      "Trust-first hierarchy.",
      "Professional identity prominent.",
      "Contact/consultation CTA.",
      "Certifications/reviews useful.",
      "Avoid excessive visual noise.",
    ],
    { corporate: 22, editorial: 10, minimal: 8 },
    ["trust_first", "editorial_stack", "conversion_first"],
    [
      "services",
      "trust_badges",
      "testimonials",
      "faq",
      "contact_form",
      "location",
      "pricing",
    ],
    { cta_pressure: 70, trust: 95, visual: 25, locality: 50 },
  ),
  custom_craft: S(
    "custom_craft",
    [
      "Portfolio/gallery priority.",
      "Quote CTA.",
      "Visual storytelling.",
      "Services / custom work explanation.",
    ],
    { editorial: 14, creator: 12, luxury: 8 },
    ["portfolio_first", "media_story", "service_first"],
    [
      "portfolio_grid",
      "gallery",
      "services",
      "quote_form",
      "before_after",
      "testimonials",
      "service_area",
    ],
    { cta_pressure: 65, trust: 60, visual: 92, locality: 60 },
  ),
  portfolio_service: S(
    "portfolio_service",
    ["Work samples before secondary navigation.", "Visual cards/gallery.", "Contact after proof."],
    { editorial: 16, creator: 12, minimal: 8 },
    ["portfolio_first", "media_story", "editorial_stack"],
    ["portfolio_grid", "gallery", "video", "testimonials", "services", "contact_form"],
    { cta_pressure: 55, trust: 50, visual: 95, locality: 20 },
  ),
  hospitality: S(
    "hospitality",
    ["Strong visual hero.", "Booking/visit CTA.", "Location and hours priority."],
    { luxury: 16, editorial: 10, creator: 6 },
    ["visual_cover", "conversion_first", "media_story"],
    ["gallery", "booking_widget", "location", "hours", "testimonials", "pricing", "faq"],
    { cta_pressure: 85, trust: 60, visual: 95, locality: 85 },
  ),
  food_service: S(
    "food_service",
    ["Appetite-driven visual hero.", "Visit/booking hierarchy.", "Hours and location critical."],
    { energetic: 12, luxury: 10, creator: 8 },
    ["visual_cover", "conversion_first", "compact_action"],
    ["gallery", "hours", "location", "products", "pricing", "booking_widget", "testimonials"],
    { cta_pressure: 80, trust: 50, visual: 92, locality: 95 },
  ),
  retail: S(
    "retail",
    ["Product/offer visibility.", "Purchase/contact hierarchy."],
    { energetic: 12, corporate: 10, creator: 6 },
    ["service_first", "conversion_first", "compact_action"],
    ["products", "pricing", "gallery", "hours", "location", "testimonials", "contact_form"],
    { cta_pressure: 88, trust: 55, visual: 80, locality: 80 },
  ),
  creator: S(
    "creator",
    ["Social-first navigation.", "Identity and audience over services.", "Fast link access."],
    { creator: 22, energetic: 12 },
    ["social_first", "centered_profile", "media_story"],
    ["gallery", "video", "portfolio_grid", "social_proof"],
    { cta_pressure: 55, trust: 25, visual: 90, locality: 5 },
  ),
  wellness: S(
    "wellness",
    ["Booking or contact conversion.", "Results and trust proof.", "Calm visual rhythm."],
    { minimal: 10, corporate: 10, editorial: 8 },
    ["conversion_first", "trust_first", "centered_profile"],
    ["services", "booking_widget", "testimonials", "pricing", "hours", "location", "faq"],
    { cta_pressure: 78, trust: 70, visual: 60, locality: 65 },
  ),
  education: S(
    "education",
    ["Explain program clearly.", "Trust and results.", "Contact/enroll CTA."],
    { corporate: 16, editorial: 10 },
    ["trust_first", "editorial_stack", "service_first"],
    ["services", "pricing", "testimonials", "faq", "contact_form", "video"],
    { cta_pressure: 70, trust: 85, visual: 35, locality: 25 },
  ),
  real_estate: S(
    "real_estate",
    ["Visual listings.", "Trust and track record.", "Direct contact."],
    { corporate: 18, editorial: 10 },
    ["trust_first", "portfolio_first", "conversion_first"],
    ["portfolio_grid", "gallery", "testimonials", "trust_badges", "contact_form", "location"],
    { cta_pressure: 82, trust: 88, visual: 80, locality: 88 },
  ),
  events: S(
    "events",
    ["Visual storytelling of past events.", "Quote conversion.", "Service area coverage."],
    { creator: 12, editorial: 10, luxury: 8 },
    ["media_story", "portfolio_first", "conversion_first"],
    ["gallery", "portfolio_grid", "services", "quote_form", "testimonials", "service_area"],
    { cta_pressure: 75, trust: 65, visual: 90, locality: 70 },
  ),
  local_business: S(
    "local_business",
    ["Location.", "Hours.", "Contact.", "Trust.", "Simple fast conversion."],
    { corporate: 14, minimal: 10 },
    ["compact_action", "conversion_first", "trust_first"],
    ["hours", "location", "services", "products", "testimonials", "floating_contact"],
    { cta_pressure: 85, trust: 65, visual: 40, locality: 95 },
  ),
  digital_service: S(
    "digital_service",
    ["Explain offer.", "Proof of results.", "Consultation CTA."],
    { minimal: 12, corporate: 12, editorial: 8 },
    ["editorial_stack", "trust_first", "conversion_first"],
    ["services", "portfolio_grid", "testimonials", "pricing", "faq", "contact_form"],
    { cta_pressure: 72, trust: 70, visual: 55, locality: 10 },
  ),
  generic: S(
    "generic",
    ["Balanced identity, action and navigation."],
    {},
    ["centered_profile", "conversion_first", "editorial_stack"],
    ["services", "testimonials", "location", "hours", "contact_form"],
    { cta_pressure: 65, trust: 55, visual: 50, locality: 45 },
  ),
};

export function getArchetypeStrategy(signals: BusinessSignalsV1): ArchetypeStrategy {
  return ARCHETYPE_STRATEGIES[signals.archetype];
}
