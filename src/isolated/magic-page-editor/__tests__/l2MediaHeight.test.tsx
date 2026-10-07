// @vitest-environment happy-dom
/**
 * L2.2 · Authorable media height.
 *
 * Every media element was locked to a class-driven aspect ratio, and the Magic
 * Patterns targets put literal heights on them: cards at 200px, gallery rows at
 * 170px, framed plates at 220px. This adds ONE reusable prop — `mediaHeight`, a
 * bare integer of px — read by whichever renderer owns the media.
 *
 * The whole capability is additive by construction: absent or malformed, the
 * helper returns `{}` and the element keeps exactly the classes it had. These
 * tests pin both halves, plus the reason `aspectRatio: 'auto'` is part of the
 * answer (the element also carries a Tailwind `aspect-*` class).
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { mediaHeightStyle } from '../utils/styles';
import { ImageCardsBlock } from '../components/blocks/ImageCardsBlock';
import { GalleryGrid } from '../components/blocks/GalleryGrid';
import { GenericBlock } from '../components/blocks/GenericBlock';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { CtaVariants } from '../components/editor/EditableCTA';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';
import type { BlockRef } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const VARIANTS = { solid: {}, outline: {}, soft: {} } as unknown as CtaVariants;

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

/** Every inline style in the subtree, concatenated. */
const stylesIn = (host: HTMLElement) =>
  [host, ...Array.from(host.querySelectorAll<HTMLElement>('*'))]
    .map((el) => el.getAttribute('style') ?? '')
    .join(' ; ');

describe('L2.2 · mediaHeightStyle is inert unless set to a bare integer', () => {
  it('returns nothing when absent', () => {
    expect(mediaHeightStyle(undefined)).toEqual({});
    expect(mediaHeightStyle({})).toEqual({});
  });

  it('returns nothing for a value that is not a bare integer', () => {
    for (const bad of ['', 'auto', '200px', '2 0 0', '-40', '12.5']) {
      expect(mediaHeightStyle({ mediaHeight: bad }), bad).toEqual({});
    }
  });

  it('returns the literal height with the aspect ratio neutralised', () => {
    // Both keys matter: the target elements carry a Tailwind `aspect-*` class,
    // and without `auto` the class and the height fight over the box.
    expect(mediaHeightStyle({ mediaHeight: '200' })).toEqual({
      height: 200,
      aspectRatio: 'auto',
    });
  });
});

describe('L2.2 · image cards', () => {
  const block: BlockRef = { key: 'imageCards', type: 'imageCards' };

  function renderCard(mediaHeight?: string) {
    const state = createInitialMagicEditorState('business');
    state.doc.props['block:imageCards'] = { items: '0' };
    state.doc.props['imageCards/item.0'] = {
      src: '/a.jpg',
      ...(mediaHeight ? { mediaHeight } : {}),
    };
    return mount(state, <ImageCardsBlock block={block} maxWidth={720} />);
  }

  it('keeps the square ratio when nothing is set', () => {
    const { host, root } = renderCard();
    expect(host.querySelector('.aspect-square')).not.toBeNull();
    expect(stylesIn(host)).not.toContain('aspect-ratio: auto');
    act(() => root.unmount());
  });

  it('applies a literal height when set, and only then', () => {
    const { host, root } = renderCard('200');
    expect(stylesIn(host)).toContain('height: 200px');
    expect(stylesIn(host)).toContain('aspect-ratio: auto');
    act(() => root.unmount());
  });
});

describe('L2.2 · gallery photos', () => {
  function renderGallery(mediaHeightOn?: number) {
    const state = createInitialMagicEditorState('business');
    if (mediaHeightOn !== undefined) {
      state.doc.props[`gallery.${mediaHeightOn}`] = { mediaHeight: '170' };
    }
    return mount(
      state,
      <GalleryGrid
        id="gallery"
        items={['/a.jpg', '/b.jpg', '/c.jpg']}
        defaultLayout="fila"
        radius={12}
        altPrefix="Foto"
      />,
    );
  }

  it('keeps the layout ratio when no photo sets a height', () => {
    const { host, root } = renderGallery();
    expect(stylesIn(host)).not.toContain('aspect-ratio: auto');
    expect(host.querySelectorAll('.aspect-\\[3\\/4\\]').length).toBe(3);
    act(() => root.unmount());
  });

  it('applies the height to that photo only', () => {
    const { host, root } = renderGallery(1);
    const styles = stylesIn(host);
    // Exactly one element carries the override, not the whole row.
    expect(styles.split('height: 170px').length - 1).toBe(1);
    act(() => root.unmount());
  });

  it('works for every layout, since they share one insertion point', () => {
    for (const layout of ['fila', 'mosaico', 'carrusel', 'masonry', 'stacked'] as const) {
      const state = createInitialMagicEditorState('business');
      state.doc.props['gallery'] = { layout };
      state.doc.props['gallery.0'] = { mediaHeight: '150' };
      const { host, root } = mount(
        state,
        <GalleryGrid id="gallery" items={['/a.jpg', '/b.jpg']} defaultLayout={layout} radius={12} altPrefix="Foto" />,
      );
      expect(stylesIn(host), `${layout} did not honour mediaHeight`).toContain('height: 150px');
      act(() => root.unmount());
    }
  });
});

describe('L2.2 · generic image block', () => {
  const block: BlockRef = { key: 'image', type: 'image' };

  function renderImage(mediaHeight?: string) {
    const state = createInitialMagicEditorState('business');
    state.doc.props['image'] = { ...(mediaHeight ? { mediaHeight } : {}) };
    return mount(state, <GenericBlock block={block} ctaVariants={VARIANTS} />);
  }

  it('keeps the 16/9 ratio when nothing is set', () => {
    const { host, root } = renderImage();
    expect(host.querySelector('.aspect-\\[16\\/9\\]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('applies a literal height when set', () => {
    const { host, root } = renderImage('240');
    expect(stylesIn(host)).toContain('height: 240px');
    expect(stylesIn(host)).toContain('aspect-ratio: auto');
    act(() => root.unmount());
  });
});

describe('L2.2 · the prop persists and reaches the public page', () => {
  it('round-trips through save and reload', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.props['block:imageCards'] = { items: '0' };
    state.doc.props['imageCards/item.0'] = { src: '/a.jpg', mediaHeight: '200' };

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.props['imageCards/item.0']?.['mediaHeight']).toBe('200');
  });

  it('renders on the public page', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.blocks = [{ key: 'imageCards', type: 'imageCards' }];
    pageDocument.props['block:imageCards'] = { items: '0' };
    pageDocument.props['imageCards/item.0'] = { src: '/a.jpg', mediaHeight: '200' };

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(stylesIn(host)).toContain('height: 200px');
    act(() => root.unmount());
    host.remove();
  });

  it('is written only as a string, so the document stays loadable', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.props['imageCards/item.0'] = { mediaHeight: '200' };
    const props = serializeMagicEditorState(state).props;
    for (const value of Object.values(props['imageCards/item.0'] ?? {})) {
      expect(typeof value).toBe('string');
    }
  });
});
