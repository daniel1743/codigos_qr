// @vitest-environment happy-dom
/**
 * L1 · Rhythm and finish.
 *
 * Section spacing, card/media radii and hero overlay opacity were each locked to
 * a short list of named steps, and the targets use values outside all three: 40/48/56px
 * sections, 14/20px card corners, 4/10/14/16/24/28px images, and 0.40/0.60 veils
 * (the named overlay levels top out at 0.52).
 *
 * Each slot now also accepts a literal. These tests pin BOTH halves: the new
 * literal behaviour, and that every stored named value still resolves to exactly
 * the number it did before.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { spacingPx } from '../components/editor/Block';
import { heroOverlayOpacity } from '../components/blocks/HeroFrame';
import { mediaShapeStyle } from '../utils/styles';
import { EditableCTA, type CtaVariants } from '../components/editor/EditableCTA';
import { ReviewsBlock } from '../components/blocks/ReviewsBlock';
import { createInitialMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mount(state: MagicEditorStateV1, node: React.ReactNode) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider initialTemplate={state.templateId} initialDocument={state}>
        {node}
      </EditorProvider>,
    );
  });
  return { host, root };
}

describe('L1 · section spacing accepts a literal', () => {
  it('reads a bare integer as px, so 40/48/56 are reachable', () => {
    for (const px of [40, 48, 56]) {
      expect(spacingPx(String(px), 'M')).toBe(px);
    }
  });

  it('keeps the four named steps meaning exactly what they meant', () => {
    expect(spacingPx('none', 'M')).toBe(0);
    expect(spacingPx('S', 'M')).toBe(28);
    expect(spacingPx('M', 'M')).toBe(60);
    expect(spacingPx('L', 'M')).toBe(104);
  });

  it('falls back to the block default when the prop is absent or cleared', () => {
    expect(spacingPx(undefined, 'L')).toBe(104);
    expect(spacingPx('', 'S')).toBe(28);
  });
});

describe('L1 · hero overlay opacity accepts a literal', () => {
  it('reads a decimal as a 0–1 opacity, so 0.40 and 0.60 are reachable', () => {
    expect(heroOverlayOpacity('0.4')).toBe(0.4);
    expect(heroOverlayOpacity('0.6')).toBe(0.6);
  });

  it('clamps out-of-range literals instead of trusting them', () => {
    expect(heroOverlayOpacity('1.5')).toBe(1);
    expect(heroOverlayOpacity('-0.2')).toBe(0);
  });

  it('keeps the four named levels at exactly their previous values', () => {
    expect(heroOverlayOpacity('none')).toBe(0);
    expect(heroOverlayOpacity('soft')).toBe(0.16);
    expect(heroOverlayOpacity('medium')).toBe(0.32);
    expect(heroOverlayOpacity('intense')).toBe(0.52);
  });

  it('treats absent or unknown values as no overlay', () => {
    expect(heroOverlayOpacity(undefined)).toBe(0);
    expect(heroOverlayOpacity('')).toBe(0);
    expect(heroOverlayOpacity('nonsense')).toBe(0);
  });
});

describe('L1 · image radius accepts a literal', () => {
  it('reads a bare integer as px, covering every radius the targets use', () => {
    for (const px of [4, 10, 14, 16, 24, 28]) {
      expect(mediaShapeStyle(String(px)).borderRadius).toBe(px);
    }
  });

  it('keeps the six named shapes unchanged', () => {
    expect(mediaShapeStyle('square').borderRadius).toBe(0);
    expect(mediaShapeStyle('rounded').borderRadius).toBe(18);
    expect(mediaShapeStyle('circle').borderRadius).toBe('9999px');
    expect(mediaShapeStyle('oval').borderRadius).toBe('50%');
    expect(mediaShapeStyle('arch').borderRadius).toBe('9999px 9999px 18px 18px');
    expect(mediaShapeStyle('bleed')).toEqual({ borderRadius: 0, margin: 0 });
  });

  it('still leaves the CSS untouched when no shape is set', () => {
    expect(mediaShapeStyle(undefined)).toEqual({});
    expect(mediaShapeStyle('')).toEqual({});
  });
});

describe('L1 · a picked icon reaches the CTA', () => {
  const variants = { solid: {}, outline: {}, soft: {} } as unknown as CtaVariants;

  function renderCta(props: Record<string, string>, leading?: React.ReactNode) {
    const state = createInitialMagicEditorState('bio');
    state.doc.props['cta'] = props;
    return mount(
      state,
      <EditableCTA id="cta" label="Reservar" href="#reservar" variants={variants} leading={leading} />,
    );
  }

  it('draws the chosen icon — the prop IconPicker writes and nothing used to read', () => {
    const { host, root } = renderCta({ icon: 'whatsapp' });
    expect(host.querySelector('a svg')).not.toBeNull();
    act(() => root.unmount());
  });

  it('draws nothing when the icon is explicitly disabled', () => {
    const { host, root } = renderCta({ icon: 'none' });
    expect(host.querySelector('a svg')).toBeNull();
    act(() => root.unmount());
  });

  it('leaves the template glyph alone when no icon is picked', () => {
    const { host, root } = renderCta({}, <span data-probe="template-glyph">G</span>);
    expect(host.querySelector('[data-probe="template-glyph"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('prefers the picked icon over the template glyph', () => {
    const { host, root } = renderCta({ icon: 'whatsapp' }, <span data-probe="template-glyph">G</span>);
    expect(host.querySelector('[data-probe="template-glyph"]')).toBeNull();
    expect(host.querySelector('a svg')).not.toBeNull();
    act(() => root.unmount());
  });
});

describe('L1 · reviews heading and avatars are opt-in', () => {
  function renderReviews(configure: (state: MagicEditorStateV1) => void) {
    const state = createInitialMagicEditorState('business');
    state.doc.blocks = [{ key: 'reviews', type: 'reviews' }];
    configure(state);
    return mount(state, <ReviewsBlock block={{ key: 'reviews', type: 'reviews' }} />);
  }

  it('shows no heading on a page that never had one', () => {
    const { host, root } = renderReviews(() => undefined);
    expect(host.querySelector('h2')).toBeNull();
    act(() => root.unmount());
  });

  it('shows the heading once a title has been written', () => {
    const { host, root } = renderReviews((state) => {
      // `blockPrefix` is empty for a native block (key === type), so the id is
      // `reviews.title`, not `reviews/reviews.title` — that prefix only appears
      // for blocks added from the picker.
      state.doc.texts['reviews.title'] = 'Lo que dicen';
    });
    expect(host.querySelector('h2')?.textContent).toContain('Lo que dicen');
    act(() => root.unmount());
  });

  it('keeps the avatar bubble on by default', () => {
    const { host, root } = renderReviews(() => undefined);
    expect(host.querySelector('article span[aria-hidden="true"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('removes the avatar bubble when switched off', () => {
    const { host, root } = renderReviews((state) => {
      state.doc.props['block:reviews'] = { showAvatars: 'off' };
    });
    expect(host.querySelector('article span[aria-hidden="true"]')).toBeNull();
    act(() => root.unmount());
  });
});
