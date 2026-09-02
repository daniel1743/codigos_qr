/**
 * V1.5 — design axis registry.
 *
 * PageRecipeV1 is more expressive than the V1 baseline exploits. Each family
 * declares SAFE ALLOWED OPTIONS per axis so advanced candidate generation can
 * vary design without producing incoherent cross-family combinations.
 *
 * Baseline generation (variant 0, no context) is unaffected.
 */

import type {
  Alignment,
  BorderStyle,
  Density,
  FamilyId,
  HeroMode,
  RadiusToken,
  Scale,
} from "./types";

export const DESIGN_AXES = [
  "radius",
  "border_style",
  "density",
  "background_type",
  "avatar_shape",
  "avatar_ring",
  "button_style",
  "button_icon_position",
  "card_style",
  "card_action_style",
  "heading_scale",
  "body_scale",
  "spacing_rhythm",
  "identity_alignment",
  "hero_mode",
  "links_presentation",
] as const;
export type DesignAxis = (typeof DESIGN_AXES)[number];

export interface FamilyAxisOptions {
  radius: RadiusToken[];
  border_style: BorderStyle[];
  density: Density[];
  background_type: ("solid" | "linear-gradient" | "radial-gradient")[];
  avatar_shape: ("circle" | "soft-square" | "square")[];
  avatar_ring: ("none" | "subtle" | "accent")[];
  button_style: ("solid" | "outline" | "soft")[];
  button_icon_position: ("left" | "right")[];
  card_style: ("flat" | "bordered" | "elevated")[];
  card_action_style: ("text" | "chip")[];
  heading_scale: Scale[];
  body_scale: Scale[];
  spacing_rhythm: Density[];
  identity_alignment: Alignment[];
  hero_mode: HeroMode[];
  links_presentation: ("buttons" | "cards" | "mixed")[];
}

const ALL_HERO: HeroMode[] = ["avatar_only", "banner_only", "banner_avatar"];

export const FAMILY_AXES: Record<FamilyId, FamilyAxisOptions> = {
  editorial: {
    radius: ["sharp", "soft"],
    border_style: ["none", "subtle"],
    density: ["balanced", "spacious"],
    background_type: ["solid"],
    avatar_shape: ["soft-square", "circle"],
    avatar_ring: ["none", "subtle"],
    button_style: ["outline", "solid"],
    button_icon_position: ["right"],
    card_style: ["flat", "bordered"],
    card_action_style: ["text"],
    heading_scale: ["md", "lg"],
    body_scale: ["md"],
    spacing_rhythm: ["balanced", "spacious"],
    identity_alignment: ["left", "center"],
    hero_mode: ALL_HERO,
    links_presentation: ["buttons", "cards", "mixed"],
  },
  luxury: {
    radius: ["soft", "rounded"],
    border_style: ["subtle", "defined"],
    density: ["balanced", "spacious"],
    background_type: ["solid", "radial-gradient"],
    avatar_shape: ["circle", "soft-square"],
    avatar_ring: ["accent", "subtle"],
    button_style: ["solid", "outline"],
    button_icon_position: ["right"],
    card_style: ["bordered", "flat"],
    card_action_style: ["text"],
    heading_scale: ["lg", "md"],
    body_scale: ["md"],
    spacing_rhythm: ["spacious", "balanced"],
    identity_alignment: ["center", "left"],
    hero_mode: ALL_HERO,
    links_presentation: ["cards", "mixed", "buttons"],
  },
  corporate: {
    radius: ["soft", "sharp"],
    border_style: ["defined", "subtle"],
    density: ["compact", "balanced"],
    background_type: ["solid"],
    avatar_shape: ["soft-square", "square", "circle"],
    avatar_ring: ["subtle", "none"],
    button_style: ["solid", "outline"],
    button_icon_position: ["right", "left"],
    card_style: ["bordered", "elevated"],
    card_action_style: ["chip", "text"],
    heading_scale: ["md", "sm"],
    body_scale: ["md", "sm"],
    spacing_rhythm: ["compact", "balanced"],
    identity_alignment: ["left", "center"],
    hero_mode: ALL_HERO,
    links_presentation: ["cards", "buttons", "mixed"],
  },
  minimal: {
    radius: ["sharp", "soft"],
    border_style: ["none", "subtle"],
    density: ["balanced", "spacious"],
    background_type: ["solid"],
    avatar_shape: ["circle", "square"],
    avatar_ring: ["none"],
    button_style: ["outline", "solid"],
    button_icon_position: ["right"],
    card_style: ["flat", "bordered"],
    card_action_style: ["text"],
    heading_scale: ["md", "sm"],
    body_scale: ["md"],
    spacing_rhythm: ["balanced", "spacious"],
    identity_alignment: ["center", "left"],
    hero_mode: ALL_HERO,
    links_presentation: ["buttons", "mixed"],
  },
  creator: {
    radius: ["rounded", "pill", "soft"],
    border_style: ["none", "subtle"],
    density: ["compact", "balanced"],
    background_type: ["linear-gradient", "solid"],
    avatar_shape: ["circle"],
    avatar_ring: ["accent", "subtle"],
    button_style: ["soft", "solid"],
    button_icon_position: ["left", "right"],
    card_style: ["elevated", "flat"],
    card_action_style: ["chip", "text"],
    heading_scale: ["md", "lg"],
    body_scale: ["md"],
    spacing_rhythm: ["compact", "balanced"],
    identity_alignment: ["center"],
    hero_mode: ALL_HERO,
    links_presentation: ["cards", "mixed", "buttons"],
  },
  energetic: {
    radius: ["rounded", "pill"],
    border_style: ["none", "subtle"],
    density: ["compact", "balanced"],
    background_type: ["linear-gradient", "solid"],
    avatar_shape: ["circle", "soft-square"],
    avatar_ring: ["accent", "none"],
    button_style: ["solid", "soft"],
    button_icon_position: ["right", "left"],
    card_style: ["elevated", "bordered"],
    card_action_style: ["chip"],
    heading_scale: ["lg", "md"],
    body_scale: ["md"],
    spacing_rhythm: ["compact", "balanced"],
    identity_alignment: ["center", "left"],
    hero_mode: ALL_HERO,
    links_presentation: ["cards", "buttons", "mixed"],
  },
};

export function allowedAxisValues<K extends DesignAxis>(
  family: FamilyId,
  axis: K,
): FamilyAxisOptions[K] {
  return FAMILY_AXES[family][axis];
}

export function isAllowedAxisValue(
  family: FamilyId,
  axis: DesignAxis,
  value: string,
): boolean {
  return (FAMILY_AXES[family][axis] as readonly string[]).includes(value);
}
