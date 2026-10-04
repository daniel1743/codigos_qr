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

/** Item with every optional text slot explicitly empty (image-only card). */
const IMAGE_ONLY: Partial<CardItem> = {
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
  props: Record<string, Record<string, string>> = {},
) {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.props = { ...documentState.props, ...props };
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
 * E1.2 — a card may render ONLY its image: title present → title surface,
 * description present → description surface, both empty → no bottom zone at all.
 * The editor keeps the empty slots so authors can type into them.
 */
describe('E1.2 card that renders only its image', () => {
  it('renders the title slot when there is a title', () => {
    const { host, root } = mountCard({ ...IMAGE_ONLY, title: 'Proyecto' }, 'preview');
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="title"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('renders only the description slot when there is no title', () => {
    const { host, root } = mountCard({ ...IMAGE_ONLY, description: 'Solo descripción' }, 'preview');
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="title"]')).toBeNull();
    expect(host.querySelector('[data-slot="body"]')?.textContent ?? '').toContain('Solo descripción');
    act(() => root.unmount());
  });

  it('collapses the bottom zone (no surface) when title and description are empty', () => {
    const { host, root } = mountCard(IMAGE_ONLY, 'preview');
    expect(host.querySelector('[data-slot="body"]')).toBeNull();
    expect(host.querySelector('[data-slot="title"]')).toBeNull();
    // the image (and therefore the card) is still rendered
    expect(host.querySelector(`[data-editor-id="${cardId}.img"]`)).not.toBeNull();
    act(() => root.unmount());
  });

  it('collapses in the editor too when the card has no visible content', () => {
    // Final contract: an image-only card shows ONLY the image in every mode; an
    // empty surface is not the editing mechanism. Title/description are restored
    // from the existing card controls / Inspector, not from a white patch.
    const { host, root } = mountCard(IMAGE_ONLY, 'edit');
    expect(host.querySelector('[data-slot="body"]')).toBeNull();
    expect(host.querySelector(`[data-editor-id="${cardId}.img"]`)).not.toBeNull();
    act(() => root.unmount());
  });

  it('brings the surface back in the editor as soon as there is a title', () => {
    const { host, root } = mountCard({ ...IMAGE_ONLY, title: 'Proyecto' }, 'edit');
    expect(host.querySelector('[data-slot="body"]')).not.toBeNull();
    expect(host.querySelector('[data-slot="title"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('keeps an accessible name and the click target when the visual title is empty', () => {
    const { host, root } = mountCard(IMAGE_ONLY, 'preview', {
      [cardId]: { href: 'https://example.com/destino' },
    });
    const card = host.querySelector<HTMLElement>(`[data-editor-id="${cardId}"]`);
    expect(card?.tagName.toLowerCase()).toBe('a');
    expect(card?.getAttribute('href')).toBe('https://example.com/destino');
    expect(card?.getAttribute('aria-label')).toBe('Abrir contenido de la tarjeta');
    act(() => root.unmount());
  });

  it('prefers the description as the accessible name when it exists', () => {
    const { host, root } = mountCard({ ...IMAGE_ONLY, description: 'Visitar la web' }, 'preview', {
      [cardId]: { href: 'https://example.com/destino' },
    });
    const card = host.querySelector<HTMLElement>(`[data-editor-id="${cardId}"]`);
    expect(card?.getAttribute('aria-label')).toBe('Visitar la web');
    act(() => root.unmount());
  });
});
