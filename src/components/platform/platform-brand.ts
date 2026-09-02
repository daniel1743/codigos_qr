/**
 * Canonical brand reference for Cripqer platform chrome.
 *
 * These values are intentionally separate from template design tokens. This
 * module does not replace CSS variables or change any existing page styling.
 */

export const PLATFORM_BRAND_COLORS = {
  blue: "#0D47A1",
  gold: "#D4AF37",
  white: "#FFFFFF",
  warmWhite: "#FAF9F6",
  inverse: "#0B1A2E",
  textPrimary: "#111827",
  textSecondary: "#5B6472",
  success: "#17703E",
} as const;

export const PLATFORM_BRAND_TYPOGRAPHY = {
  primaryFamily: "Montserrat",
} as const;

export const PLATFORM_BRAND = {
  colors: PLATFORM_BRAND_COLORS,
  typography: PLATFORM_BRAND_TYPOGRAPHY,
} as const;

export type PlatformBrand = typeof PLATFORM_BRAND;
export type PlatformBrandColor = keyof typeof PLATFORM_BRAND_COLORS;
export type PlatformBrandTypography = keyof typeof PLATFORM_BRAND_TYPOGRAPHY;
