import type { CSSProperties } from 'react';
import {
  heroFusionOverlayStyle,
  heroFusionStyle,
  mediaImageStyle,
  mediaOverlayStyle,
  safeMediaTreatment,
} from '../../../premium-template-studio/engine/mediaTreatment';
import type { HeroFusionMode, MediaTreatment } from '../../../premium-template-studio/types';
import type { BlockRef, SurfaceTone, TextStyle, TextTracking, TextWeight } from '../types/editor';

export interface TextStyleCssOptions {
  /**
   * Active "Unificar color de texto" value for CONTENT text. When present, a
   * persisted per-element colour yields to it, so unification reaches ordinary
   * content even when the element carries an individual colour. Resolved in JS
   * (a literal colour) instead of a CSS `var()` so the contract is identical in
   * every engine and easy to assert.
   */
  unifyFg?: string;
  /**
   * `false` marks a deliberately independent scope (a card that ships its own
   * palette / surface): its persisted colours are never overridden by the
   * unification. The map base, branding and functional chips do not use this
   * helper at all and keep their own colours.
   */
  unifyEligible?: boolean;
}

/**
 * `goldText` ("Acento local / dorado") is an EXPLICIT semantic exception, not an
 * invisible one: the element always keeps the brand accent
 * (`var(--accent, #B8935A)`) and that precedence is documented and surfaced in
 * the UI (`TypographyTreatmentPicker`). Everything else follows "Unificar color".
 */
/** 300–800. Named weights win over the legacy `bold` flag, preserving the old precedence. */
const WEIGHT_STEPS: Record<TextWeight, number> = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};

function fontWeightOf(ts: TextStyle): number | undefined {
  if (ts.weight) return WEIGHT_STEPS[ts.weight];
  if (ts.bold === true) return 700;
  if (ts.bold === false) return 400;
  return undefined;
}

/**
 * A number is read as em, so the arbitrary values the Magic Patterns targets use
 * (0.08em … 0.3em) become expressible without changing what `tight`/`wide` mean
 * for documents that already store them.
 */
function letterSpacingOf(tracking: TextTracking | undefined): string | undefined {
  if (typeof tracking === 'number') return `${tracking}em`;
  if (tracking === 'tight') return '-0.02em';
  if (tracking === 'wide') return '0.14em';
  return undefined;
}

export function textStyleToCss(ts?: TextStyle, options: TextStyleCssOptions = {}): CSSProperties {
  if (!ts) return {};
  const unifyEligible = options.unifyEligible ?? true;
  const unifyFg = options.unifyFg?.trim();
  const color = ts.goldText
    ? 'var(--accent, #B8935A)'
    : unifyFg && unifyEligible && ts.color
      ? unifyFg
      : ts.color;
  const declared: CSSProperties = {
    fontSize: ts.size,
    fontWeight: fontWeightOf(ts),
    textAlign: ts.align,
    textTransform: ts.upper ? 'uppercase' : undefined,
    letterSpacing: letterSpacingOf(ts.tracking),
    lineHeight: ts.lineHeight,
    fontStyle: ts.italic ? 'italic' : undefined,
    fontFamily: ts.typeStyle === 'editorial' ? "'Cormorant Garamond', serif" : ts.typeStyle === 'luxury' ? "'Bodoni Moda', serif" : ts.typeStyle === 'script' ? "'Caveat', cursive" : ts.typeStyle === 'mixed' ? "'Marcellus', serif" : undefined,
    color
  };
  // Undefined keys must not be forwarded: spreading `{textAlign: undefined}` over a
  // caller style would silently erase group typography (weight/tracking/font).
  return Object.fromEntries(
    Object.entries(declared).filter(([, value]) => value !== undefined)
  ) as CSSProperties;
}

/**
 * Maps a surface tone to the `--fg` / `--muted` / `--surface` / `--line` CSS
 * variables.
 *
 * `--fg` and `--muted` fall back to the tone's own colours, but a page-level
 * "Unificar color de texto" override (`--unify-fg` / `--unify-muted`, set once
 * on the page root) always wins — even inside nested tone scopes such as blocks,
 * cards, sections and the footer. That is what makes the unification reach
 * *every* text instead of only the nodes that inherit the page variables
 * directly, and it keeps working for class-based and inline `var(--fg)` usage
 * alike because the variable itself is what gets rewritten.
 */
export function toneVars(tone: SurfaceTone): CSSProperties {
  return {
    '--fg': `var(--unify-fg, ${tone.fg})`,
    '--muted': `var(--unify-muted, ${tone.muted})`,
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

/* ------------------------------------------------------------------ */
/* Media treatment (L3) + hero fusion (L0) adapters                    */
/*                                                                     */
/* The Magic document stores element props as strings. These helpers    */
/* are the single render-time adapter into the media engine that is     */
/* already implemented in the canonical premium engine, so hero/avatar/ */
/* card imagery reuses that behaviour instead of a parallel renderer.   */
/* ------------------------------------------------------------------ */

function numericProp(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function overlayProp(raw: string | undefined): MediaTreatment['overlay'] | undefined {
  return raw === 'none' || raw === 'soft' || raw === 'medium' || raw === 'intense' ? raw : undefined;
}

/** String props → canonical media treatment. Unknown/absent values keep the canonical defaults. */
export function mediaTreatmentFromProps(props?: Record<string, string>): Required<MediaTreatment> {
  const p = props ?? {};
  const cropX = numericProp(p['cropX']);
  const cropY = numericProp(p['cropY']);
  const zoom = numericProp(p['zoom']);
  const overlay = overlayProp(p['overlay']);
  const overlayColor = p['overlayColor'];
  return safeMediaTreatment({
    ...(cropX === undefined ? {} : { cropX }),
    ...(cropY === undefined ? {} : { cropY }),
    ...(zoom === undefined ? {} : { zoom }),
    ...(overlay === undefined ? {} : { overlay }),
    ...(overlayColor === undefined ? {} : { overlayColor }),
  });
}

export type MediaOverlay = NonNullable<MediaTreatment['overlay']>;

/** Overlay level currently stored in the props bag (defaults to "none"). */
export function mediaOverlayFromProps(props?: Record<string, string>): MediaOverlay {
  return mediaTreatmentFromProps(props).overlay;
}

/**
 * Photo style: fit + focus point + zoom, reusing the canonical media engine.
 *
 * `fit` belongs to the image contract ("Rellenar" / "Encajar"), so the stored
 * prop is forwarded instead of being hardcoded to `cover`; otherwise the
 * «Ajuste» control would be a dead option.
 */
export function mediaPhotoStyle(
  props: Record<string, string> | undefined,
  fallbackPosition = 'center'
): CSSProperties {
  const p = props ?? {};
  return mediaImageStyle(mediaTreatmentFromProps(p), p['fit'], p['pos'] ?? fallbackPosition);
}

export type MediaShape = 'square' | 'rounded' | 'circle' | 'oval' | 'arch' | 'bleed';

/**
 * Literal px height for a media element, from the `mediaHeight` slot (L2.2).
 *
 * Returns `{}` when the slot is absent or not a bare integer, so a page that
 * never sets it keeps its class-driven aspect ratio exactly as before — which is
 * what makes this additive rather than a re-layout of published pages.
 *
 * When set, `aspectRatio: 'auto'` is part of the answer: the elements this
 * applies to carry a Tailwind `aspect-*` utility, and without neutralising it the
 * two declarations fight over the box and the winner depends on stylesheet order.
 */
export function mediaHeightStyle(props?: Record<string, string>): CSSProperties {
  const raw = props?.['mediaHeight'];
  if (!raw || !/^\d+$/.test(raw)) return {};
  return { height: Number(raw), aspectRatio: 'auto' };
}

/**
 * Optional media shape treatment. Undefined intentionally preserves legacy CSS.
 *
 * A bare integer is a literal px radius, so the targets' 4/10/14/16/24/28px
 * images become reachable — none of the six named shapes could express them.
 */
export function mediaShapeStyle(shape?: string): CSSProperties {
  if (!shape) return {};
  if (/^\d+$/.test(shape)) return { borderRadius: Number(shape) };
  const value = shape as MediaShape;
  if (value === 'square') return { borderRadius: 0 };
  if (value === 'rounded') return { borderRadius: 18 };
  if (value === 'circle') return { borderRadius: '9999px' };
  if (value === 'oval') return { borderRadius: '50%' };
  if (value === 'arch') return { borderRadius: '9999px 9999px 18px 18px' };
  if (value === 'bleed') return { borderRadius: 0, margin: 0 };
  return {};
}

/**
 * Overlay node style for a photo. `zIndex` is intentionally dropped: the node
 * is rendered in DOM order right after the photo and before any content.
 */
export function mediaOverlayStyleFromProps(
  props?: Record<string, string>
): CSSProperties | undefined {
  const style = mediaOverlayStyle(mediaTreatmentFromProps(props));
  if (!style) return undefined;
  const { zIndex: _zIndex, ...rest } = style;
  return rest;
}

export function heroFusionFromProps(props?: Record<string, string>): HeroFusionMode {
  const raw = (props ?? {})['fusion'];
  return raw === 'fade' || raw === 'halo' || raw === 'organic' || raw === 'dominant' ? raw : 'none';
}

/** Hero fusion container treatment (halo / organic / dominant). */
export function heroFusionStyleFromProps(
  props: Record<string, string> | undefined,
  accent: string
): CSSProperties {
  return heroFusionStyle(heroFusionFromProps(props), accent) ?? {};
}

/** Hero fusion fade node (rendered inside the hero media, in DOM order). */
export function heroFusionOverlayStyleFromProps(
  props: Record<string, string> | undefined,
  accent: string
): CSSProperties | undefined {
  const style = heroFusionOverlayStyle(heroFusionFromProps(props), accent);
  if (!style) return undefined;
  const { zIndex: _zIndex, ...rest } = style;
  return rest;
}
