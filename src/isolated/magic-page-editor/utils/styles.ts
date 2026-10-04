import type { CSSProperties } from 'react';
import {
  heroFusionOverlayStyle,
  heroFusionStyle,
  mediaImageStyle,
  mediaOverlayStyle,
  safeMediaTreatment,
} from '../../../premium-template-studio/engine/mediaTreatment';
import type { HeroFusionMode, MediaTreatment } from '../../../premium-template-studio/types';
import type { BlockRef, SurfaceTone, TextStyle } from '../types/editor';

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
    fontWeight: ts.weight === 'medium' ? 500 : ts.weight === 'bold' || ts.bold ? 700 : ts.bold === false || ts.weight === 'regular' ? 400 : undefined,
    textAlign: ts.align,
    textTransform: ts.upper ? 'uppercase' : undefined,
    letterSpacing: ts.tracking === 'tight' ? '-0.02em' : ts.tracking === 'wide' ? '0.14em' : undefined,
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

/** Optional media shape treatment. Undefined intentionally preserves legacy CSS. */
export function mediaShapeStyle(shape?: string): CSSProperties {
  if (!shape) return {};
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
