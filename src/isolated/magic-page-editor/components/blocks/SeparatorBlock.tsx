import React from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { cx } from '../../utils/cx';
import { Block } from '../editor/Block';
import type { BlockRef } from '../../types/editor';
import type { SeparatorStyle } from '../editor/controls/SeparatorStylePicker';

export type SeparatorThickness = 'hairline' | 'medium' | 'strong';
const SPACING: Record<string, number> = { sm: 16, md: 28, lg: 44, xl: 64 };
const WIDTHS = new Set(['25%', '40%', '60%', '80%', '100%']);

export function resolveSeparatorStyle(props: Record<string, string>): SeparatorStyle {
  const stored = props['separatorStyle'];
  if (['minimal', 'editorial', 'luxury', 'double', 'dot-center', 'fade', 'organic', 'spacing-only'].includes(stored ?? '')) return stored as SeparatorStyle;
  if (props['lineStyle'] === 'none') return 'spacing-only';
  return 'minimal';
}

function thicknessValue(value: string | undefined): string {
  if (value === '2px' || value === 'medium') return '2px';
  if (value === '3px' || value === 'strong') return '3px';
  return '1px';
}

function SeparatorVisual({ style, color, thickness, width, alignment }: { style: SeparatorStyle; color: string; thickness: string; width: string; alignment: string }) {
  if (style === 'spacing-only') return null;
  const justify = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  const lineStyle: React.CSSProperties = { width, borderColor: color, borderTopWidth: thickness };
  if (style === 'fade') lineStyle.maskImage = 'linear-gradient(to right, transparent, black 25%, black 75%, transparent)';
  if (style === 'organic') lineStyle.borderRadius = '50%';
  if (style === 'double') return <div className={cx('flex w-full', justify)}><div className="space-y-1" style={{ width }}><div className="border-t" style={lineStyle} /><div className="border-t" style={lineStyle} /></div></div>;
  if (style === 'luxury' || style === 'dot-center') return <div className={cx('relative flex h-5 w-full items-center', justify)}><div className="relative" style={{ width }}><div className="border-t" style={lineStyle} />{style === 'luxury' ? <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 border" style={{ borderColor: color, background: 'var(--surface, white)' }} /> : <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: color, boxShadow: '0 0 0 3px var(--surface, white)' }} />}</div></div>;
  return <div className={cx('flex w-full', justify)}><div className="border-t" style={lineStyle} /></div>;
}

interface SeparatorBlockProps {
  block: BlockRef;
  mobile?: boolean;
}

export function SeparatorBlock({ block, mobile = false }: SeparatorBlockProps) {
  const { doc, mode } = useEditor();
  const p = doc.props[`block:${block.key}`] ?? {};

  const style = resolveSeparatorStyle(p);
  const spacing = SPACING[p['separatorSpacing'] ?? p['spacing'] ?? 'md'] ?? SPACING.md;
  const width = WIDTHS.has(p['width'] ?? '') ? p['width']! : '60%';
  const alignment = ['left', 'center', 'right'].includes(p['alignment'] ?? '') ? p['alignment']! : 'center';
  const color = p['color'] && p['color'] !== 'automatic' ? p['color'] : 'var(--line, var(--fg-dim, rgba(0,0,0,0.18)))';
  const thickness = thicknessValue(p['thickness']);

  return (
    <Block block={block} defaultSpacing="none" className="flex items-center" label={style === 'spacing-only' ? 'Espacio' : 'Separador'}>
      <div className={cx('relative flex min-h-6 w-full items-center', mobile && 'max-w-full')} style={{ paddingTop: Math.round(spacing * (mobile ? 0.62 : 1)), paddingBottom: Math.round(spacing * (mobile ? 0.62 : 1)) }}>
        <SeparatorVisual style={style} color={color} thickness={thickness} width={width} alignment={alignment} />
        {mode === 'edit' && <div className="pointer-events-none absolute inset-0 rounded border border-transparent transition-colors hover:border-black/10" />}
      </div>
    </Block>
  );
}
