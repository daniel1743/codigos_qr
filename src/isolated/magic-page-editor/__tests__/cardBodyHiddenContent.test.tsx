// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { FamilyCard } from '../components/cards/FamilyCard';
import { cardFamilies } from '../data/cardFamilies';
import { createInitialMagicPageDocument, hydrateMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import type { CardFamily, CardItem } from '../types/editor';

const familyId = Object.keys(cardFamilies)[0] as CardFamily;
const family = cardFamilies[familyId];
const cardId = `block:${familyId}.card.0`;

/** Item with every optional text slot empty: only what the test provides exists. */
const EMPTY_SEED: Partial<CardItem> = {
  title: '',
  description: '',
  cta: '',
  badge: '',
  price: '',
  previousPrice: '',
  eyebrow: '',
  meta: '',
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function mountCard(
  item: Partial<CardItem>,
  mode: 'edit' | 'preview',
  texts: Record<string, string> = {},
  removed: Record<string, boolean> = {},
) {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.texts = texts;
  documentState.removed = removed;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(
    <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)} initialMode={mode}>
      <FamilyCard
        id={cardId}
        family={family}
        item={{ ...family.items[0], ...item } as unknown as CardItem}
        blockProps={{ variant: family.variants[0].id }}
      />
    </EditorProvider>,
  ));
  return { host, root };
}

/**
 * E1.2 micro-adjustment — a text that exists but is HIDDEN (`doc.removed[id]`) is
 * not visible content: it must not keep an otherwise empty bottom zone alive, while
 * the editor keeps the structure needed to restore/edit it.
 */
describe('E1.2 card body — hidden content does not count', () => {
  it('collapses when the only title is hidden', () => {
    const { host, root } = mountCard(EMPTY_SEED, 'preview', { [`${cardId}.title`]: 'Título oculto' }, { [`${cardId}.title`]: true });
    expect(host.querySelector('[data-slot="body"]')).toBeNull();
    expect(host.querySelector(`[data-editor-id="${cardId}.img"]`)).not.toBeNull();
    act(() => root.unmount());
  });

  it('renders image-only when title and description both exist but are hidden', () => {
    const { host, root } = mountCard(
      EMPTY_SEED,
      'preview',
      { [`${cardId}.title`]: 'Título oculto', [`${cardId}.desc`]: 'Descripción oculta' },
      { [`${cardId}.title`]: true, [`${cardId}.desc`]: true },
    );
    expect(host.querySelector('[data-slot="body"]')).toBeNull();
    expect(host.querySelector(`[data-editor-id="${cardId}.img"]`)).not.toBeNull();
    act(() => root.unmount());
  });

  it('keeps the body when the title is hidden but the description is visible', () => {
    const { host, root } = mountCard(
      EMPTY_SEED,
      'preview',
      { [`${cardId}.title`]: 'Título oculto', [`${cardId}.desc`]: 'Descripción visible' },
      { [`${cardId}.title`]: true },
    );
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="title"]')).toBeNull();
    expect(host.querySelector('[data-slot="body"]')?.textContent ?? '').toContain('Descripción visible');
    act(() => root.unmount());
  });

  it('collapses when the only eyebrow is hidden (same criterion)', () => {
    const { host, root } = mountCard(EMPTY_SEED, 'preview', { [`${cardId}.eyebrow`]: 'Categoría' }, { [`${cardId}.eyebrow`]: true });
    expect(host.querySelector('[data-slot="body"]')).toBeNull();
    act(() => root.unmount());
  });

  it('keeps the editor able to restore/edit hidden content', () => {
    const { host, root } = mountCard(
      EMPTY_SEED,
      'edit',
      { [`${cardId}.title`]: 'Título oculto', [`${cardId}.desc`]: 'Descripción oculta' },
      { [`${cardId}.title`]: true, [`${cardId}.desc`]: true },
    );
    // the bottom surface (its own editable element) stays selectable in the editor
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector(`[data-editor-id="${cardId}.surface"]`)).not.toBeNull();
    act(() => root.unmount());
  });
});
