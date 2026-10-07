// @vitest-environment happy-dom
/**
 * L2.3 · Services, and the shared row-treatment vocabulary.
 *
 * Two things are being pinned here, and the first one is the point of the phase:
 *
 *  · `services` is its OWN family, not a renamed `collection`. A service row is
 *    title / detail / price with NO image — and the card family requires an image
 *    per item, so an alias would either drop the price or invent media. The test
 *    that matters is the one asserting no media element is rendered at all.
 *
 *  · `rowTreatment` is a semantic shared by any list block — "a surface per row"
 *    versus "a list separated by rules" — not a border flag hardcoded for one
 *    template. Its default is the surface, which is what every existing block
 *    already draws, so an unset prop cannot change a published page.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { ServicesBlock } from '../components/blocks/ServicesBlock';
import { FamilyCard } from '../components/cards/FamilyCard';
import { cardFamilies } from '../data/cardFamilies';
import { blockKit, blockLabels } from '../data/blockKit';
import { resolveRowTreatment, ROW_TREATMENTS } from '../utils/rowTreatment';
import { blockPrefix } from '../utils/styles';
import {
  SERVICES_MAX,
  addService,
  deleteService,
  duplicateService,
  moveService,
  readService,
  servicesOrder,
} from '../utils/servicesOps';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';
import type { PageDoc, BlockRef } from '../types/editor';

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

const stylesIn = (host: HTMLElement) =>
  [host, ...Array.from(host.querySelectorAll<HTMLElement>('*'))]
    .map((el) => el.getAttribute('style') ?? '')
    .join(' ; ');

const SERVICES_BLOCK: BlockRef = { key: 'services', type: 'services' };

function renderServices(props: Record<string, string> = {}, texts: Record<string, string> = {}) {
  const state = createInitialMagicEditorState('business');
  if (Object.keys(props).length) state.doc.props['block:services'] = props;
  state.doc.texts = { ...state.doc.texts, ...texts };
  return mount(state, <ServicesBlock block={SERVICES_BLOCK} maxWidth={720} />);
}

describe('L2.3 · rowTreatment is a shared vocabulary, defaulting to today', () => {
  it('defaults to the surface treatment for anything unrecognised', () => {
    expect(resolveRowTreatment(undefined)).toBe('surface');
    expect(resolveRowTreatment('')).toBe('surface');
    expect(resolveRowTreatment('nonsense')).toBe('surface');
    expect(resolveRowTreatment('surface')).toBe('surface');
  });

  it('recognises the rule treatment', () => {
    expect(resolveRowTreatment('rule')).toBe('rule');
  });

  it('exposes exactly the two treatments the picker offers', () => {
    expect(ROW_TREATMENTS.map((o) => o.value)).toEqual(['surface', 'rule']);
  });
});

describe('L2.3 · the services model', () => {
  const emptyDoc = () => createInitialMagicEditorState('business').doc;
  const withItems = (items: string): PageDoc => ({
    ...emptyDoc(),
    props: { 'block:services': { items } },
  });

  it('renders three sample rows for a fresh block', () => {
    expect(servicesOrder(emptyDoc(), 'services')).toHaveLength(3);
  });

  it('reads a stored row, falling back to sensible sample text', () => {
    const doc = withItems('0');
    const row = readService(doc, 'services', '0', 0);
    expect(row.title.length).toBeGreaterThan(2);
    expect(row.price.length).toBeGreaterThan(1);
  });

  it('prefers the stored text over the sample', () => {
    const doc: PageDoc = {
      ...withItems('0'),
      texts: { 'services/service.0.title': 'Corte clásico' },
    };
    expect(readService(doc, 'services', '0', 0).title).toBe('Corte clásico');
  });

  it('adds, duplicates and moves rows', () => {
    const doc = withItems('0');
    const added = addService(doc, 'services');
    expect(servicesOrder(added, 'services')).toHaveLength(2);

    const moved = moveService(added, 'services', servicesOrder(added, 'services')[1]!, -1);
    expect(servicesOrder(moved, 'services')[0]).toBe(servicesOrder(added, 'services')[1]);

    const duped = duplicateService(added, 'services', '0');
    expect(servicesOrder(duped, 'services')).toHaveLength(3);
  });

  it('keeps at least one row and never exceeds the maximum', () => {
    const single = withItems('0');
    expect(servicesOrder(deleteService(single, 'services', '0'), 'services')).toHaveLength(1);

    const full = withItems(Array.from({ length: SERVICES_MAX }, (_, i) => String(i)).join(','));
    expect(servicesOrder(addService(full, 'services'), 'services')).toHaveLength(SERVICES_MAX);
  });

  it('carries the duplicated row text across', () => {
    const doc: PageDoc = {
      ...withItems('0'),
      texts: { 'services/service.0.title': 'Corte clásico' },
    };
    const duped = duplicateService(doc, 'services', '0');
    const newSlot = servicesOrder(duped, 'services')[1]!;
    expect(readService(duped, 'services', newSlot, 1).title).toBe('Corte clásico');
  });
});

describe('L2.3 · services renders as its own block, not a collection alias', () => {
  it('draws no media element at all', () => {
    const { host, root } = renderServices();
    // The card family requires an image per item; a service row has none. If
    // this ever starts rendering an <img>, the block has become an alias.
    expect(host.querySelectorAll('img')).toHaveLength(0);
    expect(host.querySelectorAll('[data-slot="image"]')).toHaveLength(0);
    act(() => root.unmount());
  });

  it('shows title, detail and price for each row', () => {
    const { host, root } = renderServices({}, {
      'services/service.0.title': 'Corte clásico',
      'services/service.0.detail': '45 min · lavado incluido',
      'services/service.0.price': '$15',
    });
    const text = host.textContent ?? '';
    expect(text).toContain('Corte clásico');
    expect(text).toContain('45 min · lavado incluido');
    expect(text).toContain('$15');
    act(() => root.unmount());
  });

  it('defaults to the surface treatment', () => {
    const { host, root } = renderServices();
    expect(host.querySelector('[data-row-treatment="surface"]')).not.toBeNull();
    expect(host.textContent).not.toBeNull();
    act(() => root.unmount());
  });

  it('switches to a rule-separated list when asked', () => {
    const { host, root } = renderServices({ rowTreatment: 'rule' });
    expect(host.querySelector('[data-row-treatment="rule"]')).not.toBeNull();
    // No per-row surface: the surface token is what the card look is built on.
    expect(host.querySelectorAll('.cq-surface')).toHaveLength(0);
    act(() => root.unmount());
  });

  it('shows no heading until one is written', () => {
    const plain = renderServices();
    expect(plain.host.querySelector('h2')).toBeNull();
    act(() => plain.root.unmount());

    // Derive the heading id the way the block does. `blockPrefix` yields '' when
    // a block's key equals its type, so it is `services.title` here and not
    // `services/services.title` — writing that string by hand is how this test
    // first went wrong.
    const headingId = `${blockPrefix(SERVICES_BLOCK)}services.title`;
    const titled = renderServices({}, { [headingId]: 'Servicios' });
    expect(titled.host.querySelector('h2')?.textContent).toContain('Servicios');
    act(() => titled.root.unmount());
  });
});

describe('L2.3 · services is a first-class block', () => {
  it('is offered in the Block Kit with its own label', () => {
    expect(blockKit.some((b) => b.type === 'services')).toBe(true);
    expect(blockLabels.services).toBe('Servicios');
    const entry = blockKit.find((b) => b.type === 'services')!;
    expect(entry.label.trim().length).toBeGreaterThan(2);
    expect(entry.description.trim().length).toBeGreaterThan(8);
  });
});

describe('L2.3 · card media height, only where the layout has a ratio', () => {
  const item = cardFamilies.catalog.items[0]!;

  function renderCard(layout: string, mediaHeight?: string) {
    const state = createInitialMagicEditorState('business');
    state.doc.props['card'] = { layout, ...(mediaHeight ? { mediaHeight } : {}) };
    return mount(
      state,
      <FamilyCard id="card" family={cardFamilies.catalog} item={item} blockProps={{}} />,
    );
  }

  it('applies on an aspect-driven layout', () => {
    const { host, root } = renderCard('top', '130');
    expect(stylesIn(host)).toContain('height: 130px');
    expect(stylesIn(host)).toContain('aspect-ratio: auto');
    act(() => root.unmount());
  });

  it('is deliberately inert on a min-height layout, rather than a silent no-op', () => {
    // The card would render at its min-height anyway, so offering the control
    // there would be a setting that changes nothing. It is not wired, by design.
    const { host, root } = renderCard('left', '130');
    expect(stylesIn(host)).not.toContain('height: 130px');
    act(() => root.unmount());
  });

  it('leaves the card untouched when no height is set', () => {
    const { host, root } = renderCard('top');
    expect(stylesIn(host)).not.toContain('aspect-ratio: auto');
    act(() => root.unmount());
  });
});

describe('L2.3 · everything persists and reaches the public page', () => {
  it('round-trips the order, the text and the treatment', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.blocks = [{ key: 'services', type: 'services' }];
    state.doc.props['block:services'] = { items: '0,1', rowTreatment: 'rule' };
    state.doc.texts['services/service.0.title'] = 'Corte clásico';

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.props['block:services']?.['rowTreatment']).toBe('rule');
    expect(reloaded.doc.texts['services/service.0.title']).toBe('Corte clásico');
  });

  it('renders the block on the public page', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.blocks = [{ key: 'services', type: 'services' }];
    pageDocument.props['block:services'] = { items: '0', rowTreatment: 'rule' };
    pageDocument.texts['services/service.0.title'] = 'Corte clásico';

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.querySelector('[data-row-treatment="rule"]')).not.toBeNull();
    expect(host.textContent).toContain('Corte clásico');
    act(() => root.unmount());
    host.remove();
  });
});
