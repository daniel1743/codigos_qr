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