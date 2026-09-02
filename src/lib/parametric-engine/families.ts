/**
 * Controlled family registry.
 *
 * A family is a PARAMETER STRATEGY, not a hardcoded page. It supplies base
 * values that rules.ts then modulates with the design profile.
 */

import type {
  Alignment,
  BorderStyle,
  Density,
  FamilyId,
  RadiusToken,
  Scale,
} from "./types";

export interface FamilyDefinition {
  id: FamilyId;
  character: string[];
  geometry: { radius: RadiusToken; border_style: BorderStyle; density: Density };
  scales: { heading: Scale; body: Scale };
  alignment: Alignment;
  avatar: { shape: "circle" | "soft-square" | "square"; ring: "none" | "subtle" | "accent" };
  button: { style: "solid" | "outline" | "soft"; icon_position: "left" | "right" };
  card: { style: "flat" | "bordered" | "elevated"; action_style: "text" | "chip" };
  background: { type: "solid" | "linear-gradient" | "radial-gradient" };
  /** Base preference for card-style link presentation, 0-100. */
  card_affinity: number;
}

export const FAMILIES: Record<FamilyId, FamilyDefinition> = {
  editorial: {
    id: "editorial",
    character: ["refined", "content-led", "generous whitespace"],
    geometry: { radius: "soft", border_style: "subtle", density: "spacious" },
    scales: { heading: "lg", body: "md" },
    alignment: "left",
    avatar: { shape: "soft-square", ring: "none" },
    button: { style: "outline", icon_position: "right" },
    card: { style: "flat", action_style: "text" },
    background: { type: "solid" },
    card_affinity: 60,
  },
  luxury: {
    id: "luxury",
    character: ["premium", "restrained", "high contrast", "elegant"],
    geometry: { radius: "soft", border_style: "subtle", density: "spacious" },
    scales: { heading: "lg", body: "md" },
    alignment: "center",
    avatar: { shape: "circle", ring: "accent" },
    button: { style: "solid", icon_position: "right" },
    card: { style: "bordered", action_style: "text" },
    background: { type: "radial-gradient" },
    card_affinity: 55,
  },
  corporate: {
    id: "corporate",
    character: ["professional", "trustworthy", "structured"],
    geometry: { radius: "soft", border_style: "defined", density: "balanced" },
    scales: { heading: "md", body: "md" },
    alignment: "left",
    avatar: { shape: "soft-square", ring: "subtle" },
    button: { style: "solid", icon_position: "right" },
    card: { style: "bordered", action_style: "chip" },
    background: { type: "solid" },
    card_affinity: 70,
  },
  minimal: {
    id: "minimal",
    character: ["clean", "quiet", "simple"],
    geometry: { radius: "sharp", border_style: "subtle", density: "spacious" },
    scales: { heading: "md", body: "md" },
    alignment: "center",
    avatar: { shape: "circle", ring: "none" },
    button: { style: "outline", icon_position: "right" },
    card: { style: "flat", action_style: "text" },
    background: { type: "solid" },
    card_affinity: 25,
  },
  creator: {
    id: "creator",
    character: ["visual", "friendly", "social-first"],
    geometry: { radius: "rounded", border_style: "subtle", density: "balanced" },
    scales: { heading: "md", body: "md" },
    alignment: "center",
    avatar: { shape: "circle", ring: "accent" },
    button: { style: "soft", icon_position: "left" },
    card: { style: "elevated", action_style: "chip" },
    background: { type: "linear-gradient" },
    card_affinity: 80,
  },
  energetic: {
    id: "energetic",
    character: ["bold", "higher visual energy", "strong CTA"],
    geometry: { radius: "pill", border_style: "none", density: "compact" },
    scales: { heading: "lg", body: "md" },
    alignment: "center",
    avatar: { shape: "circle", ring: "accent" },
    button: { style: "solid", icon_position: "right" },
    card: { style: "elevated", action_style: "chip" },
    background: { type: "linear-gradient" },
    card_affinity: 65,
  },
};

/** Fixed tie-break order — guarantees deterministic family selection. */
export const FAMILY_PRIORITY: FamilyId[] = [
  "corporate",
  "editorial",
  "minimal",
  "luxury",
  "creator",
  "energetic",
];
