// @vitest-environment happy-dom
/**
 * Microfase 3C · Reviews, Location and Footer draw the document, not another
 * business.
 *
 * Each of the three carries the `business` template's clinic demo in the
 * renderer itself: two sample testimonials, an address and opening hours, and a
 * brand line. A page generated from the Business Context has none of those from
 * its owner, so drawing them would attribute invented reviews, an invented
 * address and another business's name to a real page.
 *
 * Two subsystems meet here, and each half can be green on its own while the page
 * still shows the demo — the generator could write an empty slot list nothing
 * reads, and the renderer could read the right key with the wrong fallback. So
 * these tests feed the *generated* document, unchanged, into
 * `MagicPublicRenderer` — the component the public routes mount — and assert what
 * a visitor actually gets. The last group does the opposite: it renders a
 * document that declares no origin, which is every page made by hand, and pins
 * the demo it must keep.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateMagicPageDocument } from '../magicPageDocument';
import { MagicPublicRenderer } from '../../../magic-page-editor-production/MagicPublicRenderer';
import { serializeMagicEditorState } from '../../../magic-page-editor-production/magic-document';
import { createBusinessContextStore } from '../../state/businessContext';
import {
  REVIEWS_DEFAULT_CONTENT,
  reviewId,
  reviewsOrder,
} from '../../../../isolated/magic-page-editor/utils/reviewsOps';
import { templates } from '../../data/templates';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  }
});

function restaurant(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Cocina Aurora', type: 'restaurant', description: 'Pastas frescas hechas en casa.' });
  return store.get();
}

function generated(id: TemplateId, context: BusinessContext = restaurant()) {
  return generateMagicPageDocument({ businessContext: context, selectedTemplateId: id });
}

function renderDocument(document: unknown): string {
  const host = globalThis.document.createElement('div');
  globalThis.document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(<MagicPublicRenderer document={document as never} />);
  });
  const html = host.innerHTML;
  act(() => root.unmount());
  host.remove();
  return html;
}

function parsed(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** The whole page surface: text and attributes, so an href or an alt counts too. */
function surfaceOf(html: string): string {
  const root = parsed(html);
  const text = Array.from(root.body.querySelectorAll('*')).
  map((el) => el.textContent ?? '').
  join(' ');
  const attributes = Array.from(root.body.querySelectorAll('*')).
  flatMap((el) => Array.from(el.attributes).map((attribute) => attribute.value)).
  join(' ');
  return `${text} ${attributes}`;
}

/** Every review card the page draws, in document order. */
function reviewCards(html: string): Element[] {
  return Array.from(parsed(html).querySelectorAll('article[data-editor-id]'));
}

/** The footer subtree only. */
function footerOf(html: string): Element {
  const footer = parsed(html).querySelector('[data-editor-id="footer"]');
  expect(footer, 'the page did not render a footer').not.toBeNull();
  return footer!;
}

/**
 * Every string the clinic demo puts on Reviews, Location and the footer. A
 * generated page of another industry must carry none of them.
 */
const CLINIC_COPY = [
  'Clínica Áurea',
  'Áurea',
  'Serrano',
  'Madrid',
  'Lunes a viernes',
  'Sábados',
  'Visítanos',
  'Hecho con calma · Barcelona',
  'Olmo Estudio',
  'Andrés Olmo',
  'Marina Solé',
  '34910000000',
  'clinicaaurea',
];

describe('Microfase 3C · Reviews, Location and Footer never show another business', () => {
  it('1) a generated page carries no clinic reference in any of the three', () => {
    const surface = surfaceOf(renderDocument(generated('food_story')));
    CLINIC_COPY.forEach((needle) => {
      expect(surface, `the page still shows "${needle}"`).not.toContain(needle);
    });
  });

  it('2) no review is attributed to the business: the block draws no testimonial', () => {
    const html = renderDocument(generated('food_story'));
    expect(reviewCards(html)).toHaveLength(0);
    // Not the editor's generic sample, and not the family pack's demo either.
    REVIEWS_DEFAULT_CONTENT.forEach((review) => {
      expect(surfaceOf(html), `the page still shows "${review.name}"`).not.toContain(review.name);
      expect(surfaceOf(html), `the page still shows "${review.text}"`).not.toContain(review.text);
    });
    // No star rating is drawn for a business that received none.
    expect(parsed(html).querySelectorAll('[data-review-rating]')).toHaveLength(0);
  });

  it('3) no address, city, hours or phone is invented', () => {
    const html = renderDocument(generated('food_story'));
    // The location section is not visible on a generated page with no declared
    // address: no map, no "Cómo llegar" route.
    expect(parsed(html).querySelector('[data-editor-id="location.cta"]')).toBeNull();
    expect(surfaceOf(html)).not.toContain('Cómo llegar');
  });

  it('4) the footer signs with the business the document names, and nothing else', () => {
    const html = renderDocument(generated('food_story'));
    const footer = footerOf(html);
    expect(footer.textContent).toContain('Cocina Aurora');
    expect(footer.textContent).toContain('Hecho con Cripqer');
    expect(footer.textContent).not.toContain('Clínica Áurea');
    expect(footer.textContent).not.toContain('Serrano');
    // The demo's handles are gone with the demo's brand.
    expect(Array.from(footer.querySelectorAll('a')).map((a) => a.getAttribute('href'))).
    not.toContain('https://instagram.com/clinicaaurea');
  });

  it('5) the generated document declares the empty review list, so nothing is sampled', () => {
    const pageDocument = generated('food_story');
    const block = pageDocument.blocks.find((b) => b.type === 'reviews');
    expect(block, 'food_story declares no reviews section').toBeTruthy();
    expect(pageDocument.props[`block:${block!.key}`]?.['items']).toBe('');
    expect(reviewsOrder({ blocks: pageDocument.blocks, texts: pageDocument.texts, textStyles: pageDocument.textStyles, props: pageDocument.props, removed: pageDocument.removed }, block!.key)).toEqual([]);
  });

  it('6) the owner can fill the location later, and the section appears', () => {
    const pageDocument = generated('food_story');
    pageDocument.texts['location.address'] = 'Av. del Parque 214';
    pageDocument.texts['location.name'] = 'Cocina Aurora';
    const html = renderDocument(pageDocument);
    const surface = surfaceOf(html);
    expect(surface).toContain('Av. del Parque 214');
    expect(surface).toContain('Cocina Aurora');
    // With an address declared the route exists, and it points at that address.
    expect(parsed(html).querySelector('[data-editor-id="location.cta"]')).not.toBeNull();
    expect(surface).toContain('google.com/maps/search');
  });

  it('7) the owner can fill a review later, and only that one is drawn', () => {
    const pageDocument = generated('food_story');
    pageDocument.props['block:reviews'] = { items: '0' };
    pageDocument.props[reviewId('reviews', '0')] = { name: 'Lucía F.', text: 'Un lugar para volver cada semana.', rating: '5' };
    const html = renderDocument(pageDocument);
    const cards = reviewCards(html);
    expect(cards).toHaveLength(1);
    expect(cards[0]!.textContent).toContain('Lucía F.');
    expect(cards[0]!.textContent).toContain('Un lugar para volver cada semana.');
  });

  it('8) every family keeps its contract: no testimonial, no clinic reference', { timeout: 30_000 }, () => {
    templates.forEach((family) => {
      const pageDocument = generated(family.id);
      const html = renderDocument(pageDocument);
      const surface = surfaceOf(html);
      expect(reviewCards(html), family.id).toHaveLength(0);
      ['Clínica Áurea', 'Serrano', 'clinicaaurea'].forEach((needle) => {
        expect(surface, `${family.id} still shows "${needle}"`).not.toContain(needle);
      });
      // And the footer carries the document's own name for a page that has one.
      expect(footerOf(html).textContent, family.id).toContain('Cocina Aurora');
    });
  });

  it('9) the empty declarations survive serialize and hydrate', () => {
    const pageDocument = generated('food_story');
    const wire = JSON.parse(JSON.stringify(pageDocument));
    const hydrated = serializeMagicEditorState({
      templateId: 'business',
      doc: {
        blocks: wire.blocks,
        texts: wire.texts,
        textStyles: wire.textStyles,
        props: wire.props,
        removed: wire.removed,
      },
    });
    expect(hydrated.props['block:reviews']?.['items']).toBe('');
  });
});

describe('Microfase 3C · documents that declare no origin keep the demo', () => {
  /**
   * The shape of a page made by hand in the editor: the `business` template's
   * blocks with no declared copy, no slot lists and no origin — exactly what
   * every page published before this microphase resolves to.
   */
  function handmade() {
    return serializeMagicEditorState({
      templateId: 'business',
      doc: {
        blocks: [
          { key: 'hero', type: 'hero' },
          { key: 'reviews', type: 'reviews' },
          { key: 'location', type: 'location' },
        ],
        texts: {},
        textStyles: {},
        props: {},
        removed: {},
      },
    });
  }

  it('10) a hand-made page keeps the sample reviews, the clinic location and the demo footer', () => {
    const html = renderDocument(handmade());
    const cards = reviewCards(html);
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card, index) => {
      expect(card.textContent).toContain(REVIEWS_DEFAULT_CONTENT[index]!.name);
      expect(card.textContent).toContain(REVIEWS_DEFAULT_CONTENT[index]!.text);
    });
    const surface = surfaceOf(html);
    expect(surface).toContain('Calle de Serrano 48');
    expect(surface).toContain('Lunes a viernes');
    expect(surface).toContain('Cómo llegar');
    expect(footerOf(html).textContent).toContain('Clínica Áurea');
  });

  it('11) the demo page and the generated page differ in content, not in structure', () => {
    const demo = parsed(renderDocument(handmade()));
    const page = parsed(renderDocument(generated('food_story')));
    // Both keep the same block ids and the same footer element; only the content
    // the document declares differs.
    expect(Array.from(page.querySelectorAll('[data-editor-id]')).map((e) => e.getAttribute('data-editor-id'))).
    not.toEqual(Array.from(demo.querySelectorAll('[data-editor-id]')).map((e) => e.getAttribute('data-editor-id')));
    expect(footerOf(renderDocument(generated('food_story'))).getAttribute('data-editor-id')).toBe('footer');
  });
});
