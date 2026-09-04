import type { TemplateTheme } from "../types";
import { hexToRgba } from "../utils";

/**
 * THEME EXTENSION POINT
 * A theme is pure data. Adding one here immediately makes it available in the
 * Design panel, in createTemplate({ theme }) and to future AI generation.
 */

const baseTypography = {
  headingFont: '"Instrument Serif", Georgia, serif',
  bodyFont: '"Inter", ui-sans-serif, system-ui, sans-serif',
  headingSize: 40,
  bodySize: 15,
  headingWeight: 500,
  bodyWeight: 400,
  lineHeight: 1.55,
  letterSpacing: -0.01,
};

const defaultRadii = {
  none: 0,
  small: 6,
  medium: 12,
  large: 18,
  xl: 26,
  pill: 999,
};

const defaultShadows = {
  none: "none",
  soft: "0 2px 10px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
  elevated: "0 10px 30px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.03)",
  floating: "0 20px 48px rgba(0,0,0,0.09), 0 2px 8px rgba(0,0,0,0.04)",
  glow: "0 12px 40px -10px rgba(109, 94, 252, 0.3)",
};

const defaultBorders = {
  none: { width: 0, style: "none" },
  subtle: { width: 1, style: "solid" },
  standard: { width: 1.5, style: "solid" },
  strong: { width: 2.5, style: "solid" },
};

const defaultGradients = {
  aurora: "linear-gradient(135deg, #6d5efc 0%, #22d3ee 50%, #f472b6 100%)",
  ocean: "linear-gradient(135deg, #0e7490 0%, #14b8a6 100%)",
  sunset: "linear-gradient(135deg, #ea580c 0%, #e11d48 100%)",
  midnight: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
  softNeutral: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
};

const defaultSurfaces = {
  solid: { opacity: 1, blur: 0 },
  soft: { opacity: 0.85, blur: 4 },
  glass: { opacity: 0.5, blur: 16 },
  transparent: { opacity: 0, blur: 0 },
};

const defaultTypographyScale = {
  xs: { size: 11, weight: 500, lineHeight: 1.4, letterSpacing: 0.02 },
  sm: { size: 13, weight: 500, lineHeight: 1.5, letterSpacing: 0.01 },
  md: { size: 15, weight: 400, lineHeight: 1.55, letterSpacing: -0.01 },
  lg: { size: 18, weight: 600, lineHeight: 1.3, letterSpacing: -0.015 },
  xl: { size: 26, weight: 600, lineHeight: 1.2, letterSpacing: -0.02 },
  display: { size: 40, weight: 700, lineHeight: 1.1, letterSpacing: -0.03 },
};

function theme(
  t: Partial<TemplateTheme> & Pick<TemplateTheme, "id" | "name" | "colors">,
): TemplateTheme {
  const colors = {
    surfaceAlt: hexToRgba(t.colors.surface, 0.8),
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    ...t.colors,
  };

  const typography = {
    ...baseTypography,
    scale: defaultTypographyScale,
    ...t.typography,
  };

  const spacing = {
    section: 28,
    block: 14,
    contentWidth: 560,
    scale: [0, 4, 8, 12, 16, 24, 32, 48, 64, 96],
    ...t.spacing,
  };

  return {
    typography,
    background: { type: "solid", color: t.colors.background },
    cards: {
      preset: "soft",
      radius: 18,
      borderWidth: 1,
      shadow: "sm",
      blur: 0,
      padding: 18,
      opacity: 1,
    },
    buttons: {
      variant: "solid",
      radius: 14,
      height: 52,
      fontWeight: 550,
      shadow: "sm",
      borderWidth: 1,
    },
    spacing,
    animation: "soft-rise",
    radii: defaultRadii,
    shadows: defaultShadows,
    borders: defaultBorders,
    gradients: defaultGradients,
    surfaces: defaultSurfaces,
    ...t,
    colors,
  } as TemplateTheme;
}

export const THEMES: TemplateTheme[] = [
  theme({
    id: "aurora",
    name: "Aurora",
    colors: {
      primary: "#6d5efc",
      secondary: "#22d3ee",
      accent: "#f472b6",
      background: "#0b0a1a",
      surface: "#131228",
      card: "#171634",
      text: "#f5f4ff",
      mutedText: "#a3a0c4",
      border: "#2a2850",
    },
    background: {
      type: "gradient",
      gradient: { kind: "radial", angle: 160, from: "#241f5c", to: "#08071a" },
      overlay: 0,
      blur: 0,
    },
    cards: {
      preset: "glass",
      radius: 22,
      borderWidth: 1,
      shadow: "glow",
      blur: 14,
      padding: 20,
      opacity: 0.6,
    },
    buttons: {
      variant: "gradient",
      radius: 16,
      height: 54,
      fontWeight: 600,
      shadow: "glow",
      borderWidth: 0,
    },
  }),
  theme({
    id: "midnight",
    name: "Midnight",
    colors: {
      primary: "#e5e7eb",
      secondary: "#9ca3af",
      accent: "#60a5fa",
      background: "#0a0a0b",
      surface: "#131315",
      card: "#161618",
      text: "#fafafa",
      mutedText: "#8b8b93",
      border: "#26262b",
    },
    cards: {
      preset: "elevated",
      radius: 16,
      borderWidth: 1,
      shadow: "md",
      blur: 0,
      padding: 18,
      opacity: 1,
    },
    buttons: {
      variant: "outline",
      radius: 12,
      height: 52,
      fontWeight: 550,
      shadow: "none",
      borderWidth: 1,
    },
  }),
  theme({
    id: "cloud",
    name: "Cloud",
    colors: {
      primary: "#111827",
      secondary: "#6b7280",
      accent: "#2563eb",
      background: "#f6f7f9",
      surface: "#ffffff",
      card: "#ffffff",
      text: "#0f172a",
      mutedText: "#64748b",
      border: "#e5e7eb",
    },
    cards: {
      preset: "soft",
      radius: 18,
      borderWidth: 1,
      shadow: "sm",
      blur: 0,
      padding: 18,
      opacity: 1,
    },
    buttons: {
      variant: "solid",
      radius: 14,
      height: 52,
      fontWeight: 560,
      shadow: "sm",
      borderWidth: 0,
    },
  }),
  theme({
    id: "ocean",
    name: "Ocean",
    colors: {
      primary: "#0e7490",
      secondary: "#0891b2",
      accent: "#14b8a6",
      background: "#f0fbfd",
      surface: "#ffffff",
      card: "#ffffff",
      text: "#0b2b33",
      mutedText: "#5b7c85",
      border: "#cfeaf1",
    },
    background: {
      type: "gradient",
      gradient: { kind: "linear", angle: 180, from: "#e0f6fb", to: "#ffffff" },
    },
    buttons: {
      variant: "soft",
      radius: 999,
      height: 52,
      fontWeight: 560,
      shadow: "none",
      borderWidth: 0,
    },
  }),
  theme({
    id: "graphite",
    name: "Graphite",
    colors: {
      primary: "#1f2937",
      secondary: "#4b5563",
      accent: "#9ca3af",
      background: "#efefed",
      surface: "#ffffff",
      card: "#fbfbfa",
      text: "#18181b",
      mutedText: "#6b7280",
      border: "#dedede",
    },
    cards: {
      preset: "flat",
      radius: 8,
      borderWidth: 1,
      shadow: "none",
      blur: 0,
      padding: 18,
      opacity: 1,
    },
    buttons: {
      variant: "outline",
      radius: 8,
      height: 50,
      fontWeight: 550,
      shadow: "none",
      borderWidth: 1,
    },
    typography: {
      ...baseTypography,
      headingFont: '"Inter", system-ui, sans-serif',
      headingWeight: 650,
      headingSize: 34,
    },
  }),
  theme({
    id: "warm",
    name: "Warm Editorial",
    colors: {
      primary: "#b45309",
      secondary: "#d97706",
      accent: "#ea580c",
      background: "#fdf8f2",
      surface: "#fffdfa",
      card: "#fffaf3",
      text: "#3b2a1a",
      mutedText: "#8c7358",
      border: "#eeddc8",
    },
    background: {
      type: "gradient",
      gradient: { kind: "linear", angle: 170, from: "#fdf1e2", to: "#fffdfa" },
    },
    cards: {
      preset: "soft",
      radius: 20,
      borderWidth: 1,
      shadow: "sm",
      blur: 0,
      padding: 20,
      opacity: 1,
    },
    buttons: {
      variant: "solid",
      radius: 999,
      height: 52,
      fontWeight: 560,
      shadow: "sm",
      borderWidth: 0,
    },
  }),
  theme({
    id: "editorial",
    name: "Editorial",
    colors: {
      primary: "#171717",
      secondary: "#525252",
      accent: "#b91c1c",
      background: "#faf9f6",
      surface: "#ffffff",
      card: "#ffffff",
      text: "#141414",
      mutedText: "#6f6f6f",
      border: "#e6e2d9",
    },
    typography: {
      ...baseTypography,
      headingFont: '"Instrument Serif", Georgia, serif',
      headingSize: 46,
      letterSpacing: -0.02,
      bodySize: 16,
    },
    cards: {
      preset: "minimal",
      radius: 4,
      borderWidth: 1,
      shadow: "none",
      blur: 0,
      padding: 20,
      opacity: 1,
    },
    buttons: {
      variant: "ghost",
      radius: 4,
      height: 50,
      fontWeight: 500,
      shadow: "none",
      borderWidth: 1,
    },
    spacing: { section: 34, block: 16, contentWidth: 620 },
  }),
  theme({
    id: "electric",
    name: "Creator Pop",
    colors: {
      primary: "#d4ff3f",
      secondary: "#7dd3fc",
      accent: "#d4ff3f",
      background: "#080808",
      surface: "#111111",
      card: "#141414",
      text: "#f8f8f8",
      mutedText: "#9a9a9a",
      border: "#242424",
    },
    typography: {
      ...baseTypography,
      headingFont: '"Space Grotesk", system-ui, sans-serif',
      headingWeight: 700,
      headingSize: 42,
      letterSpacing: -0.03,
    },
    cards: {
      preset: "elevated",
      radius: 20,
      borderWidth: 1,
      shadow: "glow",
      blur: 0,
      padding: 18,
      opacity: 1,
    },
    buttons: {
      variant: "solid",
      radius: 999,
      height: 54,
      fontWeight: 650,
      shadow: "glow",
      borderWidth: 0,
    },
  }),
  theme({
    id: "minimal",
    name: "Minimal",
    colors: {
      primary: "#000000",
      secondary: "#555555",
      accent: "#000000",
      background: "#ffffff",
      surface: "#ffffff",
      card: "#ffffff",
      text: "#000000",
      mutedText: "#7a7a7a",
      border: "#ebebeb",
    },
    cards: {
      preset: "minimal",
      radius: 10,
      borderWidth: 1,
      shadow: "none",
      blur: 0,
      padding: 16,
      opacity: 1,
    },
    buttons: {
      variant: "outline",
      radius: 10,
      height: 48,
      fontWeight: 500,
      shadow: "none",
      borderWidth: 1,
    },
    typography: {
      ...baseTypography,
      headingFont: '"Inter", system-ui, sans-serif',
      headingWeight: 600,
      headingSize: 32,
    },
  }),
  theme({
    id: "corporate",
    name: "Clean Corporate",
    colors: {
      primary: "#1e3a8a",
      secondary: "#1d4ed8",
      accent: "#0ea5e9",
      background: "#f4f6fb",
      surface: "#ffffff",
      card: "#ffffff",
      text: "#0f172a",
      mutedText: "#5b6780",
      border: "#dfe5f1",
    },
    typography: {
      ...baseTypography,
      headingFont: '"Inter", system-ui, sans-serif',
      headingWeight: 620,
      headingSize: 34,
      letterSpacing: -0.02,
    },
    cards: {
      preset: "soft",
      radius: 12,
      borderWidth: 1,
      shadow: "sm",
      blur: 0,
      padding: 18,
      opacity: 1,
    },
    buttons: {
      variant: "solid",
      radius: 10,
      height: 50,
      fontWeight: 580,
      shadow: "sm",
      borderWidth: 0,
    },
  }),
  theme({
    id: "luxury",
    name: "Luxury Neutral",
    colors: {
      primary: "#c8a96a",
      secondary: "#8c7a5e",
      accent: "#c8a96a",
      background: "#0c0b09",
      surface: "#141210",
      card: "#171512",
      text: "#f3efe6",
      mutedText: "#a3998a",
      border: "#2b2620",
    },
    typography: {
      ...baseTypography,
      headingFont: '"Instrument Serif", Georgia, serif',
      headingSize: 44,
      letterSpacing: 0.01,
      bodySize: 15,
    },
    cards: {
      preset: "luxury",
      radius: 2,
      borderWidth: 1,
      shadow: "none",
      blur: 0,
      padding: 22,
      opacity: 1,
    },
    buttons: {
      variant: "outline",
      radius: 2,
      height: 54,
      fontWeight: 500,
      shadow: "none",
      borderWidth: 1,
    },
    spacing: { section: 34, block: 14, contentWidth: 580 },
  }),
];

export const THEME_MAP: Record<string, TemplateTheme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
);

export function getTheme(id: string): TemplateTheme {
  return THEME_MAP[id] ?? THEMES[0]!;
}

const FONT_INTER = '"Inter", ui-sans-serif, system-ui, sans-serif';
const FONT_GROTESK = '"Space Grotesk", ui-sans-serif, system-ui, sans-serif';
const FONT_INSTRUMENT = '"Instrument Serif", Georgia, serif';
const FONT_PLAYFAIR = '"Playfair Display", Georgia, serif';
const FONT_DM = '"DM Sans", ui-sans-serif, system-ui, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace';

export const FONT_OPTIONS = [
  { label: "Inter", value: FONT_INTER },
  { label: "Space Grotesk", value: FONT_GROTESK },
  { label: "Instrument Serif", value: FONT_INSTRUMENT },
  { label: "Playfair Display", value: FONT_PLAYFAIR },
  { label: "DM Sans", value: FONT_DM },
  { label: "JetBrains Mono", value: FONT_MONO },
];

export interface TypographyPreset {
  id: string;
  name: string;
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  headingSize: number;
  letterSpacing: number;
}

export const TYPOGRAPHY_PRESETS: TypographyPreset[] = [
  {
    id: "modern",
    name: "Modern",
    headingFont: FONT_GROTESK,
    bodyFont: FONT_INTER,
    headingWeight: 650,
    headingSize: 38,
    letterSpacing: -0.03,
  },
  {
    id: "editorial",
    name: "Editorial",
    headingFont: FONT_INSTRUMENT,
    bodyFont: FONT_INTER,
    headingWeight: 500,
    headingSize: 46,
    letterSpacing: -0.02,
  },
  {
    id: "corporate",
    name: "Corporate",
    headingFont: FONT_INTER,
    bodyFont: FONT_INTER,
    headingWeight: 620,
    headingSize: 34,
    letterSpacing: -0.02,
  },
  {
    id: "minimal",
    name: "Minimal",
    headingFont: FONT_DM,
    bodyFont: FONT_DM,
    headingWeight: 550,
    headingSize: 32,
    letterSpacing: 0,
  },
  {
    id: "creator",
    name: "Creator",
    headingFont: FONT_GROTESK,
    bodyFont: FONT_DM,
    headingWeight: 700,
    headingSize: 42,
    letterSpacing: -0.03,
  },
  {
    id: "luxury",
    name: "Luxury",
    headingFont: FONT_PLAYFAIR,
    bodyFont: FONT_INTER,
    headingWeight: 500,
    headingSize: 44,
    letterSpacing: 0.01,
  },
];
