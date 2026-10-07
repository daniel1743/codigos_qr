// @vitest-environment happy-dom
/**
 * L2.5 · Two gallery compositions the target uses and the native set lacked.
 *
 * `destacada` — one photo across the full width, then a three-column row whose
 * first entry spans two. `bloques` — a wide lead spanning both columns, then the
 * rest two-up.
 *
 * Both are NEW ids. A gallery that already stores one of the five existing
 * layouts cannot reach them, so nothing already published can move — which is
 * the whole reason they are new ids rather than a change to `stacked`, whose
 * native meaning (a rotated pile) is a different composition entirely.
 *
 * The tests that matter beyond the shape: that `mediaHeight` still wins over the
 * layout's own height, and that the existing five layouts are untouched.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { GalleryGrid, galleryLayouts, type GalleryLayout } from '../components/blocks/GalleryGrid';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const PHOTOS = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg'];

function mount(state: MagicEditorStateV1, node?: React.ReactNode) {
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

function renderGallery(layout: GalleryLayout, cardProps: Record<string, Record<string, string>> = {}) {
  const state = createInitialMagicEditorState('business');
  state.doc.props['gallery'] = { items: PHOTOS.join('|'), layout };
  for (const [key, value] of Object.entries(cardProps)) {
    state.doc.props[`gallery.${key}`] = value;
  }
  return mount(state, <GalleryGrid id="gallery" items={PHOTOS} defaultLayout="fila" radius={12} altPrefix="Foto" />);
}

const layoutIn = (host: HTMLElement) => host.querySelector('[data-layout]')?.getAttribute('data-layout');
/** Photos are the only elements carrying an inline height in these layouts. */
const photosIn = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLElement>('[data-editor-id^="gallery."]'));

describe('L2.5 · the two compositions are new ids, added not swapped', () => {
  it('offers them in the picker, alongside the five that already existed', () => {
    const values = galleryLayouts.map((o) => o.value);
    for (const existing of ['fila', 'mosaico', 'carrusel', 'masonry', 'stacked']) {
      expect(values).toContain(existing);
    }
    expect(values).toContain('destacada');
    expect(values).toContain('bloques');
  });

  it('gives every option a label and a hint', () => {
    for (const option of galleryLayouts) {
      expect(option.label.trim().length, option.value).toBeGreaterThan(2);
      expect(option.hint.trim().length, option.value).toBeGreaterThan(10);
    }
  });

  it('keeps the native `stacked` composition exactly as it was', () => {
    // The rotated pile, untouched. `bloques` is a different id for a different
    // composition precisely so this one could stay put.
    const { host, root } = renderGallery('stacked');
    expect(layoutIn(host)).toBe('stacked');
    expect(host.querySelectorAll('.rotate-0, [style*="rotate"]').length).toBeGreaterThan(0);
    act(() => root.unmount());
  });
});

describe('L2.5 · `destacada`', () => {
  it('renders every photo', () => {
    const { host, root } = renderGallery('destacada');
    expect(layoutIn(host)).toBe('destacada');
    expect(photosIn(host).length).toBe(PHOTOS.length);
    act(() => root.unmount());
  });

  it('gives the lead its own full-width row and the rest a three-column grid', () => {
    const { host, root } = renderGallery('destacada');
    const [lead] = photosIn(host);
    expect(lead?.className).toContain('w-full');
    // The lead is the only photo NOT inside the three-column grid.
    const grid = host.querySelector('.grid-cols-3');
    expect(grid).not.toBeNull();
    expect(grid?.contains(lead ?? null)).toBe(false);
    act(() => root.unmount());
  });

  it('lets the first entry of the row span two columns', () => {
    const { host, root } = renderGallery('destacada');
    const [, first, second] = photosIn(host);
    expect(first?.className).toContain('col-span-2');
    expect(second?.className ?? '').not.toContain('col-span-2');
    act(() => root.unmount());
  });

  it('drops the row entirely when there is only one photo, rather than drawing an empty grid', () => {
    const { host, root } = renderGallery('destacada');
    act(() => root.unmount());

    const single = createInitialMagicEditorState('business');
    single.doc.props['gallery'] = { items: 'a.jpg', layout: 'destacada' };
    const { host: h, root: r } = mount(single, <GalleryGrid id="gallery" items={['a.jpg']} defaultLayout="fila" radius={12} altPrefix="Foto" />);
    expect(h.querySelector('.grid-cols-3')).toBeNull();
    expect(photosIn(h).length).toBe(1);
    act(() => r.unmount());
  });
});

describe('L2.5 · `bloques`', () => {
  it('renders a two-column grid with a lead spanning both', () => {
    const { host, root } = renderGallery('bloques');
    expect(layoutIn(host)).toBe('bloques');
    const grid = host.querySelector('.grid-cols-2');
    expect(grid).not.toBeNull();
    const [lead, ...rest] = photosIn(host);
    expect(lead?.className).toContain('col-span-2');
    expect(rest.every((el) => !el.className.includes('col-span-2'))).toBe(true);
    act(() => root.unmount());
  });

  it('caps the grid at four photos rather than wrapping into a shape it was not drawn for', () => {
    const many = ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg', 'f.jpg'];
    const state = createInitialMagicEditorState('business');
    state.doc.props['gallery'] = { items: many.join('|'), layout: 'bloques' };
    const { host, root } = mount(
      state,
      <GalleryGrid id="gallery" items={many} defaultLayout="fila" radius={12} altPrefix="Foto" />
    );
    expect(photosIn(host).length).toBe(4);
    act(() => root.unmount());
  });
});

describe('L2.5 · the layout height never overrides the author’s', () => {
  it('uses the layout height when nothing is authored', () => {
    const { host, root } = renderGallery('destacada');
    const [lead, small] = photosIn(host);
    expect(lead?.style.height).toBe('210px');
    // 72% of the row height — the target's own 150/220 proportion.
    expect(small?.style.height).toBe('151px');
    act(() => root.unmount());
  });

  it('lets an authored `mediaHeight` win over the layout height', () => {
    const { host, root } = renderGallery('destacada', { '0': { mediaHeight: '340' } });
    const [lead] = photosIn(host);
    expect(lead?.style.height).toBe('340px');
    act(() => root.unmount());
  });

  it('does the same on `bloques`', () => {
    const { host, root } = renderGallery('bloques', { '1': { mediaHeight: '90' } });
    const [, second] = photosIn(host);
    expect(second?.style.height).toBe('90px');
    act(() => root.unmount());
  });
});

describe('L2.5 · the existing five layouts are untouched', () => {
  it.each(['fila', 'mosaico', 'carrusel', 'masonry'] as GalleryLayout[])(
    '%s renders as it did, with no layout height injected',
    (layout) => {
      const { host, root } = renderGallery(layout);
      expect(layoutIn(host)).toBe(layout);
      // None of the older layouts sets a literal height; they rely on aspect
      // classes, which is exactly what a regression here would break.
      expect(photosIn(host).every((el) => el.style.height === '')).toBe(true);
      act(() => root.unmount());
    }
  );
});

describe('L2.5 · persists and reaches the public page', () => {
  it('round-trips the new layout id', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.props['gallery'] = { items: PHOTOS.join('|'), layout: 'destacada' };
    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.props['gallery']?.['layout']).toBe('destacada');
  });

  it('renders on the public page', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.props['gallery'] = { items: PHOTOS.join('|'), layout: 'bloques' };

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.querySelector('[data-layout="bloques"]')).not.toBeNull();
    act(() => root.unmount());
    host.remove();
  });
});
