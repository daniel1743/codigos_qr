import type {
  CripqerRendererCapabilitiesV1,
  EngineRendererCapabilitiesProjectionV1,
} from "./types.ts";

function isCurrentRenderer(capabilities: CripqerRendererCapabilitiesV1): boolean {
  return capabilities.rendererKind === "declarative" || capabilities.rendererKind === "standalone";
}

export function toEngineRendererCapabilities(
  capabilities: CripqerRendererCapabilitiesV1,
): EngineRendererCapabilitiesProjectionV1 {
  if (!isCurrentRenderer(capabilities)) {
    return {
      professional_cards: false,
      card_media_right: false,
      card_media_bottom: false,
      professional_badge: false,
      radial_background: false,
      gradient_background: false,
      media_block: false,
      social_links: false,
      elevated_cards: false,
      hero_banner: false,
      booking_widget: false,
      form_block: false,
      product_block: false,
    };
  }

  const professionalCards = capabilities.links.cards.status === "supported";

  return {
    professional_cards: professionalCards,
    card_media_right:
      professionalCards && capabilities.links.cardMedia.right.status !== "unsupported",
    card_media_bottom:
      professionalCards && capabilities.links.cardMedia.bottom.status === "supported",
    professional_badge: capabilities.identity.professionalBadge.status === "supported",
    radial_background: capabilities.tokens.background.radialGradient.status === "supported",
    gradient_background: capabilities.tokens.background.linearGradient.status === "supported",
    media_block: false,
    social_links: capabilities.blocks.socialLinks.status !== "unsupported",
    elevated_cards: false,
    hero_banner: capabilities.hero.banner.status === "supported",
    booking_widget: false,
    form_block: false,
    product_block: false,
  };
}
