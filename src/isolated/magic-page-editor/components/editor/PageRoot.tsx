import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Editable } from './Editable';
import { cx } from '../../utils/cx';
import { toneVars } from '../../utils/styles';
import { DecorationLayer } from './DecorationLayer';

const PAGE_VARIANT_PROFILES: Record<string, { width: number; scale: number }> = {
  signature: { width: 760, scale: 1 },
  'soft-grid': { width: 620, scale: 0.9 },
  portrait: { width: 700, scale: 1.08 },
  social: { width: 740, scale: 0.96 },
  journal: { width: 660, scale: 1.14 },
  minimal: { width: 720, scale: 0.86 },
  studio: { width: 680, scale: 1.2 },
  monogram: { width: 640, scale: 1.04 },
  atelier: { width: 820, scale: 0.94 },
  clinical: { width: 740, scale: 1.04 },
  concierge: { width: 900, scale: 0.9 },
  'service-grid': { width: 780, scale: 1.12 },
  story: { width: 860, scale: 1.18 },
  booking: { width: 700, scale: 0.88 },
  local: { width: 940, scale: 1.08 },
  statement: { width: 760, scale: 1.22 },
  archive: { width: 820, scale: 0.92 },
  exhibition: { width: 900, scale: 1.1 },
  'contact-sheet': { width: 740, scale: 0.86 },
  monograph: { width: 860, scale: 1.16 },
  cinema: { width: 960, scale: 1.04 },
  index: { width: 700, scale: 0.9 },
  'case-study': { width: 880, scale: 1.2 },
  nocturne: { width: 780, scale: 1.08 },
  'gallery-editorial': { width: 820, scale: 1 },
  'gallery-mosaic': { width: 900, scale: 1.08 },
  'gallery-filmstrip': { width: 760, scale: 0.92 },
  'gallery-masonry': { width: 940, scale: 1.14 },
  'gallery-stacked': { width: 700, scale: 0.96 },
  left: { width: 760, scale: 1 },
};

interface PageRootProps {
  children: React.ReactNode;
  className?: string;
}

/** The page background itself is tappable: it opens page-level controls (background, typography, settings). */
export function PageRoot({ children, className }: PageRootProps) {
  const t = useThemeTokens();
  const { doc, templateId } = useEditor();
  const page = doc.props['page'] ?? {};
  const family = String(page['family'] ?? templateId);
  const variant = String(page['familyVariant'] ?? (family === 'catalog' ? doc.props['block:catalog']?.variant ?? 'left' : family === 'gallery' ? 'gallery-editorial' : templateId === 'business' ? 'atelier' : templateId === 'portfolio' ? 'archive' : 'signature'));
  const profile = PAGE_VARIANT_PROFILES[variant] ?? PAGE_VARIANT_PROFILES.left;
  return (
    <Editable
      id="page"
      kind="page"
      label="Página"
      data-page-family={family}
      data-page-variant={variant}
      className={cx('relative flex w-full flex-1 flex-col', `page-family-${family}`, `page-variant-${variant}`, className)}
      style={{ ...toneVars(t.page), '--accent': t.accent, '--accent-fg': t.accentFg, '--media-fg': t.media.fg, '--media-muted': t.media.muted, '--media-surface': t.media.surface, '--media-line': t.media.line, '--media-overlay': t.media.overlay, background: t.page.color, color: 'var(--fg)', fontFamily: t.bodyFont, '--page-content-width': `${profile.width}px`, '--page-variant-scale': profile.scale } as React.CSSProperties}>
      <DecorationLayer />
      {children}
    </Editable>);

}

export function useFooterTone(): React.CSSProperties {
  const { doc } = useEditor();
  const t = useThemeTokens();
  const tone = t.tones.find((x) => x.id === doc.props.footer?.bg);
  const resolved = doc.props.page?.palette ? t.page : tone;
  return resolved ? { ...toneVars(resolved), background: resolved.color } : {};
}
