/**
 * V1.5 — design presets.
 *
 * A preset is a NAMED, SAFE bundle of overrides. It never bypasses
 * compatibility, contrast rules or capability downgrades: it is merged as
 * ordinary DesignOverridesV1 and the normal pipeline still runs.
 */

import type { CompositionPattern } from "./composition-patterns";
import type { DesignOverridesV1, FamilyId } from "./types";

export const DESIGN_PRESETS_IDS = [
  "clean_professional",
  "bold_conversion",
  "editorial_calm",
  "visual_portfolio",
  "premium_dark",
  "friendly_local",
  "creator_social",
  "minimal_focus",
] as const;
export type DesignPresetId = (typeof DESIGN_PRESETS_IDS)[number];

export interface DesignPresetV1 {
  id: DesignPresetId;
  label: string;
  description: string;
  family: FamilyId;
  preferred_pattern: CompositionPattern;
  /** Merged UNDER user overrides: explicit user choices always win. */
  overrides: DesignOverridesV1;
}

export const DESIGN_PRESETS: Record<DesignPresetId, DesignPresetV1> = {
  clean_professional: {
    id: "clean_professional",
    label: "Clean professional",
    description: "Trust-leaning, calm, credible.",
    family: "corporate",
    preferred_pattern: "trust_first",
    overrides: { visual_family: "corporate", identity_alignment: "left", density: "balanced" },
  },
  bold_conversion: {
    id: "bold_conversion",
    label: "Bold conversion",
    description: "Fast, direct, one obvious action.",
    family: "energetic",
    preferred_pattern: "conversion_first",
    overrides: { visual_family: "energetic", links_presentation: "buttons", density: "compact" },
  },
  editorial_calm: {
    id: "editorial_calm",
    label: "Editorial calm",
    description: "Generous rhythm, left-aligned reading flow.",
    family: "editorial",
    preferred_pattern: "editorial_stack",
    overrides: { visual_family: "editorial", identity_alignment: "left", density: "spacious" },
  },
  visual_portfolio: {
    id: "visual_portfolio",
    label: "Visual portfolio",
    description: "Work-first, media-led cards.",
    family: "creator",
    preferred_pattern: "portfolio_first",
    overrides: { visual_family: "creator", links_presentation: "cards", hero_mode: "banner_avatar" },
  },
  premium_dark: {
    id: "premium_dark",
    label: "Premium dark",
    description: "High-end, restrained, dark surface.",
    family: "luxury",
    preferred_pattern: "centered_profile",
    overrides: { visual_family: "luxury", identity_alignment: "center", density: "spacious" },
  },
  friendly_local: {
    id: "friendly_local",
    label: "Friendly local",
    description: "Approachable local business with quick contact.",
    family: "corporate",
    preferred_pattern: "compact_action",
    overrides: { visual_family: "corporate", links_presentation: "buttons", density: "balanced" },
  },
  creator_social: {
    id: "creator_social",
    label: "Creator social",
    description: "Social-led navigation with a light CTA.",
    family: "creator",
    preferred_pattern: "social_first",
    overrides: { visual_family: "creator", identity_alignment: "center", links_presentation: "mixed" },
  },
  minimal_focus: {
    id: "minimal_focus",
    label: "Minimal focus",
    description: "Almost nothing but the essential action.",
    family: "minimal",
    preferred_pattern: "centered_profile",
    overrides: { visual_family: "minimal", links_presentation: "buttons", density: "balanced" },
  },
};

export function getPreset(id: DesignPresetId): DesignPresetV1 {
  return DESIGN_PRESETS[id];
}

export function listPresets(): DesignPresetV1[] {
  return DESIGN_PRESETS_IDS.map((id) => DESIGN_PRESETS[id]);
}

/** Explicit user overrides always take precedence over preset values. */
export function mergePresetOverrides(
  preset: DesignPresetV1,
  user?: DesignOverridesV1,
): DesignOverridesV1 {
  const merged: DesignOverridesV1 = { ...preset.overrides };
  if (user) {
    for (const [key, value] of Object.entries(user)) {
      if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}
