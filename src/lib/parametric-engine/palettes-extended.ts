/**
 * V1.5 — expanded safe visual bank.
 *
 * ADVANCED palettes used only by advanced candidate generation and presets.
 * The original per-family baseline palettes in palettes.ts are preserved and
 * untouched, so variant 0 output never changes.
 *
 * Every palette here is contrast-checked at module level by
 * validateAdvancedPalettes() and by the engine self-check.
 */

import { PALETTES } from "./palettes";
import type { FamilyId, RecipePalette } from "./types";
import { contrastRatio } from "./utils";

export type PaletteDirection =
  | "warm"
  | "cool"
  | "neutral"
  | "dark"
  | "light"
  | "earthy"
  | "professional"
  | "editorial"
  | "premium"
  | "energetic";

export interface AdvancedPalette {
  id: string;
  direction: PaletteDirection;
  families: FamilyId[];
  palette: RecipePalette;
}

const P = (
  id: string,
  direction: PaletteDirection,
  families: FamilyId[],
  palette: RecipePalette,
): AdvancedPalette => ({ id, direction, families, palette });

export const ADVANCED_PALETTES: AdvancedPalette[] = [
  P("warm-sand", "warm", ["editorial", "luxury", "creator"], {
    background: "#FFFBF5",
    surface: "#F6ECDF",
    text: "#26201A",
    text_muted: "#5C5045",
    accent: "#9A4A1F",
    accent_contrast: "#FFFFFF",
    border: "#E8DAC7",
  }),
  P("warm-clay", "earthy", ["editorial", "creator", "minimal"], {
    background: "#FDFBF8",
    surface: "#F1EAE2",
    text: "#241F1B",
    text_muted: "#574E45",
    accent: "#7A3B2E",
    accent_contrast: "#FFFFFF",
    border: "#E3D8CC",
  }),
  P("olive-field", "earthy", ["editorial", "minimal", "corporate"], {
    background: "#FBFCF8",
    surface: "#EDF0E6",
    text: "#1E231A",
    text_muted: "#4F5647",
    accent: "#3F5B32",
    accent_contrast: "#FFFFFF",
    border: "#DCE2D2",
  }),
  P("cool-slate", "cool", ["corporate", "minimal", "editorial"], {
    background: "#FBFCFD",
    surface: "#EEF1F5",
    text: "#12181F",
    text_muted: "#4A5560",
    accent: "#22516E",
    accent_contrast: "#FFFFFF",
    border: "#DCE2E9",
  }),
  P("cool-teal", "cool", ["corporate", "creator", "minimal"], {
    background: "#FAFDFD",
    surface: "#E8F2F1",
    text: "#10201F",
    text_muted: "#455C5A",
    accent: "#0F5F5B",
    accent_contrast: "#FFFFFF",
    border: "#D3E4E2",
  }),
  P("neutral-fog", "neutral", ["minimal", "corporate", "editorial"], {
    background: "#FDFDFD",
    surface: "#F2F2F3",
    text: "#17181A",
    text_muted: "#55575C",
    accent: "#2C2E33",
    accent_contrast: "#FFFFFF",
    border: "#E3E3E5",
  }),
  P("ink-night", "dark", ["luxury", "minimal", "corporate"], {
    background: "#0E1013",
    surface: "#181B20",
    text: "#F2F3F5",
    text_muted: "#A9AFB8",
    accent: "#C3CBD6",
    accent_contrast: "#101318",
    border: "#262A31",
  }),
  P("deep-emerald", "dark", ["luxury", "editorial"], {
    background: "#08120F",
    surface: "#101D19",
    text: "#EFF5F2",
    text_muted: "#A7B7B0",
    accent: "#BFD9C7",
    accent_contrast: "#0A1512",
    border: "#1C2C26",
  }),
  P("plum-dusk", "premium", ["luxury", "creator"], {
    background: "#0F0B14",
    surface: "#1A1421",
    text: "#F4F0F8",
    text_muted: "#B2A8BE",
    accent: "#D8C08C",
    accent_contrast: "#15100A",
    border: "#2A2033",
  }),
  P("porcelain", "light", ["minimal", "editorial", "luxury"], {
    background: "#FFFFFF",
    surface: "#F7F8F9",
    text: "#141618",
    text_muted: "#585C61",
    accent: "#1F3A2E",
    accent_contrast: "#FFFFFF",
    border: "#E6E8EA",
  }),
  P("navy-authority", "professional", ["corporate", "editorial"], {
    background: "#FFFFFF",
    surface: "#EFF3F8",
    text: "#0F172A",
    text_muted: "#475569",
    accent: "#12395F",
    accent_contrast: "#FFFFFF",
    border: "#D9E1EB",
  }),
  P("graphite-pro", "professional", ["corporate", "minimal"], {
    background: "#FCFCFD",
    surface: "#F0F1F3",
    text: "#15171B",
    text_muted: "#4E535B",
    accent: "#33383F",
    accent_contrast: "#FFFFFF",
    border: "#E1E3E6",
  }),
  P("editorial-paper", "editorial", ["editorial", "minimal"], {
    background: "#FCFBF7",
    surface: "#F2F0E9",
    text: "#1C1B18",
    text_muted: "#54514A",
    accent: "#2F4858",
    accent_contrast: "#FFFFFF",
    border: "#E2DFD5",
  }),
  P("champagne", "premium", ["luxury", "editorial"], {
    background: "#FFFDF9",
    surface: "#F5EFE4",
    text: "#221E17",
    text_muted: "#5A5245",
    accent: "#7A5A16",
    accent_contrast: "#FFFFFF",
    border: "#E7DCC8",
  }),
  P("electric-indigo", "energetic", ["energetic", "creator"], {
    background: "#FFFFFF",
    surface: "#F1EFFC",
    text: "#141326",
    text_muted: "#4B4867",
    accent: "#4A32C4",
    accent_contrast: "#FFFFFF",
    border: "#DFDAF6",
  }),
  P("sunset-coral", "energetic", ["energetic", "creator"], {
    background: "#FFFDFC",
    surface: "#FFEFE9",
    text: "#1F1512",
    text_muted: "#5B4840",
    accent: "#B23A1B",
    accent_contrast: "#FFFFFF",
    border: "#F6DACF",
  }),
  P("forest-calm", "cool", ["minimal", "editorial", "corporate"], {
    background: "#FBFDFB",
    surface: "#ECF2ED",
    text: "#14201A",
    text_muted: "#48564E",
    accent: "#1F5138",
    accent_contrast: "#FFFFFF",
    border: "#D8E4DB",
  }),
  P("mono-contrast", "neutral", ["minimal", "corporate", "editorial"], {
    background: "#FFFFFF",
    surface: "#F4F4F4",
    text: "#000000",
    text_muted: "#4F4F4F",
    accent: "#111111",
    accent_contrast: "#FFFFFF",
    border: "#E0E0E0",
  }),
];

export const MIN_PALETTE_CONTRAST = 4.5;

export function isPaletteAccessible(palette: RecipePalette): boolean {
  return (
    contrastRatio(palette.text, palette.background) >= MIN_PALETTE_CONTRAST &&
    contrastRatio(palette.text, palette.surface) >= MIN_PALETTE_CONTRAST &&
    contrastRatio(palette.text_muted, palette.background) >= MIN_PALETTE_CONTRAST &&
    contrastRatio(palette.accent_contrast, palette.accent) >= MIN_PALETTE_CONTRAST
  );
}

/** Returns the ids of any advanced palette that fails the contrast contract. */
export function validateAdvancedPalettes(): string[] {
  return ADVANCED_PALETTES.filter((p) => !isPaletteAccessible(p.palette)).map((p) => p.id);
}

/** Baseline palettes first (stability), then validated advanced palettes. */
export function paletteBankFor(family: FamilyId): RecipePalette[] {
  const advanced = ADVANCED_PALETTES.filter(
    (p) => p.families.includes(family) && isPaletteAccessible(p.palette),
  ).map((p) => p.palette);
  return [...PALETTES[family], ...advanced];
}
