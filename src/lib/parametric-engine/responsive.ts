/**
 * V1.5 — ResponsiveStrategyV1 (future contract).
 *
 * The current renderer does not consume this. It stays behind the
 * `responsive_strategy` future capability.
 */

import type { CompositionPattern } from "./composition-patterns";
import type { FutureRendererCapabilitiesV1 } from "./future-capabilities";
import type { Density } from "./types";

export type MobileLayout = "stack" | "media_first" | "action_first";
export type DesktopLayout = "centered" | "wide_stack" | "split" | "editorial_left";
export type ContentWidth = "narrow" | "balanced" | "wide";

export interface ResponsiveStrategyV1 {
  mobile: { layout: MobileLayout };
  desktop: { layout: DesktopLayout };
  card_columns: 1 | 2;
  content_width: ContentWidth;
}

export const DEFAULT_RESPONSIVE_STRATEGY: ResponsiveStrategyV1 = {
  mobile: { layout: "stack" },
  desktop: { layout: "centered" },
  card_columns: 1,
  content_width: "narrow",
};

const PATTERN_RESPONSIVE: Partial<Record<CompositionPattern, Partial<ResponsiveStrategyV1>>> = {
  editorial_stack: { desktop: { layout: "editorial_left" }, content_width: "balanced" },
  visual_cover: { mobile: { layout: "media_first" }, desktop: { layout: "wide_stack" }, content_width: "wide" },
  portfolio_first: { mobile: { layout: "media_first" }, desktop: { layout: "wide_stack" }, card_columns: 2, content_width: "wide" },
  media_story: { mobile: { layout: "media_first" }, desktop: { layout: "split" }, card_columns: 2, content_width: "balanced" },
  conversion_first: { mobile: { layout: "action_first" } },
  compact_action: { mobile: { layout: "action_first" }, content_width: "narrow" },
  service_first: { card_columns: 2, desktop: { layout: "wide_stack" } },
  trust_first: { desktop: { layout: "editorial_left" }, content_width: "balanced" },
};

/**
 * Deterministic future strategy. Returns null unless the renderer declares
 * `responsive_strategy` support, so nothing unsupported can leak.
 */
export function buildResponsiveStrategy(
  pattern: CompositionPattern,
  density: Density,
  future: FutureRendererCapabilitiesV1,
): ResponsiveStrategyV1 | null {
  if (future.responsive_strategy !== true) return null;
  const patch = PATTERN_RESPONSIVE[pattern] ?? {};
  return {
    mobile: { ...DEFAULT_RESPONSIVE_STRATEGY.mobile, ...(patch.mobile ?? {}) },
    desktop: { ...DEFAULT_RESPONSIVE_STRATEGY.desktop, ...(patch.desktop ?? {}) },
    card_columns: patch.card_columns ?? DEFAULT_RESPONSIVE_STRATEGY.card_columns,
    content_width:
      patch.content_width ?? (density === "spacious" ? "balanced" : DEFAULT_RESPONSIVE_STRATEGY.content_width),
  };
}
