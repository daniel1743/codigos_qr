import { normalizeHex } from '../components/editor/controls/SwatchRow';
import type { ThemeTokens } from '../types/editor';

export const PAGE_COLOR_SWATCH_LIMIT = 6;

/**
 * Collects the colors currently represented by a Magic page.
 *
 * Explicit page overrides win first, followed by the resolved theme tokens and
 * then the active palette swatches. Invalid values such as color-mix()
 * expressions are ignored, and equivalent HEX forms are deduplicated.
 */
export function extractPageColorSwatches(
  tokens: ThemeTokens,
  page: Record<string, string | undefined>,
  fallbackSwatches: string[] = [],
): string[] {
  const candidates: Array<string | undefined> = [
    page['accent'],
    page['accentFg'],
    page['mutedColor'],
    page['surfaceColor'],
    page['lineColor'],
    page['textColor'],
    page['bgOverride'] || page['bg'],
    tokens.accent,
    tokens.accentFg,
    tokens.page.color,
    tokens.page.fg,
    tokens.page.muted,
    tokens.page.surface,
    tokens.page.line,
    ...(tokens.swatches ?? []),
    ...fallbackSwatches,
  ];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeHex(candidate ?? '');
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(normalized);
    if (result.length >= PAGE_COLOR_SWATCH_LIMIT) break;
  }

  return result;
}
