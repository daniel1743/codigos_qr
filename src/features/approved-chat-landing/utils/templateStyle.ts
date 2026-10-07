import type { CSSProperties } from 'react';
import type { TemplateFamily } from '../types/cripqer';

export function headingStyle(t: TemplateFamily, extra?: CSSProperties): CSSProperties {
  const tracking =
  t.font.tracking === 'wide' ? '0.08em' : t.font.tracking === 'tight' ? '-0.035em' : undefined;
  return {
    fontFamily: t.font.heading,
    fontWeight: t.font.headingWeight,
    textTransform: t.font.uppercase ? 'uppercase' : undefined,
    letterSpacing: tracking,
    ...extra
  };
}

export function cardRadius(t: TemplateFamily): number {
  switch (t.cardStyle) {
    case 'soft':
      return 20;
    case 'flat':
      return 14;
    default:
      return 0;
  }
}

export function themeVars(t: TemplateFamily): CSSProperties {
  const p = t.palette;
  return {
    ['--t-bg' as string]: p.bg,
    ['--t-surface' as string]: p.surface,
    ['--t-text' as string]: p.text,
    ['--t-muted' as string]: p.muted,
    ['--t-accent' as string]: p.accent,
    ['--t-accent-text' as string]: p.accentText,
    ['--t-border' as string]: p.border,
    background: p.bg,
    color: p.text,
    fontFamily: t.font.body
  };
}