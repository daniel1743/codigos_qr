import { useEditor } from '../contexts/EditorContext';
import { templates } from '../data/templates';
import type { ThemeTokens } from '../types/editor';

export function useThemeTokens(): ThemeTokens {
  const { templateId, doc } = useEditor();
  const base = templates[templateId].theme;
  const page = doc.props.page ?? {};
  const tone = base.tones.find((t) => t.id === page.bg) ?? base.tones[0];
  const font = base.fonts.find((f) => f.id === page.font) ?? base.fonts[0];
  return { ...base, page: tone, displayFont: font.display, bodyFont: font.body };
}

export function useProp(id: string, key: string, fallback: string): string {
  const { doc } = useEditor();
  return doc.props[id]?.[key] ?? fallback;
}