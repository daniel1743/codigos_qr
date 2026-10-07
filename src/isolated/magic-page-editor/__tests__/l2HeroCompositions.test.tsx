// @vitest-environment happy-dom
/**
 * L2.1 · The new hero compositions.
 *
 * Companion to `l2HeroRegression.test.tsx`, which freezes the original 30. This
 * file covers what every L2.1 branch must do:
 *
 *   · honour `height`, including a literal px value the old variants cannot take;
 *   · redistribute content through `slots` — the whole point of adding them;
 *   · fall back to `children` when a template supplies no slots, never to an
 *     empty box;
 *   · be a complete option: id, label, hint, its own thumbnail, its own geometry.
 *
 * No assertion here hardcodes how many variants exist. The set is enumerated in
 * bridge4Exposure/mediaExposureContract — that list is the contract, and these
 * tests read from it rather than restating a number.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { HeroFrame, heroHeightPx, heroShapeAppliesTo } from '../components/blocks/HeroFrame';
import { heroVariants, HeroVariantThumb } from '../components/editor/controls/HeroVariantPicker';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { detectDocumentKind } from '../../../features/magic-page-editor-production/document-session';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { Device, HeroVariant } from '../types/editor';

/** The compositions added in L2.1. Appending here is the only place to edit. */
const L21_VARIANTS: HeroVariant[] = [
  // lote 1
  'cinematicTall',
  // lote 2
  'photoBand',
  'imageThenText',
  'centeredStack',
  'identityBand',
  'overlayBottom',
  // lote 3
  'masthead',
  'minimalColumn',
  'gridCollage',
  'avatarOverlap',
  'framedPlate',
];

/** The 30 that shipped before L2.1, in their original order. */
const ORIGINAL_30: HeroVariant[] = [
  'simple', 'centered', 'split', 'image', 'arch', 'floating', 'banner', 'mosaic',
  'frame', 'bleed', 'editorialCenter', 'splitHorizontal', 'splitVertical', 'fullBleed',
  'photoCard', 'avatarBand', 'photoGrid', 'quote', 'collage', 'lowerBlock',
  'galleryFrame', 'sideBleed', 'magazine', 'elegantOverlay', 'backgroundFade',
  'minimalPremium', 'sideInfo', 'descriptionCard', 'cinematic', 'brandIdentity',
];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mountHero(
  variant: HeroVariant,
  props: Record<string, string> = {},
  options: { device?: Device; slotsTitle?: React.ReactNode } = {},
) {
  const state = createInitialMagicEditorState('portfolio');
  state.doc.props['hero'] = { variant, ...props };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate="portfolio"
        initialDocument={state}
        initialDevice={options.device ?? 'desktop'}
      >
        <HeroFrame
          id="hero"
          media="/hero.jpg"
          mediaAlt="Hero"
          defaultVariant={variant}
          radius={24}
          slots={options.slotsTitle ? { title: options.slotsTitle } : undefined}
        >
          {() => <span data-probe="children">Contenido por defecto</span>}
        </HeroFrame>
      </EditorProvider>,
    );
  });
  return { host, root };
}

const heroEl = (host: HTMLElement, variant: HeroVariant) =>
  host.querySelector<HTMLElement>(`[data-hero="${variant}"]`);

/**
 * Every inline style inside the rendered hero, concatenated.
 *
 * `height` is deliberately NOT asserted on the root. The two families place it
 * differently and both are right: in a full-bleed composition (`cinematicTall`,
 * `overlayBottom`) the root IS the media, so the height sits on it; in a band
 * composition (`photoBand`, `imageThenText`, `centeredStack`, `identityBand`)
 * the root is a padded column and the height belongs to the media inside it —
 * which is what the target means by `h-[300px]`.
 */
function heroStyles(host: HTMLElement, variant: HeroVariant): string {
  const root = heroEl(host, variant);
  if (!root) return '';
  return [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
    .map((el) => el.getAttribute('style') ?? '')
    .join(' ; ');
}

describe('L2.1 · heroHeightPx keeps the legacy scale and adds a literal', () => {
  it('returns exactly the values the original 8 variants used for S/M/L', () => {
    expect(heroHeightPx('S', 'M', false)).toBe(220);
    expect(heroHeightPx('M', 'M', false)).toBe(320);
    expect(heroHeightPx('L', 'M', false)).toBe(460);
  });

  it('applies the same 0.68 mobile factor the originals used', () => {
    expect(heroHeightPx('S', 'M', true)).toBe(Math.round(220 * 0.68));
    expect(heroHeightPx('M', 'M', true)).toBe(Math.round(320 * 0.68));
    expect(heroHeightPx('L', 'M', true)).toBe(Math.round(460 * 0.68));
  });

  it('reads a bare integer as a literal px height', () => {
    expect(heroHeightPx('560', 'L', false)).toBe(560);
    expect(heroHeightPx('170', 'L', false)).toBe(170);
    expect(heroHeightPx('560', 'L', true)).toBe(Math.round(560 * 0.68));
  });

  it('falls back to the variant default when absent or unrecognised', () => {
    expect(heroHeightPx(undefined, 'L', false)).toBe(460);
    expect(heroHeightPx('', 'M', false)).toBe(320);
    expect(heroHeightPx('garbage', 'S', false)).toBe(220);
  });
});

describe('L2.1 · every new composition is complete', () => {
  it.each(L21_VARIANTS)('%s is in the picker with its own label and hint', (variant) => {
    const entry = heroVariants.find((v) => v.value === variant);
    expect(entry, `${variant} is missing from the picker`).toBeDefined();
    expect(entry!.label.trim().length).toBeGreaterThan(2);
    expect(entry!.hint.trim().length).toBeGreaterThan(8);
  });

  it('gives each one a label and hint no other variant uses', () => {
    for (const variant of L21_VARIANTS) {
      const entry = heroVariants.find((v) => v.value === variant)!;
      const sameLabel = heroVariants.filter((v) => v.label === entry.label);
      const sameHint = heroVariants.filter((v) => v.hint === entry.hint);
      expect(sameLabel.map((v) => v.value), `${variant} reuses a label`).toEqual([variant]);
      expect(sameHint.map((v) => v.value), `${variant} reuses a hint`).toEqual([variant]);
    }
  });

  it.each(L21_VARIANTS)('%s has thumbnail art of its own', (variant) => {
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() => root.render(<HeroVariantThumb variant={variant} />));
    const html = host.innerHTML;
    act(() => root.unmount());
    expect(html.length, `${variant} thumbnail is empty`).toBeGreaterThan(40);

    // Must differ from every other variant's thumbnail.
    for (const other of heroVariants) {
      if (other.value === variant) continue;
      const host2 = document.createElement('div');
      const root2 = createRoot(host2);
      act(() => root2.render(<HeroVariantThumb variant={other.value} />));
      const otherHtml = host2.innerHTML;
      act(() => root2.unmount());
      expect(html, `${variant} shares its thumbnail with ${other.value}`).not.toBe(otherHtml);
    }
  });
});

describe('L2.1 · every new composition renders, on both devices', () => {
  it.each(L21_VARIANTS)('%s renders on desktop and mobile', (variant) => {
    for (const device of ['desktop', 'mobile'] as Device[]) {
      const { host, root } = mountHero(variant, {}, { device });
      const el = heroEl(host, variant);
      expect(el, `${variant} did not mount on ${device}`).not.toBeNull();
      expect(el!.innerHTML.length, `${variant} rendered nothing on ${device}`).toBeGreaterThan(50);
      act(() => root.unmount());
    }
  });

  it.each(L21_VARIANTS)('%s takes a literal height the old variants cannot', (variant) => {
    const { host, root } = mountHero(variant, { height: '560' });
    expect(heroStyles(host, variant)).toContain('height: 560px');
    act(() => root.unmount());
  });

  it.each(L21_VARIANTS)('%s still accepts the named steps', (variant) => {
    const { host, root } = mountHero(variant, { height: 'L' });
    expect(heroStyles(host, variant)).toContain('height: 460px');
    act(() => root.unmount());
  });

  it.each(L21_VARIANTS)('%s scales the literal height on mobile', (variant) => {
    const { host, root } = mountHero(variant, { height: '560' }, { device: 'mobile' });
    expect(heroStyles(host, variant)).toContain(`height: ${Math.round(560 * 0.68)}px`);
    act(() => root.unmount());
  });
});

describe('L2.1 · slots redistribute content, children remains the fallback', () => {
  it.each(L21_VARIANTS)('%s falls back to children when no slots are given', (variant) => {
    const { host, root } = mountHero(variant);
    expect(host.querySelector('[data-probe="children"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it.each(L21_VARIANTS)('%s renders the slotted title instead of children', (variant) => {
    const { host, root } = mountHero(variant, {}, {
      slotsTitle: <span data-probe="slotted-title">Título</span>,
    });
    expect(host.querySelector('[data-probe="slotted-title"]')).not.toBeNull();
    // The fallback must NOT also render, or the hero would show the content twice.
    expect(host.querySelector('[data-probe="children"]')).toBeNull();
    act(() => root.unmount());
  });
});

describe('L2.1 · the contract only grew at the end', () => {
  it('keeps the original 30 in their original positions', () => {
    expect(heroVariants.slice(0, ORIGINAL_30.length).map((v) => v.value)).toEqual(ORIGINAL_30);
  });

  it('appends every new composition after them, without duplicates', () => {
    const values = heroVariants.map((v) => v.value);
    for (const variant of L21_VARIANTS) {
      expect(values.indexOf(variant)).toBeGreaterThanOrEqual(ORIGINAL_30.length);
    }
    expect(new Set(values).size).toBe(values.length);
  });

  it('does not consume bandShape, so the silhouette options report as not applying', () => {
    for (const variant of L21_VARIANTS) {
      for (const shape of ['curve', 'straight', 'inset'] as const) {
        expect(heroShapeAppliesTo(shape, variant)).toBe(false);
      }
      expect(heroShapeAppliesTo('wave', variant)).toBe(true);
    }
  });

  it.each(L21_VARIANTS)('%s survives editor → save → reload', (variant) => {
    const state = createInitialMagicEditorState('portfolio');
    state.doc.blocks = [{ key: 'hero', type: 'hero' }];
    state.doc.props['block:hero'] = { variant, height: '560' };

    const serialized = serializeMagicEditorState(state);
    expect(detectDocumentKind(serialized)).toBe('MAGIC_V1');

    const reloaded = hydrateMagicEditorState(serialized).doc.props['block:hero'];
    expect(reloaded?.['variant']).toBe(variant);
    expect(reloaded?.['height']).toBe('560');
  });

  /**
   * The last leg of the chain, and the one that actually matters to a visitor:
   * the published document going through `MagicPublicRenderer`, which is the
   * component the public routes mount. Serialization agreeing with hydration is
   * not the same claim as the public page rendering.
   */
  it.each(L21_VARIANTS)('%s renders through the PUBLIC renderer', (variant) => {
    // Named `pageDocument`, not `document`: a local called `document` shadows the
    // DOM global and every `document.createElement` in this block stops working.
    const pageDocument = createInitialMagicPageDocument('portfolio');
    pageDocument.blocks = [{ key: 'hero', type: 'hero' }];
    pageDocument.props['block:hero'] = { variant, height: '560' };

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    const rendered = host.querySelector(`[data-hero="${variant}"]`);
    expect(rendered, `the public renderer did not render ${variant}`).not.toBeNull();
    expect(heroStyles(host, variant)).toContain('height: 560px');

    act(() => root.unmount());
    host.remove();
  });
});
