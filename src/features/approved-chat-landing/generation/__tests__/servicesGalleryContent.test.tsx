// @vitest-environment happy-dom
/**
 * Microfase 3B · Services and Gallery draw the document, not another business.
 *
 * The generator writes the pack's services into `texts['<block>/service.<n>.*']`
 * with the slot list in `props['block:<key>'].items`, and the pack's gallery
 * into `props['gallery'].items`; the renderers decide what a slot that declares
 * nothing shows. Each half can be green on its own while the page still shows
 * the `business` template's clinic demo — the generator could write to ids
 * nothing reads, and the renderers could read the right ids with the wrong
 * fallback.
 *
 * So these tests feed the *generated* document, unchanged, into
 * `MagicPublicRenderer` — the component the public routes mount — and assert
 * what a visitor actually gets. The last groups do the opposite: they render a
 * document that declares no origin, which is every page made by hand, and pin
 * the demo it must keep; and they assert that serializing and hydrating the
 * generated document preserves the rows, the slot list and the photos.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateMagicPageDocument } from '../magicPageDocument';
import { MagicPublicRenderer } from '../../../magic-page-editor-production/MagicPublicRenderer';
import { serializeMagicEditorState } from '../../../magic-page-editor-production/magic-document';
import { createBusinessContextStore } from '../../state/businessContext';
import { contentForPack, getTemplate, resolveContent } from '../../utils/templates';
import { images as isolatedImages } from '../../../../isolated/magic-page-editor/data/images';
import {
  SERVICES_DEFAULT_CONTENT,
  SERVICES_DEFAULT_ITEMS,
  readService,
} from '../../../../isolated/magic-page-editor/utils/servicesOps';
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

/** The restaurant the conversational flow describes, with the family's own pack. */
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

/**
 * The whole page surface (text and attributes). Every block renders under
 * `MagicPublicRenderer`, so a clinic label or clinic photo path anywhere on a
 * generated page is a failure of this microphase.
 */
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

/** Every `<img>` the generated document's gallery block draws, in document order. */
function galleryPhotos(html: string): string[] {
  const gallery = parsed(html).querySelector('[data-editor-id="gallery"]');
  if (!gallery) return [];
  return Array.from(gallery.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '');
}

/**
 * The service rows a generated document's services block draws, in order.
 *
 * `ServicesBlock`'s root is the only element carrying `data-row-treatment`; each
 * row is a `li` whose `data-editor-id` is `<blockKey>/service.<slot>` — the
 * unprefixed `services/…` for the native block, `services-2/…` for a later copy.
 */
function serviceRows(html: string): { title: string; detail: string; price: string }[] {
  const services = parsed(html).querySelector('[data-row-treatment]');
  if (!services) return [];
  return Array.from(services.querySelectorAll('li[data-editor-id]')).map((li) => {
    const p = Array.from(li.querySelectorAll('p')).map((el) => el.textContent ?? '');
    return {
      title: p[0] ?? '',
      detail: p[1] ?? '',
      price: li.querySelector('span')?.textContent ?? '',
    };
  });
}

/**
 * The strings and media paths a generated page of another industry must carry
 * nowhere: the editor's generic service sample, and the `business` template's
 * clinic gallery photos.
 */
const SERVICE_SAMPLE = SERVICES_DEFAULT_CONTENT.map((service) => service.title.trim());
const CLINIC_PHOTOS = [isolatedImages.bizResult, isolatedImages.bizFacial, isolatedImages.bizProducts, isolatedImages.bizClinic];

describe('Microfase 3B · a generated page draws Services and Gallery from its own pack', () => {
  it('1) food_story lists the restaurant pack services with their prices, and nothing else', () => {
    const html = renderDocument(generated('food_story'));
    const rows = serviceRows(html);
    expect(rows).toEqual([
      { title: 'Pasta', detail: 'Hecha a mano', price: '$12' },
      { title: 'Pizzas', detail: 'Horno de leña', price: '$11' },
      { title: 'Vinos', detail: 'Selección italiana', price: '$6' },
      { title: 'Postres', detail: 'De la casa', price: '$7' },
    ]);
  });

  it('2) food_story draws the restaurant gallery photos, never the clinic ones', () => {
    const html = renderDocument(generated('food_story'));
    const declared = resolveContent(getTemplate('food_story'), restaurant()).images.gallery;
    expect(galleryPhotos(html)).toEqual(declared);
  });

  it('3) a generated page carries no service-sample or clinic-photo reference at all', () => {
    const html = renderDocument(generated('food_story'));
    const surface = surfaceOf(html);
    SERVICE_SAMPLE.forEach((needle) => {
      expect(surface, `the page still shows "${needle}"`).not.toContain(needle);
    });
    CLINIC_PHOTOS.forEach((needle) => {
      expect(surface, `the page still shows the clinic photo "${needle}"`).not.toContain(needle);
    });
    // And no `<img>` on the page is one of the template's gallery demos.
    const photos = parsed(html).querySelectorAll('img');
    Array.from(photos).forEach((img) => {
      const src = img.getAttribute('src') ?? '';
      if (src.startsWith('/magic-page-editor/')) {
        expect(CLINIC_PHOTOS, src).not.toContain(src);
      }
    });
  });

  it('4) every family draws exactly the pack its family resolves to', { timeout: 30_000 }, () => {
    const context = restaurant();
    templates.forEach((family) => {
      const html = renderDocument(generated(family.id, context));
      const pack = contentForPack(family, 'restaurant');
      const declared = resolveContent(family, context);

      const hasServices = family.sections.some((section) => section.block === 'services');
      const hasGallery = family.sections.some((section) => section.block === 'gallery');

      if (hasServices) {
        const rows = serviceRows(html);
        expect(rows.map((row) => row.title), family.id).toEqual(pack.services.filter((service) => service.title.trim() !== '').map((service) => service.title));
        rows.forEach((row, index) => {
          expect(row.detail, `${family.id} service ${index} detail`).toBe(pack.services[index]!.detail);
          expect(row.price, `${family.id} service ${index} price`).toBe(pack.services[index]!.price);
        });
      }

      if (hasGallery) {
        expect(galleryPhotos(html), family.id).toEqual(declared.images.gallery.filter((src) => src !== ''));
      }
    });
  });

  it('5) the generated document declares the rows and the photos it draws', () => {
    const pageDocument = generated('food_story');
    const block = pageDocument.blocks.find((b) => b.type === 'services');
    expect(pageDocument.props[`block:${block!.key}`]?.['items']).toBe('0,1,2,3');
    expect(pageDocument.props['gallery']?.['items']).toBe(
      resolveContent(getTemplate('food_story'), restaurant()).images.gallery.join('|'),
    );
    ['services/service.0.title', 'services/service.1.detail', 'services/service.3.price'].forEach((id) => {
      expect(pageDocument.texts[id], id).toBeTruthy();
    });
  });
});

describe('Microfase 3B · the rows and photos survive serialize and hydrate', () => {
  it('6) serialize/hydrate preserves the slot list, the rows and the photos', () => {
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
    expect(hydrated.props['block:services']?.['items']).toBe('0,1,2,3');
    expect(hydrated.props['gallery']?.['items']).toBe(pageDocument.props['gallery']?.['items']);
    expect(hydrated.texts['services/service.0.title']).toBe('Pasta');
    expect(hydrated.texts['services/service.3.price']).toBe('$7');
    expect(hydrated.texts['services/service.0.detail']).toBe('Hecha a mano');
  });
});

describe('Microfase 3B · documents that declare no origin keep the demo', () => {
  /**
   * The shape of a page made by hand in the editor: the `business` template's
   * blocks, no declared copy, no slot list and no photos — exactly what every
   * page published before this microphase resolves to.
   */
  function handmade() {
    return serializeMagicEditorState({
      templateId: 'business',
      doc: {
        blocks: [
          { key: 'hero', type: 'hero' },
          { key: 'services', type: 'services' },
          { key: 'gallery', type: 'gallery' },
        ],
        texts: {},
        textStyles: {},
        props: {},
        removed: {},
      },
    });
  }

  it('7) a hand-made page keeps the editor service sample and the clinic gallery, exactly as before', () => {
    const html = renderDocument(handmade());
    const defaults = SERVICES_DEFAULT_ITEMS.map((slot) => SERVICES_DEFAULT_CONTENT[Number(slot)]!);
    const rows = serviceRows(html);
    expect(rows.map((row) => row.title)).toEqual(defaults.map((service) => service.title));
    expect(rows.map((row) => row.detail)).toEqual(defaults.map((service) => service.detail));
    expect(rows.map((row) => row.price)).toEqual(defaults.map((service) => service.price));
    expect(galleryPhotos(html)).toEqual([isolatedImages.bizResult, isolatedImages.bizFacial, isolatedImages.bizProducts]);
  });

  it('8) the editor can still edit the generated page: empty rows draw empty, written rows draw the author text', () => {
    const pageDocument = generated('food_story');
    pageDocument.texts['services/service.0.title'] = 'Menú del día';
    pageDocument.texts['services/service.0.price'] = '';
    pageDocument.props['gallery'] = { ...pageDocument.props['gallery'], items: 'https://example.com/nueva-foto.jpg' };
    const html = renderDocument(pageDocument);
    const rows = serviceRows(html);
    expect(rows[0]!.title).toBe('Menú del día');
    expect(rows[0]!.price).toBe('');
    expect(galleryPhotos(html)).toEqual(['https://example.com/nueva-foto.jpg']);
  });

  it('9) readService: the public path draws the empty state, the editor path keeps the sample', () => {
    const pageDocument = generated('food_story');
    const read = (sample: boolean) =>
      readService(pageDocument as never, 'services', '5', 5, sample);
    // A slot the document never filled: public render draws nothing, never a
    // sample from another business.
    expect(read(false)).toEqual({ id: 'services/service.5', slot: '5', index: 5, title: '', detail: '', price: '' });
    // The editor panel still draws the sample for a row the author just added —
    // indexed by the row's own position, so slot 5 draws the sixth sample.
    expect(read(true).title).toBe(SERVICES_DEFAULT_CONTENT[5]!.title);
    expect(read(true).detail).toBe(SERVICES_DEFAULT_CONTENT[5]!.detail);
    expect(read(true).price).toBe(SERVICES_DEFAULT_CONTENT[5]!.price);
  });
});
