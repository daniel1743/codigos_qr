import type {
  BioTemplateConfig,
  EntrancePreset,
  HoverPreset,
  MotionConfig,
  MotionPresetId,
} from "../types";

/**
 * MOTION PRESETS
 * Reusable motion configurations. Each preset defines entrance, hover,
 * duration, delay and stagger values. Templates may override individual
 * settings while keeping the preset as base.
 */

export const MOTION_PRESETS: Record<MotionPresetId, MotionConfig> = {
  none: {
    preset: "none",
    entrance: "none",
    hover: "none",
    duration: 0,
    delay: 0,
    stagger: 0,
  },
  minimal: {
    preset: "minimal",
    entrance: "fade",
    hover: "none",
    duration: 220,
    delay: 0,
    stagger: 30,
  },
  soft: {
    preset: "soft",
    entrance: "soft-rise",
    hover: "lift",
    duration: 300,
    delay: 0,
    stagger: 60,
  },
  editorial: {
    preset: "editorial",
    entrance: "fade",
    hover: "border-emphasis",
    duration: 420,
    delay: 0,
    stagger: 80,
  },
  creator: {
    preset: "creator",
    entrance: "scale-in",
    hover: "soft-scale",
    duration: 280,
    delay: 0,
    stagger: 50,
  },
};

export const MOTION_PRESET_OPTIONS: { value: MotionPresetId; label: string }[] = [
  { value: "none", label: "None" },
  { value: "minimal", label: "Minimal" },
  { value: "soft", label: "Soft" },
  { value: "editorial", label: "Editorial" },
  { value: "creator", label: "Creator" },
];

export const ENTRANCE_OPTIONS: { value: EntrancePreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "soft-rise", label: "Rise" },
  { value: "slide-up", label: "Slide" },
  { value: "scale-in", label: "Scale" },
];

export const HOVER_OPTIONS: { value: HoverPreset; label: string }[] = [
  { value: "none", label: "None" },
  { value: "lift", label: "Lift" },
  { value: "soft-scale", label: "Scale" },
  { value: "glow", label: "Glow" },
  { value: "border-emphasis", label: "Border" },
];

/** Default motion preset applied when config has no motion field. */
export const DEFAULT_MOTION_PRESET: MotionPresetId = "soft";

/**
 * Resolves the effective MotionConfig for a template.
 * If the config has explicit motion values they are used.
 * Otherwise falls back to the preset (or "soft" default).
 */
export function getMotionConfig(config: BioTemplateConfig): MotionConfig {
  if (config.motion) {
    // If only a preset was selected, fill in the rest from the preset
    const base = MOTION_PRESETS[config.motion.preset] ?? MOTION_PRESETS.soft;
    return {
      ...base,
      ...config.motion,
    };
  }
  return { ...MOTION_PRESETS[DEFAULT_MOTION_PRESET] };
}
