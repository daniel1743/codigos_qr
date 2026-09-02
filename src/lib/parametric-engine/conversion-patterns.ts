/**
 * V1.5 — conversion pattern reserve.
 *
 * The current renderer only receives patterns it supports. Everything else
 * stays a dormant strategy definition.
 */

import type { BusinessSignalsV1 } from "./business-signals";
import type { FutureCapabilityKey, FutureRendererCapabilitiesV1 } from "./future-capabilities";
import type { PrimaryActionType, RendererCapabilitiesV1 } from "./types";

export const CONVERSION_PATTERNS = [
  "primary_button",
  "professional_card",
  "sticky_mobile_cta",
  "floating_whatsapp",
  "quote_first",
  "booking_first",
  "portfolio_then_contact",
  "trust_then_contact",
  "location_then_visit",
] as const;
export type ConversionPattern = (typeof CONVERSION_PATTERNS)[number];

export interface ConversionPatternStrategy {
  id: ConversionPattern;
  /** Supported by the CURRENT PageRecipeV1 renderer contract. */
  current: boolean;
  required_future_capabilities: FutureCapabilityKey[];
  preferred_action_types: PrimaryActionType[];
  useful_when: string;
  fallback: ConversionPattern;
}

export const CONVERSION_PATTERN_STRATEGIES: Record<ConversionPattern, ConversionPatternStrategy> = {
  primary_button: {
    id: "primary_button",
    current: true,
    required_future_capabilities: [],
    preferred_action_types: ["whatsapp", "website", "email", "instagram", "booking"],
    useful_when: "Always valid baseline conversion.",
    fallback: "primary_button",
  },
  professional_card: {
    id: "professional_card",
    current: true,
    required_future_capabilities: [],
    preferred_action_types: ["booking", "website", "email"],
    useful_when: "Trust or portfolio-led conversion needing context around the action.",
    fallback: "primary_button",
  },
  sticky_mobile_cta: {
    id: "sticky_mobile_cta",
    current: false,
    required_future_capabilities: ["sticky_primary_cta"],
    preferred_action_types: ["whatsapp", "booking"],
    useful_when: "High urgency on a long mobile page.",
    fallback: "primary_button",
  },
  floating_whatsapp: {
    id: "floating_whatsapp",
    current: false,
    required_future_capabilities: ["floating_contact"],
    preferred_action_types: ["whatsapp"],
    useful_when: "Direct messaging dominates conversion.",
    fallback: "primary_button",
  },
  quote_first: {
    id: "quote_first",
    current: false,
    required_future_capabilities: ["quote_form"],
    preferred_action_types: ["whatsapp", "email"],
    useful_when: "Price is quoted per job.",
    fallback: "primary_button",
  },
  booking_first: {
    id: "booking_first",
    current: false,
    required_future_capabilities: ["booking_widget"],
    preferred_action_types: ["booking"],
    useful_when: "Appointment-driven business with a booking surface.",
    fallback: "professional_card",
  },
  portfolio_then_contact: {
    id: "portfolio_then_contact",
    current: false,
    required_future_capabilities: ["portfolio_grid"],
    preferred_action_types: ["website", "email", "whatsapp"],
    useful_when: "Proof of work must precede contact.",
    fallback: "professional_card",
  },
  trust_then_contact: {
    id: "trust_then_contact",
    current: false,
    required_future_capabilities: ["trust_badges_block"],
    preferred_action_types: ["email", "whatsapp"],
    useful_when: "High trust requirement services.",
    fallback: "professional_card",
  },
  location_then_visit: {
    id: "location_then_visit",
    current: false,
    required_future_capabilities: ["location_block"],
    preferred_action_types: ["website", "whatsapp"],
    useful_when: "Conversion is a physical visit.",
    fallback: "primary_button",
  },
};

/** Ordered preference for the given signals, filtered by real support. */
export function selectConversionPattern(
  signals: BusinessSignalsV1,
  capabilities: RendererCapabilitiesV1,
  future: FutureRendererCapabilitiesV1,
): ConversionPattern {
  const preference: ConversionPattern[] =
    signals.conversion_mode === "booking"
      ? ["booking_first", "professional_card", "primary_button"]
      : signals.conversion_mode === "quote"
        ? ["quote_first", "sticky_mobile_cta", "primary_button"]
        : signals.conversion_mode === "portfolio_then_contact"
          ? ["portfolio_then_contact", "professional_card", "primary_button"]
          : signals.conversion_mode === "visit"
            ? ["location_then_visit", "primary_button"]
            : signals.trust_requirement === "high"
              ? ["trust_then_contact", "professional_card", "primary_button"]
              : ["primary_button"];

  for (const id of preference) {
    const strategy = CONVERSION_PATTERN_STRATEGIES[id];
    if (!strategy.current) {
      if (!strategy.required_future_capabilities.every((key) => future[key] === true)) continue;
    }
    if (id === "professional_card" && !capabilities.professional_cards) continue;
    return id;
  }
  return "primary_button";
}
