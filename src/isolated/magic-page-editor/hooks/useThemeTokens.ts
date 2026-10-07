import { useEditor } from '../contexts/EditorContext';
import { templates } from '../data/templates';
import { visualPaletteById } from '../data/visualPresets';
import type { SurfaceTone, ThemeTokens } from '../types/editor';

function luminance(hex: string): number {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return 0.18;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function readableOn(color: string): string {
  return luminance(color) > 0.42 ? '#211D19' : '#FBF6EE';
}

export function useThemeTokens(): ThemeTokens {
  const { templateId, doc } = useEditor();
  const base = templates[templateId].theme;
  const page = doc.props.page ?? {};
  const palette = page.palette ? visualPaletteById[page.palette] : undefined;
  // `||`, not `??`: the editor clears the override with `""` (a legal string prop)
  // because `undefined` would invalidate the document on reload. See the writers
  // in useSelectionActions.
  const activeBg = page.bgOverride || page.bg;
  const isHexTone = /^#[0-9A-F]{3,6}$/i.test(activeBg ?? '');
  // `isHexTone` no estrecha `activeBg` por sí solo (es un boolean, no un type
  // predicate), así que el literal quedaba con `id: string | undefined` y
  // convertía `tone` en una unión: los spreads de abajo fallaban con
  // exactOptionalPropertyTypes. La condición es la misma — `isHexTone` solo es
  // cierto si `activeBg` es un hex — y el tipo explícito la hace comprobable.
  const tone: SurfaceTone = isHexTone && activeBg ? {
    id: activeBg,
    label: 'Personalizado',
    color: activeBg,
    fg: readableOn(activeBg),
    muted: `color-mix(in srgb, ${readableOn(activeBg)} 60%, ${activeBg})`,
    surface: `color-mix(in srgb, ${activeBg} 90%, transparent)`,
    line: `color-mix(in srgb, ${readableOn(activeBg)} 15%, ${activeBg})`
  } : (base.tones.find((t) => t.id === activeBg) ?? base.tones[0]!);

  let pageTone: SurfaceTone = palette?.page ?? tone;
  if (page.bgOverride) {
    pageTone = tone;
  }

  if (page.textColor) {
    pageTone = { ...pageTone, fg: page.textColor };
  }

  /**
   * Free page-level colour tokens (L1). Each one is an OPTIONAL override that
   * falls through to the palette, then to the template theme — so a page that
   * never touched them renders exactly as before. Precedence, in order:
   *   explicit prop  →  named palette  →  template theme / selected tone
   *
   * They are read here rather than in `toneVars` so blocks, cards and the footer
   * inherit them through the same CSS custom properties they already use — the
   * renderer needs no new branch.
   */
  if (page["mutedColor"]) pageTone = { ...pageTone, muted: page["mutedColor"] };
  if (page["surfaceColor"]) pageTone = { ...pageTone, surface: page["surfaceColor"] };
  if (page["lineColor"]) pageTone = { ...pageTone, line: page["lineColor"] };

  const accent = page["accent"] || palette?.accent || base.accent;
  const accentFg = page["accentFg"] || palette?.accentFg || base.accentFg;

  const font = base.fonts.find((f) => f.id === page.font) ?? base.fonts[0];
  const mediaFg = readableOn(accent);
  return {
    ...base,
    ...(palette ? { swatches: palette.swatches } : {}),
    accent,
    accentFg,
    page: pageTone,
    radius: palette?.radius ?? base.radius,
    displayFont: font.display,
    bodyFont: font.body,
    media: {
      fg: mediaFg,
      muted: `color-mix(in srgb, ${mediaFg} 78%, transparent)`,
      surface: `color-mix(in srgb, ${mediaFg} 14%, transparent)`,
      line: `color-mix(in srgb, ${mediaFg} 36%, transparent)`,
      overlay: `color-mix(in srgb, ${accent} 24%, #111318)`
    }
  };
}

export function useProp(id: string, key: string, fallback: string): string {
  const { doc } = useEditor();
  return doc.props[id]?.[key] ?? fallback;
}
