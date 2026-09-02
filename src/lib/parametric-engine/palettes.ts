/**
 * Approved palettes per visual family.
 *
 * Every palette here is contrast-verified against the rules in
 * compatibility.ts (text >= 4.5:1 on background and surface, accent CTA
 * pair >= 4.5:1, muted >= 4.5:1 on background).
 *
 * These are TEMPLATE colors (--tpl-color-*). Cripqer platform brand tokens
 * (--brand-*) are forbidden here by contract.
 */

import type { FamilyId, RecipePalette } from "./types";

export const PALETTES: Record<FamilyId, RecipePalette[]> = {
  editorial: [
    {
      background: "#FFFFFF",
      surface: "#F7F6F3",
      text: "#1A1A1A",
      text_muted: "#5A564F",
      accent: "#1F3A5F",
      accent_contrast: "#FFFFFF",
      border: "#E4E2DC",
    },
    {
      background: "#FBFAF7",
      surface: "#F1EEE7",
      text: "#20201D",
      text_muted: "#575349",
      accent: "#38524A",
      accent_contrast: "#FFFFFF",
      border: "#E0DBD0",
    },
  ],
  luxury: [
    {
      background: "#0B0B0D",
      surface: "#16161A",
      text: "#F5F2EA",
      text_muted: "#B4AEA2",
      accent: "#C9A227",
      accent_contrast: "#14120A",
      border: "#2A2A30",
    },
    {
      background: "#0C1119",
      surface: "#141B26",
      text: "#F2F4F7",
      text_muted: "#AEB6C2",
      accent: "#C8B27A",
      accent_contrast: "#14120A",
      border: "#243040",
    },
  ],
  corporate: [
    {
      background: "#FFFFFF",
      surface: "#F4F6F9",
      text: "#111827",
      text_muted: "#4B5563",
      accent: "#1D4ED8",
      accent_contrast: "#FFFFFF",
      border: "#DDE3EC",
    },
    {
      background: "#FBFCFE",
      surface: "#EEF2F7",
      text: "#101B2D",
      text_muted: "#475569",
      accent: "#155E75",
      accent_contrast: "#FFFFFF",
      border: "#D8E0EA",
    },
  ],
  minimal: [
    {
      background: "#FFFFFF",
      surface: "#FAFAFA",
      text: "#111111",
      text_muted: "#5F5F5F",
      accent: "#111111",
      accent_contrast: "#FFFFFF",
      border: "#E5E5E5",
    },
    {
      background: "#FCFCFC",
      surface: "#F4F4F5",
      text: "#18181B",
      text_muted: "#52525B",
      accent: "#27272A",
      accent_contrast: "#FFFFFF",
      border: "#E4E4E7",
    },
  ],
  creator: [
    {
      background: "#FFFDFB",
      surface: "#FFF2EA",
      text: "#1B1B1F",
      text_muted: "#5A5259",
      accent: "#C2410C",
      accent_contrast: "#FFFFFF",
      border: "#F2DED2",
    },
    {
      background: "#FDFCFF",
      surface: "#F3EFFB",
      text: "#191827",
      text_muted: "#54506B",
      accent: "#7C3AED",
      accent_contrast: "#FFFFFF",
      border: "#E5DEF7",
    },
  ],
  energetic: [
    {
      background: "#FFFFFF",
      surface: "#F5F3FF",
      text: "#16151A",
      text_muted: "#4F4C5A",
      accent: "#6D28D9",
      accent_contrast: "#FFFFFF",
      border: "#E3DDF7",
    },
    {
      background: "#FFFFFF",
      surface: "#FFF4ED",
      text: "#1A1512",
      text_muted: "#574E48",
      accent: "#B91C1C",
      accent_contrast: "#FFFFFF",
      border: "#F6DFD2",
    },
  ],
};

/** Neutral, always-valid fallback used when a palette fails validation. */
export const SAFE_PALETTE: RecipePalette = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  text: "#111111",
  text_muted: "#5A5A5A",
  accent: "#1F2937",
  accent_contrast: "#FFFFFF",
  border: "#E4E4E7",
};
