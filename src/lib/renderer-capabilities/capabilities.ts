import { BASIC_EDITOR_FONTS } from "../basic-templates/config.ts";
import type {
  CapabilityState,
  CripqerRendererCapabilitiesV1,
  RenderabilityRequirementV1,
  RendererKindV1,
  RendererRequirementsValidationV1,
  RendererRuntimeContextV1,
} from "./types.ts";

export const ACTIVE_RENDERER_TEMPLATE_IDS = [
  "beauty-curve",
  "luxury-fusion",
  "beauty-catalog",
  "executive-straight",
  "amanda",
  "adriana",
  "eudora",
  "sage",
  "silver",
] as const;

export type ActiveRendererTemplateId = (typeof ACTIVE_RENDERER_TEMPLATE_IDS)[number];

export const KNOWN_LEGACY_RENDERER_TEMPLATE_IDS = [
  "barbara",
  "studio",
  "classic-bio",
  "fitness",
  "neon",
  "Template03",
  "Template04",
  "Template07",
  "Template08",
] as const;

type HeroStyleV1 = "curved" | "fusion" | "straight";
type IdentityAlignmentV1 = "left" | "center";
type TraitStateV1 = "supported" | "partial" | "unsupported";

interface TemplateCapabilityTraitsV1 {
  readonly rendererKind: "declarative" | "standalone";
  readonly heroStyle: HeroStyleV1;
  readonly identityAlignment: IdentityAlignmentV1;
  readonly professionalCards: boolean;
  readonly professionalBadge: boolean;
  readonly dedicatedSocialLinks: boolean;
  readonly contactBlock: boolean;
  readonly buttonVariants: {
    readonly solid: boolean;
    readonly outline: boolean;
    readonly soft: boolean;
  };
  readonly buttonRadius: {
    readonly none: TraitStateV1;
    readonly rounded: TraitStateV1;
    readonly full: TraitStateV1;
  };
}

const TEMPLATE_CAPABILITY_TRAITS = {
  "beauty-curve": {
    rendererKind: "declarative",
    heroStyle: "curved",
    identityAlignment: "center",
    professionalCards: true,
    professionalBadge: true,
    dedicatedSocialLinks: true,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: true },
    buttonRadius: { none: "supported", rounded: "supported", full: "supported" },
  },
  "luxury-fusion": {
    rendererKind: "declarative",
    heroStyle: "fusion",
    identityAlignment: "center",
    professionalCards: true,
    professionalBadge: true,
    dedicatedSocialLinks: true,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: true },
    buttonRadius: { none: "supported", rounded: "supported", full: "supported" },
  },
  "beauty-catalog": {
    rendererKind: "declarative",
    heroStyle: "straight",
    identityAlignment: "center",
    professionalCards: true,
    professionalBadge: true,
    dedicatedSocialLinks: true,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: true },
    buttonRadius: { none: "supported", rounded: "supported", full: "supported" },
  },
  "executive-straight": {
    rendererKind: "declarative",
    heroStyle: "straight",
    identityAlignment: "left",
    professionalCards: true,
    professionalBadge: true,
    dedicatedSocialLinks: false,
    contactBlock: true,
    buttonVariants: { solid: true, outline: true, soft: true },
    buttonRadius: { none: "supported", rounded: "supported", full: "supported" },
  },
  amanda: {
    rendererKind: "standalone",
    heroStyle: "straight",
    identityAlignment: "center",
    professionalCards: false,
    professionalBadge: false,
    dedicatedSocialLinks: false,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: false },
    buttonRadius: { none: "partial", rounded: "partial", full: "supported" },
  },
  adriana: {
    rendererKind: "standalone",
    heroStyle: "straight",
    identityAlignment: "center",
    professionalCards: false,
    professionalBadge: false,
    dedicatedSocialLinks: false,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: false },
    buttonRadius: { none: "partial", rounded: "partial", full: "supported" },
  },
  eudora: {
    rendererKind: "standalone",
    heroStyle: "straight",
    identityAlignment: "center",
    professionalCards: false,
    professionalBadge: false,
    dedicatedSocialLinks: false,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: false },
    buttonRadius: { none: "partial", rounded: "supported", full: "partial" },
  },
  sage: {
    rendererKind: "standalone",
    heroStyle: "curved",
    identityAlignment: "center",
    professionalCards: false,
    professionalBadge: false,
    dedicatedSocialLinks: true,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: true },
    buttonRadius: { none: "partial", rounded: "partial", full: "partial" },
  },
  silver: {
    rendererKind: "standalone",
    heroStyle: "straight",
    identityAlignment: "center",
    professionalCards: false,
    professionalBadge: false,
    dedicatedSocialLinks: true,
    contactBlock: false,
    buttonVariants: { solid: true, outline: false, soft: false },
    buttonRadius: { none: "partial", rounded: "partial", full: "supported" },
  },
} as const satisfies Record<ActiveRendererTemplateId, TemplateCapabilityTraitsV1>;

const LEGACY_TEMPLATE_IDS = new Set<string>(KNOWN_LEGACY_RENDERER_TEMPLATE_IDS);

function supported(reason?: string, conditions?: readonly string[]): CapabilityState {
  return {
    status: "supported",
    ...(reason === undefined ? {} : { reason }),
    ...(conditions === undefined ? {} : { conditions: [...conditions] }),
  };
}

function partial(reason: string, conditions?: readonly string[]): CapabilityState {
  return {
    status: "partial",
    reason,
    ...(conditions === undefined ? {} : { conditions: [...conditions] }),
  };
}

function unsupported(reason?: string, conditions?: readonly string[]): CapabilityState {
  return {
    status: "unsupported",
    ...(reason === undefined ? {} : { reason }),
    ...(conditions === undefined ? {} : { conditions: [...conditions] }),
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nestedValue of Object.values(value as Record<string, unknown>)) {
      deepFreeze(nestedValue);
    }
    Object.freeze(value);
  }
  return value;
}

function isActiveRendererTemplateId(templateId: string): templateId is ActiveRendererTemplateId {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_CAPABILITY_TRAITS, templateId);
}

function cardMediaRightCapability(
  hasCards: boolean,
  runtimeContext?: RendererRuntimeContextV1,
): CapabilityState {
  if (!hasCards) {
    return unsupported("Professional card presentation is not enabled for this template.");
  }

  const width = runtimeContext?.containerWidth;
  if (typeof width === "number" && Number.isFinite(width) && width >= 420) {
    return supported("Right-side card media renders in columns at this container width.", [
      "containerWidth >= 420",
    ]);
  }

  if (typeof width === "number" && Number.isFinite(width) && width >= 0) {
    return partial(
      "Right-side card media responsively stacks below the current container threshold.",
      [
        "containerWidth < 420",
        "The card remains renderable, but media is no longer right-aligned.",
      ],
    );
  }

  return partial("Container width is unknown; right-side card media may responsively stack.", [
    "At approximately 420px and above, content and media render in columns.",
    "Below approximately 420px, the card stacks.",
  ]);
}

function traitCapability(
  state: TraitStateV1,
  unsupportedReason: string,
  partialReason: string,
): CapabilityState {
  if (state === "supported") return supported();
  if (state === "partial") return partial(partialReason);
  return unsupported(unsupportedReason);
}

function buildCapabilities(
  templateId: string,
  rendererKind: RendererKindV1,
  traits?: TemplateCapabilityTraitsV1,
  runtimeContext?: RendererRuntimeContextV1,
): CripqerRendererCapabilitiesV1 {
  const inactiveReason =
    rendererKind === "legacy"
      ? "Legacy template context is not an active RendererCapabilitiesV1 product target."
      : "Unknown templates receive no optimistic renderer capabilities.";
  const core = traits ? supported() : unsupported(inactiveReason);
  const currentOnly = (capability: CapabilityState) =>
    traits ? capability : unsupported(inactiveReason);
  const unavailable = (reason: string) =>
    traits ? unsupported(reason) : unsupported(inactiveReason);
  const hasCards = traits?.professionalCards === true;
  const cards = hasCards
    ? supported("Professional cards are link-derived and enabled by the current product contract.")
    : unavailable("Professional card presentation is not enabled for this template.");
  const cardMedia = hasCards
    ? supported("Available for links using professional card presentation.")
    : unavailable("Card media requires professional card presentation.");
  const externalUrlOnly = currentOnly(
    supported("Supported only as a generic outbound URL; there is no native renderer block."),
  );

  const capabilities: CripqerRendererCapabilitiesV1 = {
    version: 1,
    templateId,
    rendererKind,
    hero: {
      avatar: core,
      banner: core,
      bannerAvatar: core,
      bannerOnly: currentOnly(
        supported(
          "The current avatar visibility contract can hide the avatar while retaining the banner.",
        ),
      ),
      avatarOnly: unavailable(
        "Removing banner media does not remove the current hero geometry, so this is not a true avatar-only hero.",
      ),
      heroNone: unavailable("The current renderer has no true hero-none layout."),
      curved:
        traits?.heroStyle === "curved"
          ? supported()
          : unavailable("This template does not use the curved hero renderer treatment."),
      fusion:
        traits?.heroStyle === "fusion"
          ? supported()
          : unavailable("This template does not use the fusion hero renderer treatment."),
      straight:
        traits?.heroStyle === "straight"
          ? supported()
          : unavailable("This template does not use the straight hero renderer treatment."),
      focalPosition: unavailable(
        "Banner focal-position control is not consumed by the current renderer.",
      ),
      blur: unavailable("Banner blur is not consumed by the current renderer."),
    },
    identity: {
      name: core,
      profession: core,
      bio: core,
      professionalBadge:
        traits?.professionalBadge === true
          ? supported("The selected declarative renderer consumes professional_badge.")
          : unavailable("The selected renderer does not consume professional_badge."),
      alignment: {
        left:
          traits?.identityAlignment === "left"
            ? supported()
            : unavailable("This template does not provide a left-aligned identity layout."),
        center:
          traits?.identityAlignment === "center"
            ? supported()
            : unavailable("This template does not provide a centered identity layout."),
        right: unavailable(
          "No current renderer family provides a true right-aligned identity layout; generic text alignment is separate.",
        ),
      },
    },
    links: {
      buttons: core,
      cards,
      arbitraryUrl: core,
      wholeCardClick: hasCards
        ? supported("The card is rendered as a whole-card anchor.")
        : unavailable("Whole-card click requires professional card presentation."),
      cardMedia: {
        image: cardMedia,
        platformIcon: hasCards
          ? partial(
              "Platform icons use a recognized-platform whitelist and fall back to a Globe icon.",
              ["Unrecognized URLs render the Globe fallback."],
            )
          : unavailable("Platform-icon media requires professional card presentation."),
        none: cardMedia,
        right: traits
          ? cardMediaRightCapability(hasCards, runtimeContext)
          : unsupported(inactiveReason),
        bottom: cardMedia,
        focalY: hasCards
          ? supported("Card image focalY is clamped to the current 0-100 range.")
          : unavailable("Card image focalY requires professional card presentation."),
      },
      sticky: unavailable("Sticky links are not implemented by the current renderer."),
      floating: unavailable("Floating links are not implemented by the current renderer."),
    },
    tokens: {
      background: {
        solid: core,
        linearGradient: core,
        radialGradient: core,
        image: unavailable(
          "A generic background-image token is not implemented by the current contract.",
        ),
      },
      typography: {
        globalFont: core,
        headingFont: core,
        bodyFont: core,
        fontList: [...BASIC_EDITOR_FONTS],
        textWeight: {
          capability: core,
          values: [300, 400, 600, 700],
        },
      },
      textAlignment: {
        capability: core,
        values: ["left", "center", "right"],
      },
      density: {
        capability: core,
        values: ["compact", "standard", "generous"],
      },
      buttonVariants: {
        solid:
          traits?.buttonVariants.solid === true
            ? supported()
            : unavailable("This template does not expose a solid button variant."),
        outline:
          traits?.buttonVariants.outline === true
            ? supported()
            : unavailable("This template does not expose an outline button variant."),
        soft:
          traits?.buttonVariants.soft === true
            ? supported()
            : unavailable("This template does not expose a soft button variant."),
      },
      buttonRadius: {
        none: traits
          ? traitCapability(
              traits.buttonRadius.none,
              "This template does not expose a square button shape.",
              "The template normalizer accepts the value but falls back to an available template shape.",
            )
          : unsupported(inactiveReason),
        rounded: traits
          ? traitCapability(
              traits.buttonRadius.rounded,
              "This template does not expose a rounded button shape.",
              "The requested radius is variant-coupled or falls back through the template normalizer.",
            )
          : unsupported(inactiveReason),
        full: traits
          ? traitCapability(
              traits.buttonRadius.full,
              "This template does not expose a pill button shape.",
              "The requested radius is variant-coupled or falls back through the template normalizer.",
            )
          : unsupported(inactiveReason),
      },
      border: {
        widths: {
          capability: core,
          values: [0, 1, 2, 3],
        },
        solid: core,
        dashed: unavailable("Dashed borders are not implemented by the current renderer contract."),
        dotted: unavailable("Dotted borders are not implemented by the current renderer contract."),
      },
      arbitraryShadow: unavailable(
        "Card and button elevation is renderer-fixed rather than an arbitrary shadow capability.",
      ),
      arbitraryGlow: unavailable(
        "Arbitrary glow styling is not implemented by the current renderer contract.",
      ),
    },
    avatar: {
      image: core,
      shapes: {
        circle: core,
        rounded: core,
        square: currentOnly(
          partial(
            "The current square avatar option still renders with approximately 18px corner radius.",
          ),
        ),
        none: currentOnly(supported("The none shape is the current avatar visibility mechanism.")),
      },
      ring:
        traits?.rendererKind === "standalone"
          ? partial(
              "Some standalone templates preserve fixed visual border treatment when the generic ring is disabled.",
            )
          : currentOnly(supported()),
    },
    media: {
      avatar: core,
      banner: core,
      cardImage: cardMedia,
      genericImage: unavailable("There is no generic independent image block."),
      gallery: unavailable("Gallery media is not implemented by the current renderer."),
      portfolioGrid: unavailable(
        "Portfolio-grid media is not implemented by the current renderer.",
      ),
      video: unavailable("Video media is not implemented by the current renderer."),
      productImage: unavailable("Product media is not implemented by the current renderer."),
      beforeAfter: unavailable("Before/after media is not implemented by the current renderer."),
    },
    blocks: {
      identity: core,
      bio: core,
      links: core,
      cards,
      footer: core,
      socialLinks:
        traits?.dedicatedSocialLinks === true
          ? partial("Dedicated social links are limited to recognized platforms.", [
              "Generic arbitrary URLs alone do not satisfy this capability.",
            ])
          : unavailable(
              "This renderer does not provide the dedicated recognized social-link presentation.",
            ),
      contact:
        traits?.contactBlock === true
          ? supported("The Corporate renderer provides its current phone/email ContactBlock.")
          : unavailable("A dedicated contact block is not provided by this renderer."),
      services: unavailable("Services blocks are not implemented by the current renderer."),
      serviceArea: unavailable("Service-area blocks are not implemented by the current renderer."),
      gallery: unavailable("Gallery blocks are not implemented by the current renderer."),
      portfolioGrid: unavailable(
        "Portfolio-grid blocks are not implemented by the current renderer.",
      ),
      beforeAfter: unavailable("Before/after blocks are not implemented by the current renderer."),
      testimonials: unavailable("Testimonial blocks are not implemented by the current renderer."),
      socialProof: unavailable("Social-proof blocks are not implemented by the current renderer."),
      faq: unavailable("FAQ blocks are not implemented by the current renderer."),
      hours: unavailable("Hours blocks are not implemented by the current renderer."),
      location: unavailable("Location blocks are not implemented by the current renderer."),
      pricing: unavailable("Pricing blocks are not implemented by the current renderer."),
      trustBadges: unavailable("Trust-badge blocks are not implemented by the current renderer."),
      video: unavailable("Video blocks are not implemented by the current renderer."),
      products: unavailable("Product blocks are not implemented by the current renderer."),
      bookingWidget: unavailable(
        "Native booking widgets are not implemented by the current renderer.",
      ),
      quoteForm: unavailable("Quote forms are not implemented by the current renderer."),
      contactForm: unavailable("Contact forms are not implemented by the current renderer."),
      stickyPrimaryCta: unavailable(
        "Sticky primary CTAs are not implemented by the current renderer.",
      ),
      floatingContact: unavailable(
        "Floating contact controls are not implemented by the current renderer.",
      ),
    },
    destinations: {
      genericUrl: core,
      whatsappUrl: core,
      whatsappPrefilledMessageBuilder: unavailable(
        "The renderer accepts WhatsApp URLs but does not build prefilled messages.",
      ),
      phone: currentOnly(supported("Supported as a tel: destination where an anchor is rendered.")),
      email: currentOnly(
        supported("Supported as a mailto: destination where an anchor is rendered."),
      ),
      socialProfile: currentOnly(supported("Supported as an outbound URL.")),
      externalMarketplace: externalUrlOnly,
      externalBooking: externalUrlOnly,
      externalForm: externalUrlOnly,
      nativeBooking: unavailable("Native booking is not implemented by the current renderer."),
      nativeForm: unavailable("Native forms are not implemented by the current renderer."),
    },
    analytics: {
      clickTrackingAsRendererCapability: unavailable(
        "Click tracking belongs to external analytics infrastructure, not renderer capability detection.",
      ),
    },
  };

  return deepFreeze(capabilities);
}

function buildActiveCapabilities(
  templateId: ActiveRendererTemplateId,
  runtimeContext?: RendererRuntimeContextV1,
) {
  const traits: TemplateCapabilityTraitsV1 = TEMPLATE_CAPABILITY_TRAITS[templateId];
  return buildCapabilities(templateId, traits.rendererKind, traits, runtimeContext);
}

export const TEMPLATE_RENDERER_CAPABILITIES: Readonly<
  Record<ActiveRendererTemplateId, CripqerRendererCapabilitiesV1>
> = deepFreeze(
  ACTIVE_RENDERER_TEMPLATE_IDS.reduce(
    (registry, templateId) => {
      registry[templateId] = buildActiveCapabilities(templateId);
      return registry;
    },
    {} as Record<ActiveRendererTemplateId, CripqerRendererCapabilitiesV1>,
  ),
);

export function getRendererCapabilities(
  templateId: string,
  runtimeContext?: RendererRuntimeContextV1,
): CripqerRendererCapabilitiesV1 {
  if (isActiveRendererTemplateId(templateId)) {
    return runtimeContext === undefined
      ? TEMPLATE_RENDERER_CAPABILITIES[templateId]
      : buildActiveCapabilities(templateId, runtimeContext);
  }

  const rendererKind: RendererKindV1 = LEGACY_TEMPLATE_IDS.has(templateId) ? "legacy" : "unknown";
  return buildCapabilities(templateId, rendererKind);
}

function isCapabilityState(value: unknown): value is CapabilityState {
  if (value === null || typeof value !== "object") return false;
  const status = (value as { status?: unknown }).status;
  return status === "supported" || status === "partial" || status === "unsupported";
}

export function explainRendererCapability(
  capabilities: CripqerRendererCapabilitiesV1,
  capabilityPath: string,
): CapabilityState | undefined {
  const segments = capabilityPath.split(".");
  if (segments.length === 0 || segments.some((segment) => segment.length === 0)) return undefined;

  let current: unknown = capabilities;
  for (const segment of segments) {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  if (isCapabilityState(current)) return current;
  if (
    current !== null &&
    typeof current === "object" &&
    Object.prototype.hasOwnProperty.call(current, "capability")
  ) {
    const nestedCapability = (current as { capability?: unknown }).capability;
    return isCapabilityState(nestedCapability) ? nestedCapability : undefined;
  }
  return undefined;
}

export function isRendererCapabilitySupported(
  capabilities: CripqerRendererCapabilitiesV1,
  capabilityPath: string,
): boolean {
  return explainRendererCapability(capabilities, capabilityPath)?.status === "supported";
}

function warningFor(path: string, state: CapabilityState): string {
  const detail = state.reason ?? `Capability is ${state.status}.`;
  const conditions = state.conditions?.length ? ` Conditions: ${state.conditions.join(" ")}` : "";
  return `${path}: ${detail}${conditions}`;
}

export function validateRendererRequirements(
  capabilities: CripqerRendererCapabilitiesV1,
  requirements: readonly RenderabilityRequirementV1[],
): RendererRequirementsValidationV1 {
  const unsupportedPaths: string[] = [];
  const partialPaths: string[] = [];
  const warnings: string[] = [];
  const seenUnsupported = new Set<string>();
  const seenPartial = new Set<string>();

  for (const requirement of requirements) {
    if (!requirement.required) continue;

    const path = requirement.capability;
    const state = explainRendererCapability(capabilities, path);
    if (state === undefined) {
      if (!seenUnsupported.has(path)) {
        seenUnsupported.add(path);
        unsupportedPaths.push(path);
        warnings.push(`${path}: capability path is not defined by RendererCapabilitiesV1.`);
      }
      continue;
    }

    if (state.status === "unsupported" && !seenUnsupported.has(path)) {
      seenUnsupported.add(path);
      unsupportedPaths.push(path);
      warnings.push(warningFor(path, state));
    } else if (state.status === "partial" && !seenPartial.has(path)) {
      seenPartial.add(path);
      partialPaths.push(path);
      warnings.push(warningFor(path, state));
    }
  }

  return deepFreeze({
    renderable: unsupportedPaths.length === 0 && partialPaths.length === 0,
    unsupported: unsupportedPaths,
    partial: partialPaths,
    warnings,
  });
}
