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
const TITLE = 'Título visible';
const PERSISTED = '#FFFFFF';
const UNIFIED = '#FFB700';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function rgb(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return color.trim();
  const value = hex[1];
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
}

function mountCard(props: Record<string, Record<string, string>>, blockProps: Record<string, string> = {}) {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.props = {
    ...documentState.props,
    page: { ...(documentState.props.page ?? {}), textColor: UNIFIED },
    ...props,
  };
  documentState.textStyles[`${cardId}.title`] = { color: PERSISTED };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(
    <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)} initialMode="preview">
      <FamilyCard
        id={cardId}
        family={family}
        item={{ ...family.items[0], title: TITLE, description: '', cta: '', badge: '', price: '', eyebrow: '', meta: '' } as unknown as CardItem}
        blockProps={{ variant: family.variants[0].id, ...blockProps }}
      />
    </EditorProvider>,
  ));
  return { host, root };
}

function titleColor(host: HTMLElement): string {
  // The innermost element carrying the text (the <h3>) owns the resolved colour;
  // outer containers only carry `color: var(--fg)`.
  const matches = Array.from(host.querySelectorAll<HTMLElement>('*'))
    .filter((node) => node.textContent?.trim() === TITLE && node.style.color);
  return matches.length > 0 ? matches[matches.length - 1].style.color : '';
}

/**
 * E1.3 pre-push adjustment — "Unificar color de texto" must not recolour cards that
 * own their surface: an accent (highlight) card or a card painting over media
 * (cover) keeps the colours its author persisted.
 */
describe('E1.3 unify scope — accent and cover cards stay out', () => {
  it('does not recolour an accent-surface card', () => {
    const { host, root } = mountCard({ [cardId]: { surface: 'accent' } });
    expect(rgb(titleColor(host))).toBe(rgb(PERSISTED));
    act(() => root.unmount());
  });

  it('does not recolour a cover-layout card', () => {
    const { host, root } = mountCard({ [cardId]: { layout: 'cover' } }, { layout: 'cover' });
    expect(rgb(titleColor(host))).toBe(rgb(PERSISTED));
    act(() => root.unmount());
  });

  it('still unifies an ordinary card (control)', () => {
    const { host, root } = mountCard({});
    expect(rgb(titleColor(host))).toBe(rgb(UNIFIED));
    act(() => root.unmount());
  });
});
