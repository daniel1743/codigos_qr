import React from 'react';
import { useEditor } from '../../../contexts/EditorContext';
import { useThemeTokens } from '../../../hooks/useThemeTokens';
import { extractPageColorSwatches } from '../../../data/pageColorSwatches';
import type { ThemeTokens } from '../../../types/editor';
import { PanelSection } from './PanelSection';
import { SwatchRow } from './SwatchRow';

/**
 * Free page-level colour tokens (L1 — "color libre").
 *
 * Before this, the accent and the muted/surface/line tones could only come from
 * a named palette preset or the template theme. Across the 12 Magic Patterns
 * families that was the single biggest fidelity blocker: *none* of their twelve
 * accents matched any of the 16 presets (best ΔE 4.6, worst 88.7).
 *
 * Each token is an OPTIONAL override stored as a plain string prop. Empty means
 * "not set", and the palette → template-theme chain still decides — so a page
 * that never opens this panel renders byte-for-byte as before, and the document
 * stays valid magic-page V1 (every prop value is a string).
 *
 * The renderer needs no new branch: `useThemeTokens` folds these into `--accent`
 * / `--accent-fg` and the tone's `--muted` / `--surface` / `--line`, which blocks,
 * cards and the footer already read.
 */

interface TokenDef {
  key: 'accent' | 'accentFg' | 'mutedColor' | 'surfaceColor' | 'lineColor';
  label: string;
  hint: string;
  resolved: (tokens: ThemeTokens) => string;
}

const TOKENS: TokenDef[] = [
  {
    key: 'accent',
    label: 'Acento',
    hint: 'Botones, precios, estrellas, iconos y filetes.',
    resolved: (t) => t.accent,
  },
  {
    key: 'accentFg',
    label: 'Texto sobre el acento',
    hint: 'El color que se lee encima del acento.',
    resolved: (t) => t.accentFg,
  },
  {
    key: 'mutedColor',
    label: 'Texto secundario',
    hint: 'Párrafos y detalles atenuados.',
    resolved: (t) => t.page.muted,
  },
  {
    key: 'surfaceColor',
    label: 'Superficie',
    hint: 'Fondo de tarjetas y paneles.',
    resolved: (t) => t.page.surface,
  },
  {
    key: 'lineColor',
    label: 'Bordes y líneas',
    hint: 'Separadores y contornos.',
    resolved: (t) => t.page.line,
  },
];

export function PageColorTokens({ swatches }: { swatches: string[] }) {
  const ed = useEditor();
  const t = useThemeTokens();
  const page = ed.doc.props['page'] ?? {};
  const pageColors = extractPageColorSwatches(t, page, swatches);
  const unifyOn = !!page['textColor'];

  return (
    <PanelSection
      title="Colores del tema"
      hint="Un color vacío hereda de la paleta o del tema de la plantilla."
    >
      <div className="space-y-4">
        {TOKENS.map((token) => {
          const current = page[token.key];
          const resolved = token.resolved(t);
          return (
            <div key={token.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-4 w-4 flex-shrink-0 rounded-full border border-black/10"
                  style={{ background: resolved }}
                />
                <span className="text-[12.5px] font-medium text-ink">{token.label}</span>
                {current ? (
                  <button
                    type="button"
                    onClick={() => ed.setProp('page', token.key, '')}
                    className="ml-auto text-[11.5px] text-mute underline-offset-2 hover:text-ink hover:underline"
                  >
                    Usar paleta
                  </button>
                ) : null}
              </div>
              <p className="text-[11.5px] leading-snug text-mute">
                {token.hint}
                {unifyOn && token.key === 'mutedColor'
                  ? ' «Unificar color de texto» manda sobre este.'
                  : ''}
              </p>
              <SwatchRow
                colors={swatches}
                pageColors={pageColors}
                value={current}
                onChange={(color) => ed.setProp('page', token.key, color ?? '')}
              />
            </div>
          );
        })}
      </div>
    </PanelSection>
  );
}
