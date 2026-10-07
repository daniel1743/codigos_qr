import type { CSSProperties } from 'react';
import type { SocialFill, SocialShape, SocialSize } from '../components/editor/EditableSocial';

/**
 * Presentation of a social group (L2.4).
 *
 * A social group has always drawn icon bubbles. The target families also use a
 * second, equally legitimate presentation — text pills, one per network — and
 * that is a presentation of the *same* block, not a different block and not a
 * per-template variant.
 *
 * Storage: `block:<blockKey>` → { socialPresentation?: 'icons' | 'pills' }
 *
 * Why this is NOT `rowTreatment`: `cardStyle: 'line'` in the target does switch
 * the pill corners to square, which looks like the same idea — but reading the
 * source, that branch is `cardStyle === 'sharp' || cardStyle === 'line' ? 0 : 999`
 * on `borderRadius`. Two different card styles collapse to the same result, and
 * the property is a corner, not a separation between rows. A pill is a chip, not
 * a row: there is no "surface per row versus rules between rows" decision here.
 * Reusing `rowTreatment` would give one name two meanings, so the corner is
 * expressed instead through the `socialShape` vocabulary that already exists for
 * social corners — `square` → 0, `rounded` → 12, `circle` → a full pill.
 */

export type SocialPresentation = 'icons' | 'pills';

export const SOCIAL_PRESENTATIONS: { value: SocialPresentation; label: string; hint: string }[] = [
  { value: 'icons', label: 'Iconos', hint: 'Una burbuja con el logotipo de cada red.' },
  { value: 'pills', label: 'Píldoras', hint: 'Una etiqueta de texto con el nombre de cada red.' },
];

/** Absent or unrecognised keeps the icon bubbles, which is what every page already draws. */
export function resolveSocialPresentation(raw: string | undefined): SocialPresentation {
  return raw === 'pills' ? 'pills' : 'icons';
}

/** Pill height, horizontal padding and corner radius per existing size/shape step. */
const PILL_HEIGHT: Record<SocialSize, number> = { sm: 34, md: 40, lg: 46 };
const PILL_PAD: Record<SocialSize, number> = { sm: 12, md: 16, lg: 20 };
const PILL_CORNER: Record<SocialShape, number> = { circle: 9999, rounded: 12, square: 0 };

/**
 * Pill style for one network, from the same scope props the icon bubbles read.
 *
 * `socialFill` drives the surface (`filled` = the target's `bg-surface` + border,
 * `outline` = border only, `plain` = bare text) and `socialBubbleColor` /
 * `socialIconColor` keep their meaning — in a pill the label plays the icon's
 * role, so the "icon colour" is simply the text colour.
 */
export function socialPillStyle(props: Record<string, string> = {}): CSSProperties {
  const fill = (props['socialFill'] as SocialFill | undefined) ?? 'filled';
  const shape = (props['socialShape'] as SocialShape | undefined) ?? 'circle';
  const size = (props['socialSize'] as SocialSize | undefined) ?? 'md';
  const bubble = props['socialBubbleColor'];
  const mark = props['socialIconColor'];

  const base: CSSProperties = {
    height: PILL_HEIGHT[size],
    paddingInline: PILL_PAD[size],
    borderRadius: PILL_CORNER[shape] ?? 9999,
    color: mark || 'var(--fg)',
  };

  if (fill === 'plain') return base;
  if (fill === 'outline') {
    return { ...base, border: `1px solid ${bubble || 'var(--line)'}`, background: 'transparent' };
  }
  return {
    ...base,
    border: `1px solid ${bubble || 'var(--line)'}`,
    background: bubble || 'var(--surface)',
  };
}
