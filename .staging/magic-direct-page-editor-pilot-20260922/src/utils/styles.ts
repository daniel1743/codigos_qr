import type { CSSProperties } from 'react';
import type { BlockRef, SurfaceTone, TextStyle } from '../types/editor';

export function textStyleToCss(ts?: TextStyle): CSSProperties {
  if (!ts) return {};
  return {
    fontSize: ts.size,
    fontWeight: ts.bold === undefined ? undefined : ts.bold ? 700 : 400,
    color: ts.color,
    textAlign: ts.align,
    textTransform: ts.upper ? 'uppercase' : undefined,
    letterSpacing: ts.tracking === 'wide' ? '0.14em' : undefined
  };
}

export function toneVars(tone: SurfaceTone): CSSProperties {
  return {
    '--fg': tone.fg,
    '--muted': tone.muted,
    '--surface': tone.surface,
    '--line': tone.line
  } as CSSProperties;
}

/** Ids of native blocks stay short ("hero.title"); duplicated or added blocks get a unique prefix. */
export function blockPrefix(block: BlockRef): string {
  return block.key === block.type ? '' : `${block.key}/`;
}

export function keepFocus(e: {target: EventTarget;preventDefault: () => void;}): void {
  const target = e.target as HTMLElement;
  if (!target.closest('input, textarea, select, [contenteditable="true"]')) e.preventDefault();
}