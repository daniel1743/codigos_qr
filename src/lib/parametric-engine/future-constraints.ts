/**
 * V1.5.1 — EXECUTABLE future block constraints.
 *
 * V1.5 declared block constraints as human-readable strings. A constraint
 * that only exists as prose is not a constraint: this module turns each one
 * into a deterministic typed predicate evaluated by the future plan.
 *
 * The descriptions stay in future-blocks.ts for debugging; the predicates
 * here decide what may ever be recommended.
 */

import type { BusinessSignalsV1 } from "./business-signals";
import { contentCount, hasContent, type ContentInventoryV1 } from "./content-inventory";
import type { FutureBlockType } from "./future-blocks";

export interface ConstraintInput {
  content: ContentInventoryV1;
  signals: BusinessSignalsV1;
}

export interface ConstraintCheck {
  satisfied: boolean;
  reasons: string[];
}

export type ConstraintPredicate = (input: ConstraintInput) => ConstraintCheck;

const ok: ConstraintCheck = { satisfied: true, reasons: [] };
const fail = (...reasons: string[]): ConstraintCheck => ({ satisfied: false, reasons });

/**
 * A before/after pair needs TWO assets. The content contract counts assets,
 * not pairs, so a single image can never justify the block.
 */
const MIN_BEFORE_AFTER_ASSETS = 2;

export const FUTURE_BLOCK_CONSTRAINTS: Partial<Record<FutureBlockType, ConstraintPredicate>> = {
  services: ({ content }) =>
    hasContent(content, "services") && contentCount(content, "services") >= 1
      ? ok
      : fail("constraint:services_requires_at_least_one_service"),

  service_area: ({ content, signals }) => {
    if (!hasContent(content, "service_areas")) return fail("constraint:service_areas_missing");
    if (signals.locality !== "service_area" && signals.locality !== "multi_location") {
      return fail("constraint:locality_not_area_based");
    }
    return ok;
  },

  gallery: ({ content }) =>
    hasContent(content, "gallery") && contentCount(content, "gallery") >= 1
      ? ok
      : fail("constraint:gallery_requires_images"),

  portfolio_grid: ({ content }) =>
    hasContent(content, "portfolio") && contentCount(content, "portfolio") >= 2
      ? ok
      : fail("constraint:portfolio_grid_requires_two_items"),

  before_after: ({ content }) => {
    if (!hasContent(content, "before_after")) return fail("constraint:before_after_missing");
    if (contentCount(content, "before_after") < MIN_BEFORE_AFTER_ASSETS) {
      return fail("constraint:before_after_requires_complete_pair");
    }
    if (contentCount(content, "before_after") % 2 !== 0) {
      return fail("constraint:before_after_requires_paired_assets");
    }
    return ok;
  },

  testimonials: ({ content, signals }) => {
    if (!hasContent(content, "testimonials")) return fail("constraint:testimonials_missing");
    if (signals.trust_requirement === "low") return fail("constraint:trust_requirement_low");
    return ok;
  },

  social_proof: ({ content }) =>
    hasContent(content, "trust_facts") ? ok : fail("constraint:trust_facts_missing"),

  faq: ({ content }) => (hasContent(content, "faq") ? ok : fail("constraint:faq_missing")),

  hours: ({ content, signals }) => {
    if (!hasContent(content, "hours")) return fail("constraint:hours_missing");
    if (signals.delivery_mode !== "business_location" && signals.locality === "none") {
      return fail("constraint:hours_requires_physical_presence");
    }
    return ok;
  },

  location: ({ content }) =>
    hasContent(content, "locations") && contentCount(content, "locations") >= 1
      ? ok
      : fail("constraint:locations_missing"),

  pricing: ({ content, signals }) => {
    if (!hasContent(content, "pricing")) return fail("constraint:pricing_missing");
    if (signals.price_model === "quote" || signals.price_model === "none") {
      return fail("constraint:price_model_not_publishable");
    }
    return ok;
  },

  trust_badges: ({ content }) =>
    hasContent(content, "trust_facts") ? ok : fail("constraint:trust_facts_missing"),

  video: ({ content }) => (hasContent(content, "video") ? ok : fail("constraint:video_missing")),

  products: ({ content, signals }) => {
    if (!hasContent(content, "products") || contentCount(content, "products") < 1) {
      return fail("constraint:products_missing");
    }
    if (signals.conversion_mode !== "purchase" && signals.conversion_mode !== "visit") {
      return fail("constraint:conversion_mode_not_commercial");
    }
    return ok;
  },

  booking_widget: ({ content, signals }) => {
    if (!hasContent(content, "booking")) return fail("constraint:booking_surface_missing");
    if (signals.conversion_mode !== "booking") return fail("constraint:conversion_mode_not_booking");
    return ok;
  },

  quote_form: ({ content, signals }) => {
    if (!hasContent(content, "lead_form")) return fail("constraint:lead_form_missing");
    if (signals.conversion_mode !== "quote") return fail("constraint:conversion_mode_not_quote");
    return ok;
  },

  contact_form: ({ content, signals }) => {
    if (!hasContent(content, "lead_form")) return fail("constraint:lead_form_missing");
    if (signals.conversion_mode !== "contact" && signals.conversion_mode !== "portfolio_then_contact") {
      return fail("constraint:conversion_mode_not_contact");
    }
    return ok;
  },

  sticky_primary_cta: ({ signals }) =>
    signals.urgency === "high" || signals.conversion_mode === "purchase"
      ? ok
      : fail("constraint:sticky_cta_requires_urgency"),

  floating_contact: ({ signals }) =>
    signals.conversion_mode === "contact" ||
    signals.conversion_mode === "quote" ||
    signals.urgency === "high"
      ? ok
      : fail("constraint:floating_contact_requires_direct_messaging"),
};

export function evaluateBlockConstraints(
  type: FutureBlockType,
  input: ConstraintInput,
): ConstraintCheck {
  const predicate = FUTURE_BLOCK_CONSTRAINTS[type];
  return predicate ? predicate(input) : ok;
}

/* ------------------------------------------------- mutual exclusion rules */

export interface ExclusionRule {
  a: FutureBlockType;
  b: FutureBlockType;
  reason: string;
}

export const FUTURE_BLOCK_EXCLUSIONS: ExclusionRule[] = [
  {
    a: "sticky_primary_cta",
    b: "floating_contact",
    reason: "Two persistent conversion overlays compete on mobile.",
  },
  {
    a: "quote_form",
    b: "contact_form",
    reason: "Only one lead capture form belongs on a single-page profile.",
  },
];

/**
 * Deterministic winner between two mutually exclusive overlays, decided by
 * conversion strategy value rather than declaration order.
 */
export function resolveExclusion(
  a: FutureBlockType,
  b: FutureBlockType,
  signals: BusinessSignalsV1,
): FutureBlockType {
  const value = (type: FutureBlockType): number => {
    switch (type) {
      case "sticky_primary_cta":
        return (
          (signals.urgency === "high" ? 40 : 10) +
          (signals.conversion_mode === "purchase" || signals.conversion_mode === "booking" ? 30 : 0)
        );
      case "floating_contact":
        return (
          (signals.conversion_mode === "contact" || signals.conversion_mode === "quote" ? 45 : 5) +
          (signals.locality === "local" || signals.locality === "service_area" ? 15 : 0)
        );
      case "quote_form":
        return signals.conversion_mode === "quote" ? 50 : 10;
      case "contact_form":
        return signals.conversion_mode === "contact" ? 50 : 10;
      default:
        return 0;
    }
  };
  const va = value(a);
  const vb = value(b);
  if (va !== vb) return va > vb ? a : b;
  // Fully tied: stable alphabetical order keeps the result deterministic.
  return a.localeCompare(b) <= 0 ? a : b;
}
