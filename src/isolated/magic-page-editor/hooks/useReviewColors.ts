/**
 * El puente entre el editor y `reviewColors`: lee la página una sola vez y
 * entrega el tema resuelto y los tokens semánticos que la página admite.
 *
 * Vive en un hook —y no dentro del bloque— porque el panel de color del editor
 * necesita exactamente la misma entrada que la tarjeta: si el panel midiera con
 * otra fuente, el ratio que muestra no sería el que se ve. Una sola entrada,
 * una sola medición.
 *
 * `useReviewColorSource` es el único hook; la resolución se expone como función
 * pura para poder llamarla dentro de un `map` sin romper las reglas de hooks.
 */
import { useEditor } from '../contexts/EditorContext';
import { visualPaletteById } from '../data/visualPresets';
import {
  resolveReviewColors,
  supportedSemanticTokens,
  type ReviewColorProps,
  type ReviewColorScope,
  type ReviewSemanticTokens,
  type ReviewThemeTokens,
} from '../utils/reviewColors';
import { useThemeTokens } from './useThemeTokens';

export interface ReviewColorSource {
  /** Tokens semánticos de la paleta activa, filtrados por lo que el autor ya eligió. */
  semantic: ReviewSemanticTokens | undefined;
  /** El tema ya resuelto por la página (paleta, tono, overrides de página). */
  theme: ReviewThemeTokens;
}

export function useReviewColorSource(): ReviewColorSource {
  const { doc } = useEditor();
  const t = useThemeTokens();
  const page = doc.props['page'] ?? {};
  const paletteId = page['palette'];
  const palette = paletteId ? visualPaletteById[paletteId] : undefined;

  return {
    semantic: supportedSemanticTokens(page, palette),
    theme: {
      surface: t.page.surface,
      fg: t.page.fg,
      muted: t.page.muted,
      line: t.page.line,
      accent: t.accent,
      accentFg: t.accentFg,
    },
  };
}

/** Función pura: seguro dentro de un `map`. */
export function reviewColorScopeFor(
  source: ReviewColorSource,
  props: ReviewColorProps,
  blockProps: ReviewColorProps,
): ReviewColorScope {
  return resolveReviewColors({
    props,
    blockProps,
    semantic: source.semantic,
    theme: source.theme,
  });
}
