/**
 * V1.5 — future block strategy registry.
 *
 * Each future block already knows: when it is useful, what content it
 * requires, what renderer capability it requires, its preferred order,
 * allowed presentation variants, compatibility constraints and fallback.
 *
 * These blocks are NEVER emitted into PageRecipeV1 in V1.5.
 */

import type { BusinessArchetype, BusinessSignalsV1 } from "./business-signals";
import type { ContentInventoryV1, ContentKey } from "./content-inventory";
import type { FutureCapabilityKey } from "./future-capabilities";

export const FUTURE_BLOCK_TYPES = [
  "services",
  "service_area",
  "gallery",
  "portfolio_grid",
  "before_after",
  "testimonials",
  "social_proof",
  "faq",
  "hours",
  "location",
  "pricing",
  "trust_badges",
  "video",
  "products",
  "booking_widget",
  "quote_form",
  "contact_form",
  "sticky_primary_cta",
  "floating_contact",
] as const;
export type FutureBlockType = (typeof FUTURE_BLOCK_TYPES)[number];

export interface FutureBlockStrategy {
  type: FutureBlockType;
  /** Semantic role used for ordering against current recipe blocks. */
  role: "conversion" | "offer" | "proof" | "info" | "media" | "utility";
  /** Lower runs earlier in the page. */
  base_order: number;
  required_capabilities: FutureCapabilityKey[];
  /** All must be available in ContentInventoryV1. Empty = no content need. */
  required_content: ContentKey[];
  useful_when: string;
  allowed_variants: string[];
  constraints: string[];
  /** What to do when capability or content is missing. */
  fallback: string;
  /** Archetypes for which this block is strategically valuable. */
  archetypes: BusinessArchetype[];
}

const B = (s: FutureBlockStrategy): FutureBlockStrategy => s;

export const FUTURE_BLOCKS: Record<FutureBlockType, FutureBlockStrategy> = {
  services: B({
    type: "services",
    role: "offer",
    base_order: 20,
    required_capabilities: ["services_block"],
    required_content: ["services"],
    useful_when: "The business sells defined services and the visitor must understand the offer.",
    allowed_variants: ["list", "cards", "accordion"],
    constraints: ["Never emitted without at least one service.", "Prices only when has_prices."],
    fallback: "Keep the primary CTA and link list as the offer surface.",
    archetypes: [
      "home_service", "appointment_service", "professional_service", "custom_craft",
      "wellness", "education", "digital_service", "retail", "local_business", "events",
    ],
  }),
  service_area: B({
    type: "service_area",
    role: "info",
    base_order: 45,
    required_capabilities: ["service_area_block"],
    required_content: ["service_areas"],
    useful_when: "The business travels to the customer or covers defined zones.",
    allowed_variants: ["chips", "list"],
    constraints: ["Requires locality service_area or multi_location."],
    fallback: "Mention coverage in the bio; no dedicated block.",
    archetypes: ["home_service", "custom_craft", "events", "real_estate"],
  }),
  gallery: B({
    type: "gallery",
    role: "media",
    base_order: 30,
    required_capabilities: ["gallery_block"],
    required_content: ["gallery"],
    useful_when: "Visual dependency is medium or high and images exist.",
    allowed_variants: ["grid", "carousel", "masonry"],
    constraints: ["Never uses the identity avatar as gallery media."],
    fallback: "Card media in the current recipe, when supported.",
    archetypes: ["appointment_service", "hospitality", "food_service", "creator", "custom_craft", "events", "retail"],
  }),
  portfolio_grid: B({
    type: "portfolio_grid",
    role: "proof",
    base_order: 28,
    required_capabilities: ["portfolio_grid"],
    required_content: ["portfolio"],
    useful_when: "Conversion depends on proof of work before contact.",
    allowed_variants: ["grid_2", "grid_3", "stack"],
    constraints: ["Requires at least 2 portfolio items to justify a grid."],
    fallback: "links_presentation = cards.",
    archetypes: ["portfolio_service", "custom_craft", "creator", "real_estate", "events"],
  }),
  before_after: B({
    type: "before_after",
    role: "proof",
    base_order: 32,
    required_capabilities: ["before_after_block"],
    required_content: ["before_after"],
    useful_when: "Transformation is the product (visual services).",
    allowed_variants: ["slider", "pair_grid"],
    constraints: ["Requires paired assets.", "Never fabricated from a single image."],
    fallback: "Gallery, when available.",
    archetypes: ["appointment_service", "home_service", "wellness", "custom_craft"],
  }),
  testimonials: B({
    type: "testimonials",
    role: "proof",
    base_order: 50,
    required_capabilities: ["testimonials_block"],
    required_content: ["testimonials"],
    useful_when: "Trust requirement is medium or high.",
    allowed_variants: ["quote_stack", "carousel", "cards"],
    constraints: ["Never generated or paraphrased by the engine."],
    fallback: "trust_badges when available, otherwise nothing.",
    archetypes: [
      "home_service", "professional_service", "appointment_service", "wellness",
      "real_estate", "education", "local_business", "retail", "hospitality",
    ],
  }),
  social_proof: B({
    type: "social_proof",
    role: "proof",
    base_order: 52,
    required_capabilities: ["social_proof_block"],
    required_content: ["trust_facts"],
    useful_when: "Numeric proof exists (clients served, years, ratings).",
    allowed_variants: ["stat_row", "badges"],
    constraints: ["Facts must be provided; never invented."],
    fallback: "Omit.",
    archetypes: ["professional_service", "digital_service", "education", "real_estate", "creator"],
  }),
  faq: B({
    type: "faq",
    role: "info",
    base_order: 60,
    required_capabilities: ["faq_block"],
    required_content: ["faq"],
    useful_when: "Purchase friction comes from unanswered questions.",
    allowed_variants: ["accordion", "list"],
    constraints: ["Never above the primary conversion block."],
    fallback: "Omit.",
    archetypes: ["professional_service", "home_service", "education", "wellness", "digital_service"],
  }),
  hours: B({
    type: "hours",
    role: "info",
    base_order: 55,
    required_capabilities: ["hours_block"],
    required_content: ["hours"],
    useful_when: "Visitors physically arrive or call within a schedule.",
    allowed_variants: ["compact", "table"],
    constraints: ["Requires business_location or local delivery."],
    fallback: "Omit.",
    archetypes: ["food_service", "local_business", "retail", "appointment_service", "hospitality"],
  }),
  location: B({
    type: "location",
    role: "info",
    base_order: 56,
    required_capabilities: ["location_block"],
    required_content: ["locations"],
    useful_when: "Conversion is a physical visit.",
    allowed_variants: ["address", "address_map", "multi_list"],
    constraints: ["Map rendering is a renderer concern, never engine CSS."],
    fallback: "Omit.",
    archetypes: ["food_service", "local_business", "retail", "hospitality", "appointment_service", "real_estate"],
  }),
  pricing: B({
    type: "pricing",
    role: "offer",
    base_order: 40,
    required_capabilities: ["pricing_block"],
    required_content: ["pricing"],
    useful_when: "Price model is fixed, starting_at or range.",
    allowed_variants: ["list", "tiers"],
    constraints: ["Never emitted when price_model is quote or none."],
    fallback: "Quote CTA.",
    archetypes: ["appointment_service", "wellness", "education", "retail", "digital_service", "hospitality"],
  }),
  trust_badges: B({
    type: "trust_badges",
    role: "proof",
    base_order: 48,
    required_capabilities: ["trust_badges_block"],
    required_content: ["trust_facts"],
    useful_when: "Certifications/licenses drive the decision.",
    allowed_variants: ["row", "grid"],
    constraints: ["Only user-provided facts."],
    fallback: "Omit.",
    archetypes: ["professional_service", "home_service", "real_estate", "wellness", "education"],
  }),
  video: B({
    type: "video",
    role: "media",
    base_order: 34,
    required_capabilities: ["video_block"],
    required_content: ["video"],
    useful_when: "Video is the strongest available proof asset.",
    allowed_variants: ["inline", "cover"],
    constraints: ["No autoplay with sound.", "Reduced motion respected by renderer."],
    fallback: "Gallery or card media.",
    archetypes: ["creator", "portfolio_service", "hospitality", "education", "events"],
  }),
  products: B({
    type: "products",
    role: "offer",
    base_order: 22,
    required_capabilities: ["products_block"],
    required_content: ["products"],
    useful_when: "Conversion mode is purchase.",
    allowed_variants: ["grid", "list", "featured"],
    constraints: ["No commerce backend in the engine."],
    fallback: "Link list with a purchase CTA.",
    archetypes: ["retail", "food_service", "creator", "local_business"],
  }),
  booking_widget: B({
    type: "booking_widget",
    role: "conversion",
    base_order: 12,
    required_capabilities: ["booking_widget"],
    required_content: ["booking"],
    useful_when: "Conversion mode is booking and a booking surface exists.",
    allowed_variants: ["inline", "modal", "external_link"],
    constraints: ["Falls back to the existing external booking CTA."],
    fallback: "primary_cta with the booking destination.",
    archetypes: ["appointment_service", "wellness", "hospitality", "food_service"],
  }),
  quote_form: B({
    type: "quote_form",
    role: "conversion",
    base_order: 14,
    required_capabilities: ["quote_form"],
    required_content: ["lead_form"],
    useful_when: "Price is quoted per job.",
    allowed_variants: ["short", "detailed"],
    constraints: ["No form backend in the engine."],
    fallback: "WhatsApp/contact CTA.",
    archetypes: ["home_service", "custom_craft", "events", "digital_service"],
  }),
  contact_form: B({
    type: "contact_form",
    role: "conversion",
    base_order: 16,
    required_capabilities: ["contact_form"],
    required_content: ["lead_form"],
    useful_when: "Lead capture beats direct messaging.",
    allowed_variants: ["short", "detailed"],
    constraints: ["No form backend in the engine."],
    fallback: "Email/WhatsApp CTA.",
    archetypes: ["professional_service", "digital_service", "education", "real_estate"],
  }),
  sticky_primary_cta: B({
    type: "sticky_primary_cta",
    role: "utility",
    base_order: 90,
    required_capabilities: ["sticky_primary_cta"],
    required_content: [],
    useful_when: "Urgency is high and the page is long.",
    allowed_variants: ["bar", "button"],
    constraints: ["Never duplicated with floating_contact."],
    fallback: "Standard primary CTA only.",
    archetypes: ["home_service", "appointment_service", "retail", "local_business", "food_service"],
  }),
  floating_contact: B({
    type: "floating_contact",
    role: "utility",
    base_order: 92,
    required_capabilities: ["floating_contact"],
    required_content: [],
    useful_when: "Direct messaging is the dominant conversion path.",
    allowed_variants: ["whatsapp", "call", "multi"],
    constraints: ["Never duplicated with sticky_primary_cta."],
    fallback: "Standard primary CTA only.",
    archetypes: ["home_service", "local_business", "retail"],
  }),
};

export function contentSatisfied(
  block: FutureBlockStrategy,
  content: ContentInventoryV1,
): boolean {
  return block.required_content.every(
    (key) => (content[key] as { available: boolean }).available === true,
  );
}

export function signalsFavor(
  block: FutureBlockStrategy,
  signals: BusinessSignalsV1,
): boolean {
  if (block.type === "pricing") {
    return signals.price_model === "fixed" || signals.price_model === "starting_at" || signals.price_model === "range";
  }
  if (block.type === "service_area") {
    return signals.locality === "service_area" || signals.locality === "multi_location";
  }
  if (block.type === "hours" || block.type === "location") {
    return signals.delivery_mode === "business_location" || signals.locality !== "none";
  }
  if (block.type === "sticky_primary_cta") return signals.urgency === "high";
  if (block.type === "testimonials" || block.type === "trust_badges") {
    return signals.trust_requirement !== "low";
  }
  if (block.type === "gallery" || block.type === "video" || block.type === "before_after") {
    return signals.visual_dependency !== "low";
  }
  return block.archetypes.includes(signals.archetype);
}
