// @vitest-environment happy-dom
/**
 * L2.4 · Social as text pills, and the optional layers on image cards.
 *
 * The three families the audit flagged (dark_craft, personal_brand,
 * bold_creative for social; dark_craft, product_spotlight, bold_creative for
 * image cards) are served here by generic capabilities, never by a prop that
 * names a template.
 *
 * `socialPresentation` is a presentation of the social group — the same block,
 * the same elements, the same ids and links — so every existing control keeps
 * working in both modes. `resolveSocialPresentation` returns `icons` for
 * anything it does not recognise, which is the whole backward-compatibility
 * argument: a document written before this phase cannot change appearance.
 *
 * Note what is deliberately NOT here: `rowTreatment`. The target switches pill
 * corners on `cardStyle === 'sharp' || cardStyle === 'line'` — two card styles,
 * one result, applied to a corner radius. That is a shape decision, not the
 * "surface per row versus rules between rows" meaning `rowTreatment` carries, so
 * folding it in would give one name two meanings. The corner rides on the
 * `socialShape` vocabulary that already existed for social corners.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { ImageCardsBlock } from '../components/blocks/ImageCardsBlock';
import {
  SOCIAL_PRESENTATIONS,
  resolveSocialPresentation,
  socialPillStyle,
} from '../utils/socialOps';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';
import type { BlockRef, PageDoc } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mount(state: MagicEditorStateV1, node?: React.ReactNode) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider initialTemplate={state.templateId} initialDocument={state}>
        <TemplateRenderer showLandingBotPreview={false} />
        {node}
      </EditorProvider>,
    );
  });
  return { host, root };
}

/** The generic social block, through the real renderer. */
function renderSocial(blockProps: Record<string, string> = {}) {
  const state = createInitialMagicEditorState('business');
  state.doc.blocks = [{ key: 'social', type: 'social' }];
  if (Object.keys(blockProps).length) state.doc.props['block:social'] = blockProps;
  return mount(state);
}

const CARDS_BLOCK: BlockRef = { key: 'imageCards', type: 'imageCards' };

/**
 * The overlay, the height and every other media prop of an image card live on
 * the CARD (`imageCards/item.<slot>`), not on the block — the card *is* the
 * media element. Writing them at block scope would test a bag nothing reads.
 */
function renderCards(cardProps: Record<string, string> = {}, texts: Record<string, string> = {}) {
  const state = createInitialMagicEditorState('business');
  if (Object.keys(cardProps).length) state.doc.props['imageCards/item.0'] = cardProps;
  state.doc.texts = { ...state.doc.texts, ...texts };
  return mount(state, <ImageCardsBlock block={CARDS_BLOCK} maxWidth={720} />);
}

/**
 * The template draws its own social rows (`hero.social.0`, `footer.social.0`),
 * and those are scoped to the hero and the footer — not to `block:social`. So
 * every social assertion is scoped to the generic block's own ids, which is
 * also the proof that the presentation prop does not leak into the template's
 * built-in rows.
 */
const genericSocialsIn = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLElement>('[data-editor-id^="social."]'));

const cardIn = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[data-editor-id="imageCards/item.0"]');

describe('L2.4 · the social presentation vocabulary', () => {
  it('keeps icons for anything unrecognised', () => {
    expect(resolveSocialPresentation(undefined)).toBe('icons');
    expect(resolveSocialPresentation('')).toBe('icons');
    expect(resolveSocialPresentation('nonsense')).toBe('icons');
    expect(resolveSocialPresentation('icons')).toBe('icons');
  });

  it('recognises pills', () => {
    expect(resolveSocialPresentation('pills')).toBe('pills');
  });

  it('offers exactly the two presentations the picker shows', () => {
    expect(SOCIAL_PRESENTATIONS.map((o) => o.value)).toEqual(['icons', 'pills']);
    for (const option of SOCIAL_PRESENTATIONS) {
      expect(option.label.trim().length).toBeGreaterThan(2);
      expect(option.hint.trim().length).toBeGreaterThan(10);
    }
  });
});

describe('L2.4 · the pill reuses the existing social vocabulary', () => {
  it('draws the target pill at its defaults', () => {
    const s = socialPillStyle({});
    // The reference: h-10 px-4, bg-surface, 1px border, full pill.
    expect(s.height).toBe(40);
    expect(s.paddingInline).toBe(16);
    expect(s.borderRadius).toBe(9999);
    expect(s.background).toBe('var(--surface)');
    expect(String(s.border)).toContain('1px solid');
  });

  it('takes its corner from socialShape, not from a new prop', () => {
    expect(socialPillStyle({ socialShape: 'square' }).borderRadius).toBe(0);
    expect(socialPillStyle({ socialShape: 'rounded' }).borderRadius).toBe(12);
    expect(socialPillStyle({ socialShape: 'circle' }).borderRadius).toBe(9999);
  });

  it('takes its surface from socialFill, not from a new prop', () => {
    expect(socialPillStyle({ socialFill: 'outline' }).background).toBe('transparent');
    const plain = socialPillStyle({ socialFill: 'plain' });
    expect(plain.background).toBeUndefined();
    expect(plain.border).toBeUndefined();
  });

  it('scales with the existing size step', () => {
    expect(socialPillStyle({ socialSize: 'sm' }).height).toBe(34);
    expect(socialPillStyle({ socialSize: 'lg' }).height).toBe(46);
  });

  it('keeps the colour slots meaningful', () => {
    const s = socialPillStyle({ socialBubbleColor: '#101010', socialIconColor: '#FEFEFE' });
    expect(s.background).toBe('#101010');
    expect(s.color).toBe('#FEFEFE');
  });
});

describe('L2.4 · pills render as text, and only when asked', () => {
  it('still draws icon bubbles by default', () => {
    const { host, root } = renderSocial();
    const items = genericSocialsIn(host);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((el) => el.dataset['presentation'] === 'icons')).toBe(true);
    act(() => root.unmount());
  });

  it('draws text pills when the document says so', () => {
    const { host, root } = renderSocial({ socialPresentation: 'pills' });
    const items = genericSocialsIn(host);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((el) => el.dataset['presentation'] === 'pills')).toBe(true);
    // The label IS the content — that is the whole difference from a bubble.
    expect(host.textContent).toContain('Instagram');
    act(() => root.unmount());
  });

  it('leaves the template’s own social rows alone', () => {
    // The prop is scoped to the block. The hero and footer rows keep their icons.
    const { host, root } = renderSocial({ socialPresentation: 'pills' });
    const scoped = Array.from(
      host.querySelectorAll<HTMLElement>('[data-editor-id^="hero.social."], [data-editor-id^="footer.social."]')
    );
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every((el) => el.dataset['presentation'] === 'icons')).toBe(true);
    act(() => root.unmount());
  });

  it('draws no icon glyph inside a pill', () => {
    const { host, root } = renderSocial({ socialPresentation: 'pills' });
    const items = genericSocialsIn(host);
    expect(items.flatMap((el) => Array.from(el.querySelectorAll('svg')))).toHaveLength(0);
    act(() => root.unmount());
  });

  it('keeps each pill a real link with its own label', () => {
    const { host, root } = renderSocial({ socialPresentation: 'pills' });
    const pill = genericSocialsIn(host)[0] as HTMLAnchorElement;
    expect(pill.tagName).toBe('A');
    expect(pill.getAttribute('aria-label')).toBeTruthy();
    act(() => root.unmount());
  });
});

describe('L2.4 · image cards: overlay, caption and icon are opt-in layers', () => {
  it('renders no overlay by default', () => {
    const { host, root } = renderCards();
    expect(cardIn(host)?.querySelector('[data-media-overlay]')).toBeNull();
    act(() => root.unmount());
  });

  it('draws the overlay through the shared media adapter', () => {
    const { host, root } = renderCards({ overlay: 'medium' });
    const overlay = cardIn(host)?.querySelector<HTMLElement>('[data-media-overlay]');
    expect(overlay).not.toBeNull();
    // `medium` is the media engine's 30% — the target's own bg-black/30.
    expect(overlay?.style.opacity).toBe('0.3');
    act(() => root.unmount());
  });

  it('honours a custom overlay colour', () => {
    const { host, root } = renderCards({ overlay: 'soft', overlayColor: 'rgb(10, 20, 30)' });
    expect(
      cardIn(host)?.querySelector<HTMLElement>('[data-media-overlay]')?.style.backgroundColor
    ).toBe('rgb(10, 20, 30)');
    act(() => root.unmount());
  });

  it('shows no caption until one is written', () => {
    const { host, root } = renderCards();
    expect(cardIn(host)?.textContent ?? '').not.toContain('Reforma integral');
    act(() => root.unmount());
  });

  it('shows the caption over the image once written', () => {
    const { host, root } = renderCards({}, { 'imageCards/item.0.title': 'Reforma integral' });
    expect(cardIn(host)?.textContent).toContain('Reforma integral');
    act(() => root.unmount());
  });

  it('is off by default and on when switched on', () => {
    const glyphsIn = (h: HTMLElement) => cardIn(h)?.querySelectorAll('svg') ?? [];

    const off = renderCards({}, { 'imageCards/item.0.title': 'Reforma' });
    expect(glyphsIn(off.host)).toHaveLength(0);
    act(() => off.root.unmount());

    const on = renderCards({ captionIcon: 'on' }, { 'imageCards/item.0.title': 'Reforma' });
    expect(glyphsIn(on.host).length).toBeGreaterThan(0);
    act(() => on.root.unmount());
  });

  it('draws the icon even with no caption, because they are separate capabilities', () => {
    const { host, root } = renderCards({ captionIcon: 'on' });
    expect(cardIn(host)?.querySelectorAll('svg').length).toBeGreaterThan(0);
    act(() => root.unmount());
  });
});

describe('L2.4 · both capabilities persist and reach the public page', () => {
  it('round-trips the social presentation and the card layers', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.blocks = [
      { key: 'social', type: 'social' },
      { key: 'imageCards', type: 'imageCards' },
    ];
    state.doc.props['block:social'] = { socialPresentation: 'pills', socialShape: 'square' };
    state.doc.props['imageCards/item.0'] = { overlay: 'medium', captionIcon: 'on' };
    state.doc.texts['imageCards/item.0.title'] = 'Reforma integral';

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.props['block:social']?.['socialPresentation']).toBe('pills');
    expect(reloaded.doc.props['imageCards/item.0']?.['overlay']).toBe('medium');
    expect(reloaded.doc.props['imageCards/item.0']?.['captionIcon']).toBe('on');
    expect(reloaded.doc.texts['imageCards/item.0.title']).toBe('Reforma integral');
  });

  it('renders pills and card layers on the public page', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.blocks = [
      { key: 'social', type: 'social' },
      { key: 'imageCards', type: 'imageCards' },
    ];
    pageDocument.props['block:social'] = { socialPresentation: 'pills' };
    pageDocument.props['imageCards/item.0'] = { overlay: 'medium', captionIcon: 'on' };
    pageDocument.texts['imageCards/item.0.title'] = 'Reforma integral';

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.querySelectorAll('[data-presentation="pills"]').length).toBeGreaterThan(0);
    expect(host.querySelector('[data-media-overlay]')).not.toBeNull();
    expect(host.textContent).toContain('Reforma integral');
    act(() => root.unmount());
    host.remove();
  });

  it('leaves a pre-L2.4 document byte-identical in appearance', () => {
    // Nothing set: icons, no scrim, no caption, no icon glyph.
    const doc: PageDoc = {
      ...createInitialMagicEditorState('business').doc,
      blocks: [
        { key: 'social', type: 'social' },
        { key: 'imageCards', type: 'imageCards' },
      ],
    };
    const state: MagicEditorStateV1 = {
      ...createInitialMagicEditorState('business'),
      doc,
    };
    const { host, root } = mount(state);
    expect(genericSocialsIn(host).every((el) => el.dataset['presentation'] === 'icons')).toBe(true);
    expect(cardIn(host)?.querySelector('[data-media-overlay]')).toBeNull();
    expect(cardIn(host)?.querySelectorAll('svg')).toHaveLength(0);
    act(() => root.unmount());
  });
});
