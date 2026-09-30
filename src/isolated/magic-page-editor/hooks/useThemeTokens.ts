import { useEditor } from '../contexts/EditorContext';
import { templates } from '../data/templates';
import { visualPaletteById } from '../data/visualPresets';
import type { ThemeTokens } from '../types/editor';

export function useThemeTokens(): ThemeTokens {
  const { templateId, doc } = useEditor();
  const base = templates[templateId].theme;
  const page = doc.props.page ?? {};
  const palette = page.palette ? visualPaletteById[page.palette] : undefined;
  const tone = base.tones.find((t) => t.id === page.bg) ?? base.tones[0];
  let pageTone = palette?.page ?? tone;
  if (page.textColor) {
    pageTone = { ...pageTone, fg: page.textColor };
  }
  const font = base.fonts.find((f) => f.id === page.font) ?? base.fonts[0];
  return {
    ...base,
    ...(palette ? { accent: palette.accent, accentFg: palette.accentFg, swatches: palette.swatches } : {}),
    page: pageTone,
    radius: palette?.radius ?? base.radius,
    displayFont: font.display,
    bodyFont: font.body
  };
}

export function useProp(id: string, key: string, fallback: string): string {
  const { doc } = useEditor();
  return doc.props[id]?.[key] ?? fallback;
}
