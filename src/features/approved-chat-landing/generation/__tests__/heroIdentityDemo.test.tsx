// @vitest-environment happy-dom
/**
 * Microfase 4B · no generated hero draws another person's identity.
 *
 * The editor ships with two demo personas: the bio template's author and the
 * portfolio template's photographer. Their name, their trade, their studio and
 * their city live in `data/bioContent.ts` and `data/portfolioContent.ts` and are
 * passed straight to the hero as slot *values*, so they render on any page whose
 * document does not declare its own — which is exactly what a page generated
 * from the conversational Business Context is.
 *
 * Two subsystems meet here, and each half can be green on its own while the page
 * still shows the demo: the generator could write a real value to an id nothing
 * reads, and the renderer could read the right id with the demo fallback. So
 * these tests feed the *generated* document, unchanged, into
 * `MagicPublicRenderer` — the component the public routes mount — and assert what
 * a visitor actually gets. The last groups do the opposite: they render a
 * document that declares no origin, which is every page made by hand, and pin
 * the demo it must keep; and one group proves the emptied slots stay reachable
 * from the editor.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateMagicPageDocument } from '../magicPageDocument';
import { MagicPublicRenderer } from '../../../magic-page-editor-production/MagicPublicRenderer';
import { hydrateMagicEditorState, serializeMagicEditorState } from '../../../magic-page-editor-production/magic-document';
import { EditorProvider, useEditor } from '../../../../isolated/magic-page-editor/contexts/EditorContext';
import { TemplateRenderer } from '../../../../isolated/magic-page-editor/components/templates/TemplateRenderer';
import { bioProfile } from '../../../../isolated/magic-page-editor/data/bioContent';
import { pfProfile } from '../../../../isolated/magic-page-editor/data/portfolioContent';
import { createBusinessContextStore } from '../../state/businessContext';
import { templates } from '../../data/templates';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

const BUSINESS_NAME = 'Cocina Aurora';
const BUSINESS_ABOUT = 'Pastas frescas hechas en casa.';

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
  store.patch({ name: BUSINESS_NAME, type: 'restaurant', description: BUSINESS_ABOUT });
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

/** The whole page surface: text and attributes, so an `alt` counts too. */
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

/**
 * Every identity string the editor's two demo personas put on a hero. Read from
 * the data files themselves rather than retyped, so the list cannot drift from
 * the demo it is meant to catch.
 */
const DEMO_IDENTITY = [
  bioProfile.name,
  bioProfile.role,
  bioProfile.script,
  bioProfile.bio,
  pfProfile.studio,
  pfProfile.place,
  pfProfile.kicker,
  pfProfile.title,
];

/** The two media descriptions the templates carry for their own demo photo. */
const DEMO_MEDIA_ALT = ['Costa mediterránea al atardecer', 'Muro curvo de hormigón iluminado por el sol'];

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
    /** The element the editor registers for `id`, or null when the page draws none. */
    element: (id: string): HTMLElement | null => api?.getElement(id) ?? null,
    close: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

describe('Microfase 4B · a generated hero declares its own identity', () => {
  it('1) none of the 12 families draws another person\'s identity', { timeout: 30_000 }, () => {
    templates.forEach((family) => {
      const surface = surfaceOf(renderDocument(generated(family.id)));
      [...DEMO_IDENTITY, ...DEMO_MEDIA_ALT].forEach((needle) => {
        expect(surface, `${family.id} still shows "${needle}"`).not.toContain(needle);
      });
    });
  });

  it('2) the four families that drew it carry none of the demo names, studios or places', () => {
    ['personal_brand', 'minimal_premium', 'bold_creative', 'visual_portfolio'].forEach((id) => {
      const html = renderDocument(generated(id as TemplateId));
      const surface = surfaceOf(html);
      ['Marina Solé', 'Andrés Olmo', 'Olmo Estudio', 'Madrid'].forEach((needle) => {
        expect(surface, `${id} still shows "${needle}"`).not.toContain(needle);
      });
      // And no role, trade or motto of either persona survives in an attribute.
      ['Creadora · Viajes lentos', 'Menos prisa, más lugar', 'Fotografía de arquitectura'].forEach((needle) => {
        expect(surface, `${id} still shows "${needle}"`).not.toContain(needle);
      });
      // The avatar is not announced as somebody else.
      Array.from(parsed(html).querySelectorAll('img[alt]')).forEach((img) => {
        const alt = img.getAttribute('alt') ?? '';
        expect(DEMO_IDENTITY, `${id} announces the avatar as "${alt}"`).not.toContain(alt);
      });
    });
  });

  it('3) the business\'s own name and description stay visible where the document declares them', { timeout: 30_000 }, () => {
    templates.forEach((family) => {
      const pageDocument = generated(family.id);
      const surface = surfaceOf(renderDocument(pageDocument));
      /**
       * The generator's own contract: a bio page names the owner in `hero.name`,
       * every other page family in `hero.title`. Whatever it declares is what a
       * visitor must see — the demo must not have displaced the real owner.
       */
      const declaredName = family.pageFamily === 'bio' ?
      pageDocument.texts['hero.name'] :
      pageDocument.texts['hero.title'];
      expect(declaredName, `${family.id} declares no owner name`).toBe(BUSINESS_NAME);
      expect(surface, `${family.id} lost the business name`).toContain(BUSINESS_NAME);

      /**
       * And the description the owner gave, where the generator declares it on
       * the hero (`hero.text` for business, `hero.bio` for bio). A portfolio
       * hero has no description slot, so its owner text goes to the statement
       * block instead and is not asserted here.
       */
      const declaredAbout = pageDocument.texts['hero.text'] ?? pageDocument.texts['hero.bio'];
      if (declaredAbout) {
        expect(surface, `${family.id} lost the business description`).toContain(declaredAbout);
      }
    });
  });

  it('4) the emptied slots stay reachable from the editor, and stay empty', () => {
    /** The slots each of the four families actually draws, per its own variant. */
    const slots: Record<string, string[]> = {
      personal_brand: ['hero.role', 'hero.script'],
      visual_portfolio: ['hero.kicker', 'hero.studio', 'hero.place'],
      // The minimalPremium and collage compositions render no decor row, so their
      // header label is the only slot of the three they put on the page.
      minimal_premium: ['hero.kicker'],
      bold_creative: ['hero.kicker'],
    };
    Object.entries(slots).forEach(([id, ids]) => {
      const editor = editableDocument(generated(id as TemplateId));
      ids.forEach((textId) => {
        const element = editor.element(textId);
        expect(element, `${id} does not draw ${textId}`).not.toBeNull();
        // Reachable, but carrying no invented identity.
        expect(element?.textContent, `${id} wrote demo copy into ${textId}`).toBe('');
      });
      editor.close();
    });
  });

  it('5) a declared identity survives serialize and hydrate, and then draws', () => {
    const pageDocument = generated('personal_brand');
    pageDocument.texts['hero.role'] = 'Fotógrafa de naturaleza';
    pageDocument.texts['hero.script'] = 'Despacio';
    const wire = JSON.parse(JSON.stringify(pageDocument));
    const hydrated = serializeMagicEditorState({
      templateId: 'bio',
      doc: {
        blocks: wire.blocks,
        texts: wire.texts,
        textStyles: wire.textStyles,
        props: wire.props,
        removed: wire.removed,
      },
    });
    expect(hydrated.texts['hero.role']).toBe('Fotógrafa de naturaleza');
    expect(hydrated.texts['hero.script']).toBe('Despacio');
    const surface = surfaceOf(renderDocument(pageDocument));
    expect(surface).toContain('Fotógrafa de naturaleza');
    expect(surface).toContain('Despacio');
    // And the demo is still gone once the owner has declared their own.
    expect(surface).not.toContain(bioProfile.role);
    expect(surface).not.toContain(bioProfile.script);
  });
});

describe('Microfase 4B · documents that declare no origin keep the demo identity', () => {
  /** A page made by hand: the template's own hero, no declared copy, no origin. */
  function handmade(templateId: 'bio' | 'portfolio', variant: string) {
    return serializeMagicEditorState({
      templateId,
      doc: {
        blocks: [{ key: 'hero', type: 'hero' }],
        texts: {},
        textStyles: {},
        props: { 'block:hero': { variant } },
        removed: {},
      },
    });
  }

  it('6) the bio and portfolio demos render exactly as before', () => {
    const bio = surfaceOf(renderDocument(handmade('bio', 'sideBleed')));
    expect(bio).toContain(bioProfile.name);
    expect(bio).toContain(bioProfile.role);
    expect(bio).toContain(bioProfile.script);
    expect(bio).toContain(bioProfile.bio);

    const portfolio = surfaceOf(renderDocument(handmade('portfolio', 'galleryFrame')));
    expect(portfolio).toContain(pfProfile.kicker);
    expect(portfolio).toContain(pfProfile.studio);
    expect(portfolio).toContain(pfProfile.place);

    // The media and avatar descriptions the demo ships with are untouched.
    const bioHtml = parsed(renderDocument(handmade('bio', 'sideBleed')));
    expect(bioHtml.querySelector('img[alt="Costa mediterránea al atardecer"]')).not.toBeNull();
    expect(bioHtml.querySelector('img[alt="Marina Solé"]')).not.toBeNull();
    const portfolioHtml = parsed(renderDocument(handmade('portfolio', 'galleryFrame')));
    expect(portfolioHtml.querySelector('img[alt="Muro curvo de hormigón iluminado por el sol"]')).not.toBeNull();
    expect(portfolioHtml.querySelector('img[alt="Andrés Olmo"]')).not.toBeNull();
  });
});
