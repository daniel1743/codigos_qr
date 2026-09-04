/**
 * V1.5 — semantic refinement commands.
 *
 * A refinement is a DETERMINISTIC transformation of generation options
 * ("make it calmer", "more visual"). It never edits a recipe in place and
 * never bypasses compatibility: the pipeline is simply re-run with the
 * refined options. Locked overrides are always preserved.
 */

import { DESIGN_PRESETS_IDS, getPreset, type DesignPresetId } from "./presets";
import {
  clampInt,
  isKnownPreset,
  throwIfInvalid,
  validateDesignOverrides,
} from "./runtime-validation";
import { EngineError } from "./types";
import type { DesignOverridesV1, EngineOptions, NormalizedIntent, OverrideKey } from "./types";

export const REFINEMENT_COMMANDS = [
  "calmer",
  "bolder",
  "more_visual",
  "less_visual",
  "more_professional",
  "more_personal",
  "more_compact",
  "more_spacious",
  "more_conversion",
  "more_premium",
  "more_playful",
  "more_trustworthy",
  "more_minimal",
  "more_editorial",
  "more_local",
  /* V1.5.1 — canonical user vocabulary + aliases. */
  "more_bold",
  "more_calm",
  "stronger_cta",
  "more_trust",
  "prefer_cards",
  "prefer_buttons",
  "prefer_banner",
  "prefer_avatar",
  "prefer_banner_avatar",
  "another_composition",
  "next_variant",
  "previous_variant",
  "reset",
] as const;
export type RefinementCommand = (typeof REFINEMENT_COMMANDS)[number];

export interface RefinementResultV1 {
  options: EngineOptions;
  changed: string[];
  ignored: string[];
}

function lockedSet(overrides?: DesignOverridesV1): Set<OverrideKey> {
  return new Set(overrides?.locked ?? []);
}

export function refineOptions(
  command: RefinementCommand,
  current: EngineOptions,
  intent: NormalizedIntent,
): RefinementResultV1 {
  if (!REFINEMENT_COMMANDS.includes(command)) {
    throw new EngineError("INVALID_OPTIONS", `Unknown refinement command: ${String(command)}.`, [
      { path: "command", code: "enum", message: `Unknown refinement command.` },
    ]);
  }
  const safeCurrent: EngineOptions =
    current && typeof current === "object" && !Array.isArray(current) ? current : {};
  throwIfInvalid("INVALID_OPTIONS", validateDesignOverrides(safeCurrent.overrides));
  const changed: string[] = [];
  const ignored: string[] = [];
  const overrides: DesignOverridesV1 = { ...(safeCurrent.overrides ?? {}) };
  const locked = lockedSet(safeCurrent.overrides);
  let variant = clampInt(safeCurrent.variant, { min: 0, max: 999, fallback: 0 });

  const set = <K extends keyof DesignOverridesV1>(key: K, value: DesignOverridesV1[K]) => {
    if (locked.has(key as OverrideKey)) {
      ignored.push(`${String(key)}:locked`);
      return;
    }
    if (overrides[key] === value) return;
    overrides[key] = value;
    changed.push(String(key));
  };

  switch (command) {
    case "calmer":
      set("density", "spacious");
      set("links_presentation", "buttons");
      set("visual_family", "minimal");
      break;
    case "bolder":
      set("density", "compact");
      set("visual_family", "energetic");
      break;
    case "more_visual":
      if (intent.assets.has_banner) set("hero_mode", "banner_avatar");
      else ignored.push("hero_mode:no_banner_asset");
      if (intent.assets.has_card_media) set("links_presentation", "cards");
      else ignored.push("links_presentation:no_card_media");
      break;
    case "less_visual":
      set("hero_mode", "avatar_only");
      set("links_presentation", "buttons");
      break;
    case "more_professional":
      set("visual_family", "corporate");
      set("identity_alignment", "left");
      break;
    case "more_personal":
      set("visual_family", "creator");
      set("identity_alignment", "center");
      break;
    case "more_compact":
      set("density", "compact");
      break;
    case "more_spacious":
      set("density", "spacious");
      break;
    case "more_conversion":
      set("links_presentation", "buttons");
      set("density", "balanced");
      break;
    case "more_premium":
      set("visual_family", "luxury");
      set("density", "spacious");
      set("links_presentation", "cards");
      break;
    case "more_playful":
      set("visual_family", "creator");
      set("identity_alignment", "center");
      set("density", "compact");
      break;
    case "more_trustworthy":
      set("visual_family", "corporate");
      set("links_presentation", "cards");
      set("density", "balanced");
      break;
    case "more_minimal":
      set("visual_family", "minimal");
      set("links_presentation", "buttons");
      set("hero_mode", "avatar_only");
      break;
    case "more_editorial":
      set("visual_family", "editorial");
      set("identity_alignment", "left");
      set("density", "spacious");
      break;
    case "more_local":
      // Locality is a conversion emphasis, not a color change.
      set("links_presentation", "buttons");
      set("identity_alignment", "left");
      set("density", "balanced");
      break;
    case "more_bold":
      set("density", "compact");
      set("visual_family", "energetic");
      break;
    case "more_calm":
      set("density", "spacious");
      set("links_presentation", "buttons");
      set("visual_family", "minimal");
      break;
    case "stronger_cta":
      set("links_presentation", "buttons");
      set("density", "balanced");
      break;
    case "more_trust":
      set("visual_family", "corporate");
      set("links_presentation", "cards");
      set("density", "balanced");
      break;
    case "prefer_cards":
      if (intent.assets.has_card_media) set("links_presentation", "cards");
      else {
        set("links_presentation", "cards");
        ignored.push("card_media:absent");
      }
      break;
    case "prefer_buttons":
      set("links_presentation", "buttons");
      break;
    case "prefer_banner":
      if (intent.assets.has_banner) set("hero_mode", "banner_only");
      else ignored.push("hero_mode:no_banner_asset");
      break;
    case "prefer_banner_avatar":
      if (intent.assets.has_banner) set("hero_mode", "banner_avatar");
      else ignored.push("hero_mode:no_banner_asset");
      break;

    case "prefer_avatar":
      set("hero_mode", "avatar_only");
      break;
    case "another_composition": {
      // Deterministic structural rotation, not just a palette reshuffle.
      const cycle = ["buttons", "cards", "mixed"] as const;
      const current = overrides.links_presentation ?? "buttons";
      const next = cycle[(cycle.indexOf(current as never) + 1) % cycle.length]!;
      set("links_presentation", next);
      variant = Math.min(999, variant + 1);
      changed.push("variant");
      break;
    }
    case "next_variant":
      variant = Math.min(999, variant + 1);
      changed.push("variant");
      break;
    case "previous_variant":
      if (variant <= 0) {
        ignored.push("variant:at_baseline");
      } else {
        variant -= 1;
        changed.push("variant");
      }
      break;
    case "reset": {
      // Locked keys survive a reset; everything else returns to baseline.
      const kept: DesignOverridesV1 = {};
      for (const key of locked) {
        const value = (overrides as Record<string, unknown>)[key];
        if (value !== undefined) (kept as Record<string, unknown>)[key] = value;
        else ignored.push(`${key}:locked_without_value`);
      }
      if (locked.size > 0) kept.locked = [...locked];
      for (const key of Object.keys(overrides)) {
        if (key !== "locked" && !locked.has(key as OverrideKey)) changed.push(key);
      }
      variant = 0;
      return { options: { ...current, overrides: kept, variant }, changed, ignored };
    }
  }

  return {
    options: { ...safeCurrent, overrides, variant },
    changed,
    ignored,
  };
}

/** Apply a preset as a refinement, respecting locked keys. */
export function refineWithPreset(
  presetId: DesignPresetId,
  current: EngineOptions,
): RefinementResultV1 {
  if (!isKnownPreset(presetId)) {
    throw new EngineError("INVALID_OPTIONS", `Unknown preset: ${String(presetId)}.`, [
      { path: "preset", code: "enum", message: "Unknown preset id." },
    ]);
  }
  const preset = getPreset(presetId);
  const locked = lockedSet(current.overrides);
  const overrides: DesignOverridesV1 = { ...(current.overrides ?? {}) };
  const changed: string[] = [];
  const ignored: string[] = [];

  for (const [key, value] of Object.entries(preset.overrides)) {
    if (value === undefined || key === "locked") continue;
    if (locked.has(key as OverrideKey)) {
      ignored.push(`${key}:locked`);
      continue;
    }
    (overrides as Record<string, unknown>)[key] = value;
    changed.push(key);
  }

  return { options: { ...current, overrides }, changed, ignored };
}

export function listRefinementCommands(): RefinementCommand[] {
  return [...REFINEMENT_COMMANDS];
}

export function listPresetIds(): DesignPresetId[] {
  return [...DESIGN_PRESETS_IDS];
}
