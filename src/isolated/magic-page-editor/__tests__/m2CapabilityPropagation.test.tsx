// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { FamilyCard } from '../components/cards/FamilyCard';
import { cardFamilies } from '../data/cardFamilies';
import { createInitialMagicPageDocument, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import type { CardFamily } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function mountTemplate(templateId: 'bio' | 'business' | 'portfolio', family?: string) {
  const documentState = createInitialMagicPageDocument(templateId);
  documentState.props.page = {
    ...(documentState.props.page ?? {}),
    family: family ?? templateId,
    palette: 'silver',
    decorLine: 'on',
  };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider initialTemplate={templateId} initialDocument={hydrateMagicEditorState(documentState)}>
        <TemplateRenderer />
      </EditorProvider>,
    );
  });
  return { host, root, documentState };
}

describe('M2 shared capability propagation', () => {
  it.each([
    ['bio', 'bio'],
    ['business', 'business'],
    ['portfolio', 'portfolio'],
  ] as const)('propagates page-level palette and decorations to %s', (templateId, family) => {
    const { host, root } = mountTemplate(templateId, family);
    expect(host.querySelector(`[data-page-family="${family}"]`)).not.toBeNull();
    expect(host.querySelector('[data-decoration-layer]')?.className).toContain('pointer-events-none');
    expect(host.querySelector<HTMLElement>('[data-page-family]')?.style.background).toBe('#D5DCE2');
    act(() => root.unmount());
  });

  it('propagates shared media and decorations to Catalog and Mini Gallery', () => {
    const catalog = createInitialMagicPageDocument('bio');
    catalog.props.page = { ...(catalog.props.page ?? {}), family: 'catalog', palette: 'caramel' };
    catalog.props['block:catalog'] = { decorRing: 'on' };
    catalog.blocks = [{ key: 'catalog', type: 'catalog' }];
    const gallery = createInitialMagicPageDocument('bio');
    gallery.props.page = { ...(gallery.props.page ?? {}), family: 'gallery', palette: 'warm-cream' };
    gallery.props['block:gallery'] = { decorWave: 'on' };
    gallery.blocks = [{ key: 'gallery', type: 'gallery' }];

    for (const [family, doc] of [['catalog', catalog], ['gallery', gallery]] as const) {
      const host = document.createElement('div');
      document.body.append(host);
      const root = createRoot(host);
      act(() => root.render(<EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(doc)}><TemplateRenderer /></EditorProvider>));
      expect(host.querySelector('[data-page-family]')).not.toBeNull();
      expect(host.querySelector('[data-slot="image"], [data-editor-id="gallery.0"]'), family).not.toBeNull();
      expect(host.querySelector('[data-decoration-layer]')?.className).toContain('pointer-events-none');
      act(() => root.unmount());
      host.remove();
    }
  });

  it.each(Object.keys(cardFamilies) as CardFamily[])('propagates media, CTA and decoration contracts to %s cards', (familyId) => {
    const family = cardFamilies[familyId];
    const documentState = createInitialMagicPageDocument('bio');
    const cardId = `block:${familyId}.card.0`;
    documentState.props.page = { ...(documentState.props.page ?? {}), palette: 'luxury-black' };
    documentState.props[cardId] = { decorArc: 'on' };
    documentState.props[`${cardId}.img`] = { shape: 'circle' };
    documentState.props[`${cardId}.cta`] = {
      variant: 'glass',
      shape: 'soft',
      size: 'sm',
      iconPosition: 'right',
      kind: 'card',
    };
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(
      <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)}>
        <FamilyCard id={cardId} family={family} item={family.items[0]} blockProps={{ variant: family.variants[0].id }} />
      </EditorProvider>,
    ));
    expect(host.querySelector<HTMLElement>(`[data-editor-id="${cardId}.img"]`)?.style.borderRadius).toBe('9999px');
    expect(host.querySelector(`[data-decoration-layer]`)).not.toBeNull();
    if (family.items[0].cta) {
      const cta = host.querySelector<HTMLElement>(`[data-editor-id="${cardId}.cta"]`);
      expect(cta?.dataset.variant).toBe('glass');
      expect(cta?.dataset.shape).toBe('soft');
      expect(cta?.dataset.size).toBe('sm');
      expect(cta?.dataset.kind).toBe('card');
    }
    act(() => root.unmount());
  });

  it('preserves propagated values through save/reload and public rendering', () => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props.page = { ...(documentState.props.page ?? {}), family: 'business', palette: 'deep-teal', decorWave: 'on' };
    documentState.props['hero.cta'] = { variant: 'ghost', shape: 'pill', size: 'full', iconPosition: 'left', kind: 'standard' };
    documentState.props['hero.image'] = { shape: 'bleed' };
    documentState.textStyles['hero.name'] = { typeStyle: 'script', weight: 'bold', tracking: 'wide', goldText: true, upper: true };
    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(hydrateMagicEditorState(documentState)));
    expect(reloaded.doc.props).toEqual(documentState.props);
    expect(reloaded.doc.textStyles).toEqual(documentState.textStyles);
  });
});
