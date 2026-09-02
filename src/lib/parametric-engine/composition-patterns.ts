/**
 * V1.5 — composition grammar.
 *
 * Patterns are SEMANTIC strategies, never hardcoded JSX templates. Where
 * PageRecipeV1 already supports the behavior, a pattern may influence hero
 * mode, alignment, links presentation, density and block order. Everything
 * else stays dormant until a future renderer capability exists.
 */

import type { ArchetypeStrategy } from "./archetypes";
import type { BusinessSignalsV1 } from "./business-signals";
import type { ContentInventoryV1 } from "./content-inventory";
import type { Alignment, Density, HeroMode, NormalizedIntent } from "./types";
import { stableHash } from "./utils";

export const COMPOSITION_PATTERNS = [
  "centered_profile",
  "editorial_stack",
  "visual_cover",
  "conversion_first",
  "portfolio_first",
  "service_first",
  "trust_first",
  "social_first",
  "compact_action",
  "media_story",
] as const;
export type CompositionPattern = (typeof COMPOSITION_PATTERNS)[number];

export interface PatternDefinition {
  id: CompositionPattern;
  description: string;
  /** Soft, capability-safe influence over the CURRENT recipe contract. */
  influence: {
    hero_mode?: HeroMode;
    identity_alignment?: Alignment;
    links_presentation?: "buttons" | "cards" | "mixed";
    density?: Density;
    /** Block roles in preferred order. Only reorders supported blocks. */
    role_order: ("identity" | "conversion" | "navigation" | "media" | "meta")[];
  };
  /** Requires a hero/card image to be worthwhile. */
  requires_media: boolean;
}

const ORDER_CONVERSION: PatternDefinition["influence"]["role_order"] = [
  "identity",
  "conversion",
  "navigation",
  "media",
  "meta",
];
const ORDER_MEDIA_FIRST: PatternDefinition["influence"]["role_order"] = [
  "identity",
  "media",
  "conversion",
  "navigation",
  "meta",
];
const ORDER_NAV_FIRST: PatternDefinition["influence"]["role_order"] = [
  "identity",
  "navigation",
  "conversion",
  "media",
  "meta",
];

export const PATTERNS: Record<CompositionPattern, PatternDefinition> = {
  centered_profile: {
    id: "centered_profile",
    description: "Classic centered identity with a clear primary action.",
    influence: { identity_alignment: "center", role_order: ORDER_CONVERSION },
    requires_media: false,
  },
  editorial_stack: {
    id: "editorial_stack",
    description: "Left-aligned editorial rhythm with generous spacing.",
    influence: {
      identity_alignment: "left",
      density: "spacious",
      role_order: ORDER_CONVERSION,
    },
    requires_media: false,
  },
  visual_cover: {
    id: "visual_cover",
    description: "Banner-led hero carrying the visual weight.",
    influence: { hero_mode: "banner_avatar", role_order: ORDER_CONVERSION },
    requires_media: true,
  },
  conversion_first: {
    id: "conversion_first",
    description: "Primary action immediately after identity.",
    influence: { links_presentation: "buttons", role_order: ORDER_CONVERSION },
    requires_media: false,
  },
  portfolio_first: {
    id: "portfolio_first",
    description: "Work proof before secondary navigation.",
    influence: { links_presentation: "cards", role_order: ORDER_MEDIA_FIRST },
    requires_media: true,
  },
  service_first: {
    id: "service_first",
    description: "Offer/services visible before generic links.",
    influence: { links_presentation: "cards", role_order: ORDER_CONVERSION },
    requires_media: false,
  },
  trust_first: {
    id: "trust_first",
    description: "Credibility signals precede conversion.",
    influence: {
      identity_alignment: "left",
      links_presentation: "cards",
      role_order: ORDER_CONVERSION,
    },
    requires_media: false,
  },
  social_first: {
    id: "social_first",
    description: "Social navigation dominant, single light CTA.",
    influence: {
      identity_alignment: "center",
      links_presentation: "buttons",
      role_order: ORDER_NAV_FIRST,
    },
    requires_media: false,
  },
  compact_action: {
    id: "compact_action",
    description: "Dense, fast, mobile-first conversion.",
    influence: {
      density: "compact",
      links_presentation: "buttons",
      role_order: ORDER_CONVERSION,
    },
    requires_media: false,
  },
  media_story: {
    id: "media_story",
    description: "Visual storytelling with media-led cards.",
    influence: { links_presentation: "cards", role_order: ORDER_MEDIA_FIRST },
    requires_media: true,
  },
};

export interface PatternContext {
  intent: NormalizedIntent;
  signals: BusinessSignalsV1;
  strategy: ArchetypeStrategy;
  content: ContentInventoryV1;
  variant: number;
}

/** Deterministic pattern selection. Same input => same pattern. */
export function selectCompositionPattern(ctx: PatternContext): CompositionPattern {
  const hasMedia =
    ctx.intent.assets.has_banner ||
    ctx.intent.assets.has_card_media ||
    ctx.content.gallery.available ||
    ctx.content.portfolio.available;

  const candidates = ctx.strategy.preferred_patterns.filter(
    (p) => !PATTERNS[p].requires_media || hasMedia,
  );
  const pool = candidates.length > 0 ? candidates : (["centered_profile"] as CompositionPattern[]);
  if (ctx.variant === 0) return pool[0]!;
  const seed = stableHash(
    [
      "pattern",
      String(ctx.variant),
      ctx.signals.archetype,
      ctx.intent.primary_goal,
      ctx.intent.visual_personality,
    ].join("|"),
  );
  return pool[seed % pool.length]!;
}

/** Reorders supported blocks according to the pattern's role priority. */
export function patternRoleRank(
  pattern: CompositionPattern,
): Record<"identity" | "conversion" | "navigation" | "media" | "meta", number> {
  const order = PATTERNS[pattern].influence.role_order;
  return {
    identity: order.indexOf("identity"),
    conversion: order.indexOf("conversion"),
    navigation: order.indexOf("navigation"),
    media: order.indexOf("media"),
    meta: order.indexOf("meta"),
  };
}
