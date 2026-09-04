/**
 * Renderer capability registry.
 *
 * The engine must never emit a feature the current Cripqer renderer cannot
 * render. Unsupported features are downgraded in compatibility.ts, never
 * silently emitted.
 */

import type { RendererCapabilitiesV1 } from "./types";

export const DEFAULT_CAPABILITIES: RendererCapabilitiesV1 = {
  professional_cards: true,
  card_media_right: true,
  card_media_bottom: true,
  professional_badge: true,
  radial_background: true,
  gradient_background: true,
  media_block: true,
  social_links: true,
  elevated_cards: true,
  hero_banner: true,
  // Reserved / not renderable in V1.
  booking_widget: false,
  form_block: false,
  product_block: false,
};

export function resolveCapabilities(
  overrides?: Partial<RendererCapabilitiesV1>,
): RendererCapabilitiesV1 {
  return { ...DEFAULT_CAPABILITIES, ...(overrides ?? {}) };
}
