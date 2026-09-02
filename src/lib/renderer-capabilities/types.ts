export type CapabilityStatus = "supported" | "partial" | "unsupported";

export type CapabilityState =
  | {
      readonly status: "supported";
      readonly reason?: string;
      readonly conditions?: readonly string[];
    }
  | {
      readonly status: "partial";
      readonly reason: string;
      readonly conditions?: readonly string[];
    }
  | {
      readonly status: "unsupported";
      readonly reason?: string;
      readonly conditions?: readonly string[];
    };

export interface RendererRuntimeContextV1 {
  readonly containerWidth?: number;
  readonly surface?: "editor_preview" | "public";
}

export type RendererKindV1 = "declarative" | "standalone" | "legacy" | "unknown";

export interface EnumeratedRendererCapabilityV1<Value extends string | number> {
  readonly capability: CapabilityState;
  readonly values: readonly Value[];
}

export interface CripqerRendererCapabilitiesV1 {
  readonly version: 1;
  readonly templateId: string;
  readonly rendererKind: RendererKindV1;
  readonly hero: {
    readonly avatar: CapabilityState;
    readonly banner: CapabilityState;
    readonly bannerAvatar: CapabilityState;
    readonly bannerOnly: CapabilityState;
    readonly avatarOnly: CapabilityState;
    readonly heroNone: CapabilityState;
    readonly curved: CapabilityState;
    readonly fusion: CapabilityState;
    readonly straight: CapabilityState;
    readonly focalPosition: CapabilityState;
    readonly blur: CapabilityState;
  };
  readonly identity: {
    readonly name: CapabilityState;
    readonly profession: CapabilityState;
    readonly bio: CapabilityState;
    readonly professionalBadge: CapabilityState;
    readonly alignment: {
      readonly left: CapabilityState;
      readonly center: CapabilityState;
      readonly right: CapabilityState;
    };
  };
  readonly links: {
    readonly buttons: CapabilityState;
    readonly cards: CapabilityState;
    readonly arbitraryUrl: CapabilityState;
    readonly wholeCardClick: CapabilityState;
    readonly cardMedia: {
      readonly image: CapabilityState;
      readonly platformIcon: CapabilityState;
      readonly none: CapabilityState;
      readonly right: CapabilityState;
      readonly bottom: CapabilityState;
      readonly focalY: CapabilityState;
    };
    readonly sticky: CapabilityState;
    readonly floating: CapabilityState;
  };
  readonly tokens: {
    readonly background: {
      readonly solid: CapabilityState;
      readonly linearGradient: CapabilityState;
      readonly radialGradient: CapabilityState;
      readonly image: CapabilityState;
    };
    readonly typography: {
      readonly globalFont: CapabilityState;
      readonly headingFont: CapabilityState;
      readonly bodyFont: CapabilityState;
      readonly fontList: readonly string[];
      readonly textWeight: EnumeratedRendererCapabilityV1<300 | 400 | 600 | 700>;
    };
    readonly textAlignment: EnumeratedRendererCapabilityV1<"left" | "center" | "right">;
    readonly density: EnumeratedRendererCapabilityV1<"compact" | "standard" | "generous">;
    readonly buttonVariants: {
      readonly solid: CapabilityState;
      readonly outline: CapabilityState;
      readonly soft: CapabilityState;
    };
    readonly buttonRadius: {
      readonly none: CapabilityState;
      readonly rounded: CapabilityState;
      readonly full: CapabilityState;
    };
    readonly border: {
      readonly widths: EnumeratedRendererCapabilityV1<0 | 1 | 2 | 3>;
      readonly solid: CapabilityState;
      readonly dashed: CapabilityState;
      readonly dotted: CapabilityState;
    };
    readonly arbitraryShadow: CapabilityState;
    readonly arbitraryGlow: CapabilityState;
  };
  readonly avatar: {
    readonly image: CapabilityState;
    readonly shapes: {
      readonly circle: CapabilityState;
      readonly rounded: CapabilityState;
      readonly square: CapabilityState;
      readonly none: CapabilityState;
    };
    readonly ring: CapabilityState;
  };
  readonly media: {
    readonly avatar: CapabilityState;
    readonly banner: CapabilityState;
    readonly cardImage: CapabilityState;
    readonly genericImage: CapabilityState;
    readonly gallery: CapabilityState;
    readonly portfolioGrid: CapabilityState;
    readonly video: CapabilityState;
    readonly productImage: CapabilityState;
    readonly beforeAfter: CapabilityState;
  };
  readonly blocks: {
    readonly identity: CapabilityState;
    readonly bio: CapabilityState;
    readonly links: CapabilityState;
    readonly cards: CapabilityState;
    readonly footer: CapabilityState;
    readonly socialLinks: CapabilityState;
    readonly contact: CapabilityState;
    readonly services: CapabilityState;
    readonly serviceArea: CapabilityState;
    readonly gallery: CapabilityState;
    readonly portfolioGrid: CapabilityState;
    readonly beforeAfter: CapabilityState;
    readonly testimonials: CapabilityState;
    readonly socialProof: CapabilityState;
    readonly faq: CapabilityState;
    readonly hours: CapabilityState;
    readonly location: CapabilityState;
    readonly pricing: CapabilityState;
    readonly trustBadges: CapabilityState;
    readonly video: CapabilityState;
    readonly products: CapabilityState;
    readonly bookingWidget: CapabilityState;
    readonly quoteForm: CapabilityState;
    readonly contactForm: CapabilityState;
    readonly stickyPrimaryCta: CapabilityState;
    readonly floatingContact: CapabilityState;
  };
  readonly destinations: {
    readonly genericUrl: CapabilityState;
    readonly whatsappUrl: CapabilityState;
    readonly whatsappPrefilledMessageBuilder: CapabilityState;
    readonly phone: CapabilityState;
    readonly email: CapabilityState;
    readonly socialProfile: CapabilityState;
    readonly externalMarketplace: CapabilityState;
    readonly externalBooking: CapabilityState;
    readonly externalForm: CapabilityState;
    readonly nativeBooking: CapabilityState;
    readonly nativeForm: CapabilityState;
  };
  readonly analytics: {
    readonly clickTrackingAsRendererCapability: CapabilityState;
  };
}

export interface EngineRendererCapabilitiesProjectionV1 {
  professional_cards: boolean;
  card_media_right: boolean;
  card_media_bottom: boolean;
  professional_badge: boolean;
  radial_background: boolean;
  gradient_background: boolean;
  media_block: boolean;
  social_links: boolean;
  elevated_cards: boolean;
  hero_banner: boolean;
  booking_widget: boolean;
  form_block: boolean;
  product_block: boolean;
}

export interface RenderabilityRequirementV1 {
  readonly capability: string;
  readonly required: boolean;
}

export interface RendererRequirementsValidationV1 {
  readonly renderable: boolean;
  readonly unsupported: readonly string[];
  readonly partial: readonly string[];
  readonly warnings: readonly string[];
}
