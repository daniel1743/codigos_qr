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

/** Item whose seed text is empty: the owner never typed into the template item. */
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

function mountCard(item: Partial<CardItem>, mode: 'edit' | 'preview', texts: Record<string, string> = {}) {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.texts = texts;
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
 * E1.2 pre-push adjustment — the visible text can live in `doc.texts` (that is what
 * `EditableText` renders). The collapse decision must never ignore it, otherwise a
 * published card would hide text the owner actually wrote.
 */
describe('E1.2 card body — effective text decides the collapse', () => {
  it('keeps the surface when the title only exists in doc.texts', () => {
    const { host, root } = mountCard(EMPTY_SEED, 'preview', { [`${cardId}.title`]: 'Título escrito por el dueño' });
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="title"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="body"]')?.textContent ?? '').toContain('Título escrito por el dueño');
    act(() => root.unmount());
  });

  it('keeps the description slot when only the description lives in doc.texts', () => {
    const { host, root } = mountCard(EMPTY_SEED, 'preview', { [`${cardId}.desc`]: 'Descripción escrita por el dueño' });
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="title"]')).toBeNull();
    expect(host.querySelector('[data-slot="body"]')?.textContent ?? '').toContain('Descripción escrita por el dueño');
    act(() => root.unmount());
  });

  it('keeps the surface when only the eyebrow lives in doc.texts', () => {
    const { host, root } = mountCard(EMPTY_SEED, 'preview', { [`${cardId}.eyebrow`]: 'Categoría' });
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="body"]')?.textContent ?? '').toContain('Categoría');
    act(() => root.unmount());
  });

  it('still collapses to image-only when neither the item nor doc.texts carry content', () => {
    const { host, root } = mountCard(EMPTY_SEED, 'preview');
    expect(host.querySelector('[data-slot="body"]')).toBeNull();
    expect(host.querySelector(`[data-editor-id="${cardId}.img"]`)).not.toBeNull();
    act(() => root.unmount());
  });

  it('keeps the empty slots editable in the editor even with no text anywhere', () => {
    const { host, root } = mountCard(EMPTY_SEED, 'edit');
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="title"]')).not.toBeNull();
    act(() => root.unmount());
  });
});
