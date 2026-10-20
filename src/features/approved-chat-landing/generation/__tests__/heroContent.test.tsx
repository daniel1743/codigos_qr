// @vitest-environment happy-dom
/**
 * Microfase 3A · the hero draws the document's content.
 *
 * Two subsystems meet here: the generator writes the copy and the media into the
 * document, and the hero renderer decides what a page shows when a slot is
 * empty. Each half can be green on its own while the page still shows the
 * `business` template's clinic sample — the generator could write to an id
 * nothing reads, and the renderer could read the right id with the wrong
 * fallback.
 *
 * So these tests feed the *generated* document, unchanged, into
 * `MagicPublicRenderer` — the component the public routes mount — and assert
 * what a visitor actually gets. The last group does the opposite: it renders a
 * document that declares no origin, which is every page made by hand, and pins
 * the demo it must keep.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateMagicPageDocument, PLACEHOLDER_BUSINESS_NAME } from '../magicPageDocument';
import { MagicPublicRenderer } from '../../../magic-page-editor-production/MagicPublicRenderer';
import { serializeMagicEditorState } from '../../../magic-page-editor-production/magic-document';
import { createBusinessContextStore } from '../../state/businessContext';
import { getTemplate, resolveContent } from '../../utils/templates';
import { images } from '../../../../isolated/magic-page-editor/data/images';
import {
  BUSINESS_CONTEXT_ORIGIN,
  CONTENT_ORIGIN_KEY,
  isBusinessContextContent } from
'../../../../isolated/magic-page-editor/utils/contentOrigin';
import { templates } from '../../data/templates';
import type { BusinessContext, ContextPatch, TemplateId } from '../../types/cripqer';

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

function contextWith(patch: ContextPatch): BusinessContext {
  const store = createBusinessContextStore();
  store.patch(patch);
  return store.get();
}

/** The restaurant the conversational flow describes. */
function restaurant(): BusinessContext {
  return contextWith({ name: 'Cocina Aurora', type: 'restaurant', description: 'Pastas frescas hechas en casa.' });
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

/** The hero subtree only: the other blocks are outside this microphase. */
function heroOf(html: string): Element {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const hero = parsed.querySelector('[data-hero="fullBleed"]');
  expect(hero, 'food_story did not render the fullBleed hero').not.toBeNull();
  return hero!;
}

function heroImages(html: string): HTMLImageElement[] {
  return Array.from(heroOf(html).querySelectorAll('img')) as HTMLImageElement[];
}

/**
 * Every string the clinic sample puts on the hero. A generated page of another
 * industry must carry none of them.
 */
const CLINIC_COPY = [
  'Áurea',
  'estética avanzada',
  'Barcelona',
  'Desde 2016',
  'Tu piel',
  'Tratamientos faciales',
  'Reservar valoración',
  'Ver tratamientos',
  'Carmen Vidal',
  'Directora médica',
  'clinicaaurea',
  '34910000000',
  'Recepción de Clínica',
];

describe('Microfase 3A · a generated hero draws the document, not the demo', () => {
  it('1) food_story shows the restaurant the business context describes', () => {
    const hero = heroOf(renderDocument(generated('food_story')));
    expect(hero.textContent).toContain('Cocina Aurora');
    expect(hero.textContent).toContain('Pastas frescas hechas en casa.');
  });

  it('2) the hero carries no clinic reference at all', () => {
    const hero = heroOf(renderDocument(generated('food_story')));
    // Text and attributes: an alt or an href is a reference too.
    const attributes = Array.from(hero.querySelectorAll('*')).
    flatMap((el) => Array.from(el.attributes).map((attribute) => attribute.value)).
    join(' ');
    const surface = `${hero.textContent ?? ''} ${attributes}`;
    CLINIC_COPY.forEach((needle) => {
      expect(surface, `the hero still shows "${needle}"`).not.toContain(needle);
    });
  });

  it('3) the hero draws the family own cover photo, not the clinic one', () => {
    const context = restaurant();
    const pageDocument = generated('food_story', context);
    const declared = resolveContent(getTemplate('food_story'), context).images.hero;
    expect(declared).not.toBe(images.bizClinic);
    expect(pageDocument.props['block:hero']?.['src']).toBe(declared);
    expect(pageDocument.props['avatar']?.['src']).toBe(
      resolveContent(getTemplate('food_story'), context).images.portrait,
    );
    expect(heroImages(renderDocument(pageDocument))[0]?.getAttribute('src')).toBe(declared);
  });

  it('4) the action says what the business can be reached for, with no invented link', () => {
    const pageDocument = generated('food_story', contextWith({ name: 'Cocina Aurora', type: 'restaurant', channel: 'whatsapp', goal: 'orders' }));
    expect(pageDocument.texts['hero.cta.label']).toBe('Pedir por WhatsApp');
    const anchors = Array.from(heroOf(renderDocument(pageDocument)).querySelectorAll('a'));
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.textContent).toContain('Pedir por WhatsApp');
    // The Business Context holds the channel, never a URL: an action with no
    // destination is drawn without an href rather than pointing at the clinic.
    expect(anchors[0]!.hasAttribute('href')).toBe(false);
  });

  it('5) a partial business context falls back to defined, neutral content', () => {
    const pageDocument = generated('food_story', contextWith({}));
    expect(pageDocument.texts['hero.title']).toBe(PLACEHOLDER_BUSINESS_NAME);
    // The action copy is the family's own declared pack copy — the same button
    // the approved preview draws — not a clinic label and not an invented one.
    expect(pageDocument.texts['hero.cta.label']).toBe('Pedir por WhatsApp');
    const hero = heroOf(renderDocument(pageDocument));
    expect(hero.textContent).toContain(PLACEHOLDER_BUSINESS_NAME);
    // The action is still drawn — it is the family's own — but with no
    // destination it is an element, not a link.
    const anchors = Array.from(hero.querySelectorAll('a'));
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.hasAttribute('href')).toBe(false);
    CLINIC_COPY.forEach((needle) => {
      expect(hero.textContent, `the hero still shows "${needle}"`).not.toContain(needle);
    });
  });

  it('6) the declared copy and media survive serialize and hydrate', () => {
    const pageDocument = generated('food_story');
    const wire = JSON.parse(JSON.stringify(pageDocument));
    const hydrated = serializeMagicEditorState({ templateId: 'business', doc: {
        blocks: wire.blocks,
        texts: wire.texts,
        textStyles: wire.textStyles,
        props: wire.props,
        removed: wire.removed } });
    expect(hydrated.texts['hero.title']).toBe('Cocina Aurora');
    expect(hydrated.texts['hero.text']).toBe('Pastas frescas hechas en casa.');
    expect(hydrated.texts['hero.cta.label']).toBe('Pedir por WhatsApp');
    expect(hydrated.props['block:hero']?.['src']).toBe(pageDocument.props['block:hero']?.['src']);
    expect(hydrated.props['avatar']?.['src']).toBe(pageDocument.props['avatar']?.['src']);
    expect(isBusinessContextContent(hydrated.props['page'])).toBe(true);
  });

  it('7) the public render reads the document: new copy, new hero', () => {
    const edited = generated('food_story');
    edited.texts['hero.title'] = 'Trattoria Nueva';
    expect(heroOf(renderDocument(edited)).textContent).toContain('Trattoria Nueva');
  });

  it('8) a stored href renders once the owner attaches one', () => {
    const pageDocument = generated('food_story');
    const withLink = {
      ...pageDocument,
      props: { ...pageDocument.props, 'hero.cta': { href: 'https://wa.me/56900000000' } } };
    const anchors = Array.from(heroOf(renderDocument(withLink)).querySelectorAll('a'));
    expect(anchors[0]!.getAttribute('href')).toBe('https://wa.me/56900000000');
  });

  it('9) every family declares the same hero props, and nothing extra', () => {
    templates.forEach((family) => {
      const hero = generated(family.id).props['block:hero']!;
      // The four keys the engine vocabulary always produced, plus the declared
      // media (3A) and the one opt-in key only the centered family writes (2A).
      // A per-family key added here would fail this line.
      const expected = family.hero.variant === 'fullBleed' ?
      ['contentAlign', 'fusion', 'height', 'overlay', 'src', 'variant'] :
      ['fusion', 'height', 'overlay', 'src', 'variant'];
      expect(Object.keys(hero).sort(), family.id).toEqual(expected);
      expect(hero['variant'], family.id).toBe(family.hero.variant);
      expect(hero['height'], family.id).toBe(family.hero.height);
      expect(hero['overlay'], family.id).toBe(family.hero.overlay);
      expect(hero['fusion'], family.id).toBe(family.hero.fusion);
      expect(hero['src'], family.id).toBe(resolveContent(family, restaurant()).images.hero);
    });
  });

  it('10) the origin is a document declaration, not an editor control', () => {
    const pageDocument = generated('food_story');
    expect(pageDocument.props['page']?.[CONTENT_ORIGIN_KEY]).toBe(BUSINESS_CONTEXT_ORIGIN);
    expect(isBusinessContextContent(pageDocument.props['page'])).toBe(true);
    expect(isBusinessContextContent(undefined)).toBe(false);
    expect(isBusinessContextContent({})).toBe(false);
    // A hand-made page cannot reach it: nothing writes the key, and the value it
    // would have to guess is not a palette token anyone picks.
    expect(isBusinessContextContent({ [CONTENT_ORIGIN_KEY]: 'clinic' })).toBe(false);
  });
});

describe('Microfase 3A · documents that declare no origin keep the demo', () => {
  /**
   * The shape of a page made by hand in the editor: fullBleed, no declared copy
   * and — like every page published before 2A — no `contentAlign`.
   */
  function handmade(heroProps: Record<string, string> = {}) {
    return serializeMagicEditorState({
      templateId: 'business',
      doc: {
        blocks: [{ key: 'hero', type: 'hero' }],
        texts: {},
        textStyles: {},
        props: { 'block:hero': { variant: 'fullBleed', height: 'L', overlay: 'medium', fusion: 'none', ...heroProps } },
        removed: {} } });
  }

  it('11) the clinic sample still renders, exactly as before', () => {
    const html = renderDocument(handmade());
    const hero = heroOf(html);
    ['Áurea', 'Tu piel', 'Reservar valoración', 'Ver tratamientos', 'Carmen Vidal'].forEach((needle) => {
      expect(hero.textContent, `the demo lost "${needle}"`).toContain(needle);
    });
    expect(heroImages(html)[0]?.getAttribute('src')).toBe(images.bizClinic);
    expect(heroImages(html)[1]?.getAttribute('src')).toBe(images.bizPortrait);
    // Actions and handles: the demo's own destinations, hrefs included.
    const hrefs = Array.from(hero.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([
      'https://wa.me/34910000000',
      '#tratamientos',
      'https://instagram.com/clinicaaurea',
      'https://wa.me/34910000000',
      'https://clinicaaurea.es',
    ]);
  });

  it('12) the demo page and the generated page differ in copy and media, not in composition', () => {
    // Same alignment declared on both sides, so what is compared is the
    // composition and nothing else.
    const demo = heroOf(renderDocument(handmade({ contentAlign: 'center' })));
    const page = heroOf(renderDocument(generated('food_story')));
    expect(page.getAttribute('data-hero')).toBe(demo.getAttribute('data-hero'));
    expect(page.getAttribute('data-shape')).toBe(demo.getAttribute('data-shape'));
    const copyBlock = (hero: Element) =>
    Array.from(hero.querySelectorAll('div')).find((el) => el.className.includes('max-w-[760px]'));
    expect(copyBlock(page)!.className).toBe(copyBlock(demo)!.className);
    expect(page.textContent).not.toBe(demo.textContent);
  });
});
