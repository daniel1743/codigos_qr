// @vitest-environment happy-dom
/**
 * L2.5 · Hero header elements — the second label.
 *
 * The audit's finding: every header row the L2.1 compositions draw carries ONE
 * label (`slots.brand`), because the target's second element — a status pill, an
 * eyebrow, a date — "has no source in the native templates". This closes that by
 * giving the second label a source, and it is a general one: whatever the author
 * writes is what shows, in any composition that has a header or caption row.
 *
 * The tests that matter most are the backward-compatibility ones. Both labels
 * are opt-in, and the reason is not tidiness: a page that already renders a
 * header row must not sprout a label on load, which is exactly what a non-empty
 * default would have done.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { HeroFrame } from '../components/blocks/HeroFrame';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';
import type { HeroVariant } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mount(state: MagicEditorStateV1) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider initialTemplate={state.templateId} initialDocument={state}>
        <TemplateRenderer showLandingBotPreview={false} />
      </EditorProvider>,
    );
  });
  return { host, root };
}

/** The template hero, pinned to a composition, with optional labels written. */
function renderHero(variant: HeroVariant, texts: Record<string, string> = {}) {
  const state = createInitialMagicEditorState('business');
  state.doc.props['block:hero'] = { variant };
  state.doc.texts = { ...state.doc.texts, ...texts };
  return mount(state);
}

/** Compositions whose header row renders the brand, and so can carry an eyebrow. */
const HEADER_VARIANTS: HeroVariant[] = [
  'cinematicTall',
  'photoBand',
  'centeredStack',
  'minimalColumn',
  'framedPlate',
  'masthead',
  'avatarOverlap',
];

describe('priority 5 · the second label is opt-in', () => {
  it.each(HEADER_VARIANTS)('renders no label in %s until one is written', (variant) => {
    const { host, root } = renderHero(variant);
    // The brand may be there; the eyebrow must not be.
    expect(host.querySelector('[data-editor-id="hero.eyebrow"]')).toBeNull();
    expect(host.textContent).not.toContain('Barcelona');
    act(() => root.unmount());
  });

  it.each(HEADER_VARIANTS)('renders the authored label in %s', (variant) => {
    const { host, root } = renderHero(variant, { 'hero.eyebrow': 'Barcelona' });
    expect(host.textContent).toContain('Barcelona');
    act(() => root.unmount());
  });

  it('treats a whitespace-only label as absent', () => {
    const { host, root } = renderHero('photoBand', { 'hero.eyebrow': '   ' });
    expect(host.textContent).not.toContain('   ');
    act(() => root.unmount());
  });
});

describe('priority 5 · the label is the author’s, not the template’s', () => {
  it.each(['Barcelona', 'Desde 2016', 'A 2 cuadras', '2026'])(
    'renders whatever is written: %s',
    (written) => {
      const { host, root } = renderHero('photoBand', { 'hero.eyebrow': written });
      expect(host.textContent).toContain(written);
      act(() => root.unmount());
    }
  );

  it('is not the brand: both render, and they are different labels', () => {
    const { host, root } = renderHero('photoBand', { 'hero.eyebrow': 'Barcelona' });
    const text = host.textContent ?? '';
    expect(text).toContain('Barcelona');
    expect(text).toContain('Áurea');
    act(() => root.unmount());
  });
});

describe('priority 5 · the caption row gets its trailing label too', () => {
  it('renders no caption label until one is written', () => {
    const { host, root } = renderHero('framedPlate');
    expect(host.textContent).not.toContain('01 / 24');
    act(() => root.unmount());
  });

  it.each(['minimalColumn', 'framedPlate'] as HeroVariant[])(
    'renders the caption label in %s',
    (variant) => {
      const { host, root } = renderHero(variant, { 'hero.meta': '01 / 24' });
      expect(host.textContent).toContain('01 / 24');
      act(() => root.unmount());
    }
  );
});

describe('priority 5 · compositions with no header row ignore the slot', () => {
  it('does not invent a header row where the composition has none', () => {
    // `imageThenText` is the plainer sibling: media, then copy. No header.
    const { host, root } = renderHero('imageThenText', { 'hero.eyebrow': 'Barcelona' });
    expect(host.textContent).not.toContain('Barcelona');
    act(() => root.unmount());
  });
});

describe('priority 5 · the slots contract itself', () => {
  it('renders the eyebrow as the second end of the header row', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <EditorProvider initialTemplate="business" initialDocument={createInitialMagicEditorState('business')}>
          <HeroFrame
            id="probe"
            media=""
            mediaAlt=""
            radius={0}
            defaultVariant="photoBand"
            slots={{
              title: <span data-slot="title">Título</span>,
              brand: <span data-slot="brand">Marca</span>,
              eyebrow: <span data-slot="eyebrow">Etiqueta</span>,
            }}
          >
            {() => null}
          </HeroFrame>
        </EditorProvider>
      );
    });
    // Both live in the same header row — the one laid out with `justify-between`
    // that the composition already had, waiting for its second child.
    const row = host.querySelector('[data-slot="brand"]')?.closest('.justify-between');
    expect(row).not.toBeNull();
    expect(row?.contains(host.querySelector('[data-slot="eyebrow"]'))).toBe(true);
    act(() => root.unmount());
    host.remove();
  });

  it('renders the brand alone when no eyebrow is handed over — the pre-L2.5 page', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <EditorProvider initialTemplate="business" initialDocument={createInitialMagicEditorState('business')}>
          <HeroFrame
            id="probe"
            media=""
            mediaAlt=""
            radius={0}
            defaultVariant="photoBand"
            slots={{ title: <span data-slot="title">Título</span>, brand: <span data-slot="brand">Marca</span> }}
          >
            {() => null}
          </HeroFrame>
        </EditorProvider>
      );
    });
    expect(host.querySelector('[data-slot="brand"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="eyebrow"]')).toBeNull();
    act(() => root.unmount());
    host.remove();
  });
});

describe('priority 5 · persists and reaches the public page', () => {
  it('round-trips both labels', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.props['block:hero'] = { variant: 'photoBand' };
    state.doc.texts['hero.eyebrow'] = 'Barcelona';
    state.doc.texts['hero.meta'] = '01 / 24';

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.texts['hero.eyebrow']).toBe('Barcelona');
    expect(reloaded.doc.texts['hero.meta']).toBe('01 / 24');
  });

  it('renders on the public page', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.props['block:hero'] = { variant: 'photoBand' };
    pageDocument.texts['hero.eyebrow'] = 'Barcelona';

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.textContent).toContain('Barcelona');
    act(() => root.unmount());
    host.remove();
  });

  it('adds nothing to a page that never wrote a label', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.props['block:hero'] = { variant: 'photoBand' };

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.textContent).not.toContain('Barcelona');
    expect(host.textContent).not.toContain('01 / 24');
    act(() => root.unmount());
    host.remove();
  });
});
