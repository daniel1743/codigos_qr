// @vitest-environment happy-dom
/**
 * Microfase 4C-1 · ImageCards and links draw the page's own content.
 *
 * Two more places carried the editor's demo into a real page:
 *
 *  - `ImageCardsBlock` falls back to four placeholder photos borrowed from four
 *    different trades when a card has none of its own, so a generated page —
 *    whose cards the generator never filled — showed a clinic's products, an
 *    architect's wall and a candle on a restaurant's page.
 *  - The links collection falls back to the template's seed list when the block
 *    was never materialised, and for a bio page those seeds are the demo
 *    author's own destinations (`marinasole.com/…`, `wa.me/34600000000`). The
 *    portfolio template carries its demo destinations directly on the CTA.
 *
 * The Business Context declares a channel, never a URL, so there is no real
 * destination to write: the correct state is the collection's defined empty
 * state — nothing published and nothing navigable — and the pack's own imagery
 * is the template resource the cards draw instead.
 *
 * Each half can be green on its own while the page still leaks, so these tests
 * feed the *generated* document, unchanged, into `MagicPublicRenderer` — the
 * component the public routes mount — and assert what a visitor actually gets.
 * The last groups do the opposite: they render a document that declares no
 * origin, which is every page made by hand, and pin the demo it must keep.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateMagicPageDocument } from '../magicPageDocument';
import type { MagicPageDocumentV1 } from '../../../magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../magic-page-editor-production/MagicPublicRenderer';
import { hydrateMagicEditorState, serializeMagicEditorState } from '../../../magic-page-editor-production/magic-document';
import { EditorProvider, useEditor } from '../../../../isolated/magic-page-editor/contexts/EditorContext';
import { TemplateRenderer } from '../../../../isolated/magic-page-editor/components/templates/TemplateRenderer';
import { bioLinks } from '../../../../isolated/magic-page-editor/data/bioContent';
import { images as isolatedImages } from '../../../../isolated/magic-page-editor/data/images';
import { IMAGE_CARDS_DEFAULT_ITEMS, imageCardId } from '../../../../isolated/magic-page-editor/utils/imageCardOps';
import { createBusinessContextStore } from '../../state/businessContext';
import { contentForPack, getTemplate, resolveContent } from '../../utils/templates';
import { templates } from '../../data/templates';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

const BUSINESS_NAME = 'Cocina Aurora';

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
  store.patch({ name: BUSINESS_NAME, type: 'restaurant', description: 'Pastas frescas hechas en casa.' });
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

/** The whole page surface: text and attributes, so an href or a src counts too. */
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

/** The links collection of a page: the element `ButtonGroup` roots itself at. */
function buttonGroupOf(html: string, blockKey: string): Element | null {
  return parsed(html).querySelector(`[data-button-group="${blockKey}"]`);
}

/** Every destination rendered anywhere on the page. */
function destinations(html: string): string[] {
  return Array.from(parsed(html).querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '');
}

/**
 * The photos an image-cards block actually draws, in document order.
 *
 * A card with no image renders its frame with no `<img>` at all — that is the
 * empty state this microphase introduces — so the photos are collected from the
 * images that exist rather than padded with an empty entry per card.
 */
function imageCardPhotos(html: string, blockKey: string): string[] {
  const root = parsed(html);
  return Array.from(root.querySelectorAll(`[data-editor-id^="${blockKey}/item."] img`)).
  map((img) => img.getAttribute('src') ?? '').
  filter((src) => src !== '');
}

/**
 * The four placeholder photos the editor's image-cards block ships with, in the
 * order the block cycles them. Read from the module that owns them rather than
 * retyped, so the list cannot drift from the demo it is meant to catch: any
 * generated page drawing one of these is the leak. Each one is a distinct file,
 * so none is collapsed — a shortened list would silently stop guarding the rest.
 */
const FOREIGN_PHOTOS = [
  isolatedImages.bizProducts,
  isolatedImages.pfArch,
  isolatedImages.bioStill,
  isolatedImages.productCandle,
];

/**
 * The demo destinations 4C-1 owns: the bio template's curated link collection
 * and the portfolio template's two contact CTAs. Their blocks are the ones this
 * microphase changes.
 */
const DEMO_DESTINATIONS = [
  ...bioLinks.map((link) => link.href),
  'mailto:estudio@olmo.photo',
  'https://olmo.photo/portfolio.pdf',
];

/**
 * Destinations that still leak from blocks this microphase does NOT own — the
 * `whatsapp`, `social` and `contact` blocks, and the portfolio hero's
 * `#proyectos`. They are asserted below so the gap is recorded rather than
 * silently dropped; each is out of 4C-1's declared scope and is reported as a
 * pending difference instead of being fixed here.
 */
const DEMO_DESTINATIONS_4C2 = [
  'https://wa.me/34600000000',
  'https://wa.me/34910000000',
  'https://instagram.com/marinasole',
  'https://instagram.com/olmoestudio',
  'mailto:estudio@olmo.photo',
  'mailto:hola@tudominio.com',
  '#proyectos',
];

/* Kept only as historical context in the surrounding 4C-1 notes. */
const OUT_OF_SCOPE_LEAKS: Record<string, string[]> = {
  // `panelSurface`/channel blocks carry the persona's own number.
  'https://wa.me/34600000000': ['warm_care', 'soft_beauty', 'personal_brand', 'local_friendly'],
  // The social block draws the persona's own profiles.
  'https://instagram.com/marinasole': ['personal_brand'],
  'https://instagram.com/olmoestudio': ['bold_creative'],
  'mailto:estudio@olmo.photo': ['bold_creative'],
};

/** Mounts the document in the editor and exposes what the editor can select. */
function editableDocument(document: unknown) {
  const host = globalThis.document.createElement('div');
  globalThis.document.body.append(host);
  const root = createRoot(host);
  let editor: ReturnType<typeof useEditor> | null = null;
  function Probe() {
    editor = useEditor();
    return null;
  }
  act(() => {
    root.render(
      <EditorProvider initialDocument={hydrateMagicEditorState(document)}>
        <TemplateRenderer />
        <Probe />
      </EditorProvider>,
    );
  });
  const api = editor as ReturnType<typeof useEditor> | null;
  return {
    element: (id: string): HTMLElement | null => api?.getElement(id) ?? null,
    close: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

/** The families that actually carry each of the two blocks. */
const FAMILIES_WITH_IMAGE_CARDS = templates.filter((family) =>
family.sections.some((section) => section.block === 'imageCards'));

describe('Microfase 4C-1 · ImageCards draws the pack, not another trade', () => {
  it('1) no family draws a placeholder photo from another trade', { timeout: 30_000 }, () => {
    templates.forEach((family) => {
      const html = renderDocument(generated(family.id));
      const surface = surfaceOf(html);
      FOREIGN_PHOTOS.forEach((photo) => {
        expect(surface, `${family.id} still shows the placeholder photo ${photo}`).not.toContain(photo);
      });
    });
  });

  it('2) every image card belongs to the pack its family resolves to', () => {
    expect(FAMILIES_WITH_IMAGE_CARDS.length, 'no family declares an imageCards section').toBeGreaterThan(0);
    FAMILIES_WITH_IMAGE_CARDS.forEach((family) => {
      const pageDocument = generated(family.id);
      const html = renderDocument(pageDocument);
      const pack = contentForPack(family, 'restaurant');
      const declared = pack.imageCards.map((card) => card.image).filter((src) => src !== '');
      const block = pageDocument.blocks.find((b) => b.type === 'imageCards')!;
      const drawn = imageCardPhotos(html, block.key);
      // The block draws exactly the pack's own list, never another trade's photo.
      expect(drawn, `${family.id} draws the wrong photos`).toEqual(declared);
      drawn.forEach((src) => {
        expect(declared, `${family.id} draws "${src}", which its pack does not declare`).toContain(src);
      });
      FOREIGN_PHOTOS.forEach((photo) => {
        expect(drawn, `${family.id} draws the placeholder ${photo}`).not.toContain(photo);
      });
    });
  });

  it('3) the generated document declares the cards and their pictures', () => {
    const pageDocument = generated('dark_craft');
    const block = pageDocument.blocks.find((b) => b.type === 'imageCards');
    expect(block, 'dark_craft declares no imageCards section').toBeTruthy();
    const pack = contentForPack(getTemplate('dark_craft'), 'restaurant');
    expect(pageDocument.props[`block:${block!.key}`]?.['items']).toBe('0,1,2');
    pack.imageCards.forEach((card, index) => {
      expect(pageDocument.props[imageCardId(block!.key, String(index))]?.['src'], `card ${index}`).
      toBe(card.image);
    });
  });

  it('4) a pack with no picture leaves the block empty rather than borrowing one', () => {
    /** A hand-built document: an image-cards block, an origin, and nothing else. */
    const document = serializeMagicEditorState({
      templateId: 'business',
      doc: {
        blocks: [{ key: 'imageCards', type: 'imageCards' }],
        texts: {},
        textStyles: {},
        props: { page: { contentOrigin: 'business-context' }, 'block:imageCards': { items: '0' } },
        removed: {},
      },
    });
    const html = renderDocument(document);
    const root = parsed(html).querySelector('[data-editor-id^="imageCards/item."]');
    // The card is still drawn — and still editable — but with no foreign photo.
    expect(root, 'the empty card was not drawn').not.toBeNull();
    expect(imageCardPhotos(html, 'imageCards')).toEqual([]);
    FOREIGN_PHOTOS.forEach((photo) => {
      expect(surfaceOf(html)).not.toContain(photo);
    });
  });
});

describe('Microfase 4C-1 · a generated page publishes no demo link', () => {
  it('5) no generated page renders a demo destination through the blocks 4C-1 owns', { timeout: 30_000 }, () => {
    /**
     * The blocks this microphase owns: `links` on a bio page, and the portfolio
     * template's own contact CTAs. A leak from any other block is a different
     * phase's defect and is pinned by the next test, not asserted here.
     */
    templates.forEach((family) => {
      const pageDocument = generated(family.id);
      const html = renderDocument(pageDocument);
      const rendered = destinations(html);
      const group = buttonGroupOf(html, 'links');

      if (pageDocument.blocks.some((b) => b.type === 'links')) {
        expect(group, `${family.id} did not render its links block`).not.toBeNull();
        // Inside the collection 4C-1 owns, no demo destination may survive.
        const inGroup = Array.from(group!.querySelectorAll('a[href]')).
        map((a) => a.getAttribute('href') ?? '');
        DEMO_DESTINATIONS.forEach((href) => {
          expect(inGroup, `${family.id} links still point at ${href}`).not.toContain(href);
        });
      }

      // The portfolio's own `links` block is the other one this phase owns; no
      // generated portfolio family declares one, and its hardcoded demo CTAs
      // must not appear if one ever does.
      const linksGroup = buttonGroupOf(html, 'links');
      const ownedLinks = linksGroup ? linksGroup.outerHTML : '';
      expect(ownedLinks, `${family.id} links carry the portfolio demo contact email`).
      not.toContain('estudio@olmo.photo');
      expect(ownedLinks, `${family.id} links carry the portfolio demo PDF`).
      not.toContain('olmo.photo/portfolio.pdf');

      /**
       * The bio persona's own handle never appears through the block 4C-1 owns.
       * `personal_brand` still draws her profiles in the *social* block, which
       * is a later phase — recorded by the next test, not asserted here.
       */
      const ownedSurface = group ? group.outerHTML : '';
      ['marinasole', 'olmoestudio', 'andresolmo'].forEach((needle) => {
        expect(ownedSurface, `${family.id} links still show "${needle}"`).not.toContain(needle);
      });
    });
  });

  it('5b) no generated family publishes a fictitious conversion destination', { timeout: 30_000 }, () => {
    // 4C-2 owns the complete generated conversion surface, so every known
    // demo destination is forbidden regardless of the block that emitted it.
    templates.forEach((family) => {
      const rendered = destinations(renderDocument(generated(family.id)));
      DEMO_DESTINATIONS_4C2.forEach((href) => {
        expect(rendered, `${family.id} still publishes ${href}`).not.toContain(href);
      });
    });
  });

  it('6) the personal_brand links collection publishes nothing, and never a "#"', () => {
    const html = renderDocument(generated('personal_brand'));
    const group = buttonGroupOf(html, 'links');
    expect(group, 'the links block did not render').not.toBeNull();
    // No button is published, so the group holds no anchor at all.
    expect(group!.querySelectorAll('a[href]')).toHaveLength(0);
    // And the authoring-only empty note is not shown to a visitor.
    expect(group!.querySelector('[data-button-group-empty]')).toBeNull();
    expect(destinations(html)).not.toContain('#');
  });

  it('7) the portfolio links block publishes no destination the business never declared', () => {
    /**
     * No generated family declares a `links` section on a portfolio page, so the
     * template's own hardcoded CTAs (`mailto:estudio@olmo.photo`, the demo PDF)
     * are unreachable from a generated document — this pins that contract, and
     * the block itself so a later family that adds one cannot reintroduce them.
     */
    templates.filter((family) => family.pageFamily === 'portfolio').forEach((family) => {
      const pageDocument = generated(family.id);
      expect(pageDocument.blocks.some((b) => b.type === 'links'), family.id).toBe(false);
      const html = renderDocument(pageDocument);
      /**
       * The demo contact destinations reach a portfolio page only through its
       * social/persona blocks, never through `links`; the assertion is scoped to
       * the block this phase owns. `bold_creative` still draws the persona's
       * email in its *social* block — recorded by test 5b.
       */
      const linksGroup = buttonGroupOf(html, 'links');
      expect(linksGroup, `${family.id} unexpectedly declares a links block`).toBeNull();
    });

    // And if such a block were on the page, its own demo copy is what it draws
    // only for a document that declares no origin — never for a generated one.
    const generatedWithLinks = serializeMagicEditorState({
      templateId: 'portfolio',
      doc: {
        blocks: [{ key: 'links', type: 'links' }],
        texts: {},
        textStyles: {},
        props: { page: { contentOrigin: 'business-context' } },
        removed: {},
      },
    });
    const generatedHtml = renderDocument(generatedWithLinks);
    const generatedLinks = buttonGroupOf(generatedHtml, 'links');
    const generatedOwned = generatedLinks ? generatedLinks.outerHTML : '';
    expect(generatedOwned).not.toContain('estudio@olmo.photo');
    expect(generatedOwned).not.toContain('olmo.photo/portfolio.pdf');
    // A document that declares no origin keeps the template's own demo CTAs.
    const handmadeLinks = serializeMagicEditorState({
      templateId: 'portfolio',
      doc: {
        blocks: [{ key: 'links', type: 'links' }],
        texts: {},
        textStyles: {},
        props: {},
        removed: {},
      },
    });
    expect(destinations(renderDocument(handmadeLinks))).toContain('mailto:estudio@olmo.photo');
  });

  it('8) a destination the owner declares is the one the visitor gets', () => {
    /** Exactly what a valid destination has always produced, with no drift. */
    const document = serializeMagicEditorState({
      templateId: 'bio',
      doc: {
        blocks: [{ key: 'links', type: 'links' }],
        texts: { 'links.0.label': 'Reservar mesa' },
        textStyles: {},
        props: {
          page: { contentOrigin: 'business-context' },
          'block:links': { buttonGroupInitialized: '1', buttonGroupOrder: 'legacy-0' },
          'links.legacy-0': { label: 'Reservar mesa', href: 'https://cocinaaurora.es/reservar' },
        },
        removed: {},
      },
    });
    const rendered = destinations(renderDocument(document));
    expect(rendered).toContain('https://cocinaaurora.es/reservar');
  });

  it('9) an unusable destination renders no href — never "", never "#"', () => {
    const withHref = (href: string) =>
      renderDocument(serializeMagicEditorState({
        templateId: 'bio',
        doc: {
          blocks: [{ key: 'links', type: 'links' }],
          texts: { 'links.0.label': 'Escríbeme' },
          textStyles: {},
          props: {
            'block:links': { buttonGroupInitialized: '1', buttonGroupOrder: 'legacy-0' },
            'links.legacy-0': { label: 'Escríbeme', href },
          },
          removed: {},
        },
      }));
    /**
     * Each of these is a state the editor can store and a visitor must not be
     * sent to: the button stays on the page, but it is not a link.
     */
    ['', '#', 'https://', '   '].forEach((href) => {
      const html = withHref(href);
      expect(destinations(html), `"${href}" rendered as a destination`).not.toContain(href);
      expect(destinations(html), `"${href}" produced a dead link`).not.toContain('#');
    });
  });

  it('9b) an explicit owner WhatsApp destination survives generated rendering', () => {
    const document = generated('professional_trust') as MagicPageDocumentV1;
    document.blocks = [...document.blocks, { key: 'whatsapp', type: 'whatsapp' }];
    document.props['whatsapp.action'] = { href: 'https://wa.me/34611111111' };
    const rendered = destinations(renderDocument(document));
    expect(rendered).toContain('https://wa.me/34611111111');
    expect(rendered).not.toContain('https://wa.me/34600000000');
  });

  it('9c) a generated service CTA has no WhatsApp href until the owner supplies one', () => {
    const document = generated('professional_trust') as MagicPageDocumentV1;
    document.blocks = [...document.blocks, { key: 'collection', type: 'collection' }];
    document.props['collection.0.cta'] = { href: '' };
    const html = renderDocument(document);
    expect(destinations(html)).not.toContain('https://wa.me/34910000000');
    expect(parsed(html).querySelector('[href=""]')).toBeNull();
    expect(html).toContain('data-editor-id="collection.0.cta"');
  });

  it('9d) explicit generated email and social destinations survive hydration', () => {
    const document = generated('personal_brand') as MagicPageDocumentV1;
    document.props['social.0'] = { href: 'https://instagram.com/cocinaaurora' };
    document.props['block:links'] = {
      buttonGroupInitialized: '1',
      buttonGroupOrder: 'legacy-0',
    };
    document.props['links.legacy-0'] = { href: 'mailto:reservas@cocinaaurora.es' };
    const wire = JSON.parse(JSON.stringify(document));
    // Hydration returns the editor state `{ templateId, doc }`, not the
    // public MagicPageDocumentV1. Re-serialize that state before rendering.
    const hydratedState = hydrateMagicEditorState(wire);
    const hydratedDocument = serializeMagicEditorState(hydratedState);
    const rendered = destinations(renderDocument(hydratedDocument));
    expect(rendered).toContain('https://instagram.com/cocinaaurora');
    expect(rendered).toContain('mailto:reservas@cocinaaurora.es');
  });
});

describe('Microfase 4C-1 · the fields stay editable and survive a round trip', () => {
  it('10) the declared blocks stay reachable from the editor', () => {
    const editor = editableDocument(generated('personal_brand'));
    // `Block` registers itself as `block:<key>`; the links block is on the page
    // even though it declares no button, so the owner can reach it and add one.
    expect(editor.element('block:links'), 'the links block is not selectable').not.toBeNull();
    editor.close();

    const cardEditor = editableDocument(generated('dark_craft'));
    const cardId = imageCardId('imageCards', '0');
    expect(cardEditor.element('block:imageCards'), 'the image-cards block is not selectable').not.toBeNull();
    expect(cardEditor.element(cardId), 'the first card is not selectable').not.toBeNull();
    // Carrying the pack's own photo, which the author replaces from the panel.
    expect(cardEditor.element(cardId)?.outerHTML ?? '').toContain(
      contentForPack(getTemplate('dark_craft'), 'restaurant').imageCards[0]!.image,
    );
    cardEditor.close();
  });

  it('11) the declared cards, pictures and empty collection survive serialize and hydrate', () => {
    const pageDocument = generated('dark_craft');
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
    const block = pageDocument.blocks.find((b) => b.type === 'imageCards')!;
    expect(hydrated.props[`block:${block.key}`]?.['items']).toBe('0,1,2');
    expect(hydrated.props[imageCardId(block.key, '1')]?.['src']).
    toBe(contentForPack(getTemplate('dark_craft'), 'restaurant').imageCards[1]!.image);

    const links = generated('personal_brand');
    const linksWire = JSON.parse(JSON.stringify(links));
    const linksHydrated = serializeMagicEditorState({
      templateId: 'bio',
      doc: {
        blocks: linksWire.blocks,
        texts: linksWire.texts,
        textStyles: linksWire.textStyles,
        props: linksWire.props,
        removed: linksWire.removed,
      },
    });
    expect(linksHydrated.props['block:links']?.['buttonGroupInitialized']).toBe('1');
    expect(linksHydrated.props['block:links']?.['buttonGroupOrder']).toBe('');
  });
});

describe('Microfase 4C-1 · documents that declare no origin keep the demo', () => {
  it('12) a hand-made page keeps the placeholder photos and the demo links', () => {
    const handmade = serializeMagicEditorState({
      templateId: 'bio',
      doc: {
        blocks: [
          { key: 'links', type: 'links' },
          { key: 'imageCards', type: 'imageCards' },
        ],
        texts: {},
        textStyles: {},
        props: {},
        removed: {},
      },
    });
    const html = renderDocument(handmade);
    // The default slots the block falls back to, with the editor's own photos.
    expect(imageCardPhotos(html, 'imageCards').length).toBe(IMAGE_CARDS_DEFAULT_ITEMS.length);
    // And the bio page's curated demo destinations are exactly as they were.
    const rendered = destinations(html);
    bioLinks.forEach((link) => {
      expect(rendered, `the demo link ${link.href} is gone`).toContain(link.href);
    });
  });
});
