/**
 * V1.5 — future renderer capability registry.
 *
 * EVERY future capability defaults to FALSE. A future feature only becomes
 * emittable when a renderer explicitly declares support. Unsupported
 * capabilities must never leak into PageRecipeV1.
 */

export const FUTURE_CAPABILITY_KEYS = [
  "services_block",
  "service_area_block",
  "gallery_block",
  "portfolio_grid",
  "before_after_block",
  "testimonials_block",
  "social_proof_block",
  "faq_block",
  "hours_block",
  "location_block",
  "pricing_block",
  "trust_badges_block",
  "video_block",
  "products_block",
  "booking_widget",
  "quote_form",
  "contact_form",
  "sticky_primary_cta",
  "floating_contact",
  "responsive_strategy",
  "motion_tokens",
] as const;
export type FutureCapabilityKey = (typeof FUTURE_CAPABILITY_KEYS)[number];

export type FutureRendererCapabilitiesV1 = Record<FutureCapabilityKey, boolean>;

export const DEFAULT_FUTURE_CAPABILITIES: FutureRendererCapabilitiesV1 =
  Object.fromEntries(
    FUTURE_CAPABILITY_KEYS.map((key) => [key, false]),
  ) as FutureRendererCapabilitiesV1;

export function resolveFutureCapabilities(
  overrides?: Partial<FutureRendererCapabilitiesV1>,
): FutureRendererCapabilitiesV1 {
  return { ...DEFAULT_FUTURE_CAPABILITIES, ...(overrides ?? {}) };
}

/** True only when every requested future capability is explicitly enabled. */
export function supportsAll(
  capabilities: FutureRendererCapabilitiesV1,
  keys: readonly FutureCapabilityKey[],
): boolean {
  return keys.every((key) => capabilities[key] === true);
}
