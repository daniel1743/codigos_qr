/**
 * PHASE E1.1 — branding legibility strategy for the system branding line.
 *
 * The system branding ("Visita CRIPQER") used to inherit the page foreground at
 * `opacity: 0.60`, so on saturated or dark surfaces it could drop below any
 * usable contrast. Instead of depending on `--fg` / `--accent`, the branding now
 * resolves its OWN token from the surface it actually sits on, reusing the two
 * official brand colours (`CRIPQER_BRAND.blue` / white) and the existing
 * `Logo theme="default" | "inverse"` API.
 *
 * Pure and dependency-free on purpose: fully unit-testable across palettes.
 */

/** Official brand colours kept in sync with `src/components/brand/Logo.tsx`. */
export const BRANDING_BLUE = "#0D47A1";
export const BRANDING_ON_DARK = "#FFFFFF";

export type BrandingLogoTheme = "default" | "inverse";

export interface BrandingTone {
  /** Colour for the branding text ("Visita") and any inheriting content. */
  color: string;
  /** Existing `Logo` theme that matches `color` (blue vs white wordmark). */
  logoTheme: BrandingLogoTheme;
  /** Measured WCAG contrast ratio of `color` over the surface. */
  contrast: number;
}

function channelToLinear(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** Expands `#abc`, `#aabbcc` and `rgb()`-free hex input into `[r, g, b]`. */
export function parseHexColor(input: string | undefined | null): [number, number, number] | null {
  if (typeof input !== "string") return null;
  const value = input.trim();
  if (!value) return null;
  const short = /^#([0-9a-f]{3})$/i.exec(value);
  if (short) {
    const [r, g, b] = short[1].split("");
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  const long = /^#([0-9a-f]{6})$/i.exec(value);
  if (long) {
    const hex = long[1];
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  return null;
}

/** WCAG relative luminance of a hex colour (`null` when unparsable). */
export function relativeLuminance(color: string | undefined | null): number | null {
  const rgb = parseHexColor(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG 2 contrast ratio between two hex colours. Returns `null` when either
 * colour is unparsable (e.g. `var(--surface)`), so callers can decide to keep
 * the current behaviour instead of guessing.
 */
export function contrastRatio(
  foreground: string | undefined | null,
  background: string | undefined | null,
): number | null {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  if (a === null || b === null) return null;
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Picks the brand colour with the best contrast over `surface`.
 *
 * - Uses the official blue on light surfaces and white on dark/saturated ones.
 * - Falls back to blue when the surface cannot be parsed (`var(--surface)`),
 *   which is exactly today's rendering, so nothing changes for such documents.
 * - Deterministic and monotonic: the choice only depends on measured contrast.
 */
export function resolveBrandingTone(surface: string | undefined | null): BrandingTone {
  const blueContrast = contrastRatio(BRANDING_BLUE, surface);
  const whiteContrast = contrastRatio(BRANDING_ON_DARK, surface);
  if (blueContrast === null || whiteContrast === null) {
    return { color: BRANDING_BLUE, logoTheme: "default", contrast: blueContrast ?? 0 };
  }
  if (blueContrast >= whiteContrast) {
    return { color: BRANDING_BLUE, logoTheme: "default", contrast: blueContrast };
  }
  return { color: BRANDING_ON_DARK, logoTheme: "inverse", contrast: whiteContrast };
}
