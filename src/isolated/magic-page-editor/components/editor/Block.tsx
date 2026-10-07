import React from 'react';
import { EyeOffIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Editable } from './Editable';
import { blockLabels } from '../../data/blockKit';
import { cx } from '../../utils/cx';
import { toneVars } from '../../utils/styles';
import { DecorationLayer } from './DecorationLayer';
import type { BlockRef } from '../../types/editor';

export type Spacing = 'none' | 'S' | 'M' | 'L';

interface BlockProps {
  block: BlockRef;
  className?: string;
  defaultTone?: string;
  defaultSpacing?: Spacing;
  /** Overrides the generic block label (e.g. "Grupo de botones · 4 elementos"). */
  label?: string;
  children: React.ReactNode;
}

const SPACING: Record<Spacing, number> = { none: 0, S: 28, M: 60, L: 104 };
const MOBILE_SPACING = 0.62;

/**
 * Resolves the `spacing` prop to pixels.
 *
 * A bare integer (e.g. `"48"`) is read as a literal px value, so the Magic
 * Patterns targets' 40/48/56px sections become reachable. The four named steps
 * keep their exact meaning for documents that already store them.
 *
 * Two behaviours worth knowing, both pre-existing and deliberately unchanged:
 *  · `S` and `M` are also matched by `[data-spacing=...]` rules in
 *    magic-editor.css that use `!important`, so for those two the rendered
 *    padding comes from CSS (scaled by `--page-variant-scale`), not from here.
 *    A numeric value matches no such rule and so renders exactly what it says.
 *  · the 0.62 mobile factor therefore only reaches `none`, `L` and numeric values.
 */
export function spacingPx(raw: string | undefined, fallback: Spacing): number {
  if (raw && /^\d+$/.test(raw)) return Number(raw);
  const key = (raw as Spacing) ?? fallback;
  return SPACING[key] ?? SPACING[fallback];
}

/** Every block is a tappable section: structure (move, duplicate, hide, delete), background and spacing live here. */
export function Block({ block, className, defaultTone, defaultSpacing = 'M', label, children }: BlockProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const id = `block:${block.key}`;
  const p = ed.doc.props[id] ?? {};
  if (block.hidden && ed.mode === 'preview') return null;

  const tone = t.tones.find((x) => x.id === (p.bg ?? defaultTone));
  const spacing = p.spacing as Spacing ?? defaultSpacing;
  const pad = Math.round(spacingPx(p.spacing, defaultSpacing) * (ed.isMobile ? MOBILE_SPACING : 1));

  return (
    <Editable
      id={id}
      kind={block.type === 'hero' ? 'hero' : 'section'}
      label={label ?? blockLabels[block.type]}
      blockKey={block.key}
      as="section"
      data-spacing={spacing}
      className={cx('relative', className, block.hidden && 'opacity-40')}
      style={{ ...(tone ? { ...toneVars(tone), background: tone.color } : {}), paddingTop: pad, paddingBottom: pad }}>
      
      {block.hidden && ed.mode === 'edit' &&
      <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[11px] font-medium text-white">
          <EyeOffIcon className="h-3 w-3" /> Oculto
        </span>
      }
      <DecorationLayer id={id} />
      {children}
    </Editable>);

}
