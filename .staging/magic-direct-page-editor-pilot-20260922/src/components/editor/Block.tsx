import React from 'react';
import { EyeOffIcon } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { Editable } from './Editable';
import { blockLabels } from '../../data/blockKit';
import { cx } from '../../utils/cx';
import { toneVars } from '../../utils/styles';
import type { BlockRef } from '../../types/editor';

export type Spacing = 'none' | 'S' | 'M' | 'L';

interface BlockProps {
  block: BlockRef;
  className?: string;
  defaultTone?: string;
  defaultSpacing?: Spacing;
  children: React.ReactNode;
}

const SPACING: Record<Spacing, number> = { none: 0, S: 28, M: 60, L: 104 };

/** Every block is a tappable section: structure (move, duplicate, hide, delete), background and spacing live here. */
export function Block({ block, className, defaultTone, defaultSpacing = 'M', children }: BlockProps) {
  const ed = useEditor();
  const t = useThemeTokens();
  const id = `block:${block.key}`;
  const p = ed.doc.props[id] ?? {};
  if (block.hidden && ed.mode === 'preview') return null;

  const tone = t.tones.find((x) => x.id === (p.bg ?? defaultTone));
  const spacing = p.spacing as Spacing ?? defaultSpacing;
  const pad = Math.round(SPACING[spacing] * (ed.isMobile ? 0.62 : 1));

  return (
    <Editable
      id={id}
      kind={block.type === 'hero' ? 'hero' : 'section'}
      label={blockLabels[block.type]}
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
      {children}
    </Editable>);

}