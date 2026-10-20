// @vitest-environment happy-dom
/**
 * Microfase 2A · the seam, end to end.
 *
 * `contentAlign` is written by the generator and read by the hero renderer, in
 * two different subsystems that never import each other. Two passing halves do
 * not prove the seam: the generator could write the key to a prop scope nobody
 * reads, and the renderer could read the right key from the wrong id, and every
 * unit test would still be green while the food_story page stayed left-aligned.
 *
 * So this file feeds the *generated* document, unchanged, into
 * `MagicPublicRenderer` — the component the public routes mount — and asserts
 * the composition a visitor actually gets.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { generateMagicPageDocument } from '../magicPageDocument';
import { MagicPublicRenderer } from '../../../magic-page-editor-production/MagicPublicRenderer';
import { serializeMagicEditorState } from '../../../magic-page-editor-production/magic-document';
import { createBusinessContextStore } from '../../state/businessContext';
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

function context(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Cocina Aurora', type: 'restaurant', description: 'Pastas frescas hechas en casa.' });
  return store.get();
}

/** The document the conversational flow hands to the editor, rendered as public. */
function renderFamily(id: TemplateId): string {
  return renderPublic(generateMagicPageDocument({ businessContext: context(), selectedTemplateId: id }));
}

function renderPublic(pageDocument: unknown): string {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(<MagicPublicRenderer document={pageDocument as never} />);
  });
  const html = host.innerHTML;
  act(() => root.unmount());
  host.remove();
  return html;
}

/**
 * A page made by hand in the editor: fullBleed, centered by 2A, and declaring
 * no `contentOrigin` — so the hero still draws the template's own demo rows.
 */
function handmadeDocument() {
  return serializeMagicEditorState({
    templateId: 'business',
    doc: {
      blocks: [{ key: 'hero', type: 'hero' }],
      texts: {},
      textStyles: {},
      props: { 'block:hero': { variant: 'fullBleed', height: 'L', overlay: 'medium', fusion: 'none', contentAlign: 'center' } },
      removed: {} } });
}

const HERO_KEY = 'block:hero';

/** The wrapper holding the hero copy, found by its own max width. */
function copyBlock(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const hero = parsed.querySelector('[data-hero="fullBleed"]');
  expect(hero, 'food_story did not render the fullBleed hero').not.toBeNull();
  const blocks = Array.from(hero!.querySelectorAll('div')).filter((el) =>
    el.className.includes('max-w-[760px]'),
  );
  expect(blocks, 'the hero copy block was not found').toHaveLength(1);
  return blocks[0]!;
}

function ctaRow(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const cta = parsed.querySelector('[data-editor-id="hero.cta"]');
  expect(cta, 'the hero CTA did not render').not.toBeNull();
  return cta!.parentElement!;
}

function socialRow(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const group = parsed.querySelector('[data-social-layout]');
  expect(group, 'the hero social row did not render').not.toBeNull();
  return group!.parentElement!;
}

describe('Microfase 2A · food_story renders centered end to end', () => {
  it('1) the generated document carries the key its own renderer reads', () => {
    const pageDocument = generateMagicPageDocument({ businessContext: context(), selectedTemplateId: 'food_story' });
    // The id HeroFrame is handed by BusinessTemplate is `block:` + the block key.
    const heroBlock = pageDocument.blocks.find((block) => block.type === 'hero');
    expect(heroBlock?.key).toBe('hero');
    expect(pageDocument.props[HERO_KEY]?.['contentAlign']).toBe('center');
  });

  it('2) the public render centers the copy block', () => {
    const block = copyBlock(renderFamily('food_story'));
    expect(block.className).toContain('items-center');
    expect(block.className).toContain('mx-auto');
    expect(block.className).not.toContain('items-start');
  });

  it('3) the public render centers the CTA row', () => {
    expect(ctaRow(renderFamily('food_story')).className).toContain('justify-center');
  });

  it('4) the social row is centered whenever the hero draws one', () => {
    // Microfase 3A · a *generated* page carries no hero social row: the approved
    // preview's own `fullBleed` hero (`TemplateHero.tsx:100-124`) draws no
    // handles, and the Business Context declares none — an icon with no
    // destination is not a link. So the seam is pinned here on the document that
    // does carry them, where `contentAlign` drives the very same `justify-center`.
    expect(socialRow(renderPublic(handmadeDocument())).className).toContain('justify-center');
    const parsed = new DOMParser().parseFromString(renderFamily('food_story'), 'text/html');
    const hero = parsed.querySelector('[data-hero="fullBleed"]');
    expect(hero!.querySelector('[data-social-layout]')).toBeNull();
  });

  it('5) the text alignment from Microfase 1 is still applied', () => {
    const html = renderFamily('food_story');
    // `textStyles['hero.title'].align` reaches the title as an inline text-align.
    // Queried by tag, not by `data-editor-id`: the PUBLIC renderer does not emit
    // editor ids, which is exactly the difference between it and the editor.
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const title = parsed.querySelector('[data-hero="fullBleed"] h1');
    expect(title, 'the hero title did not render').not.toBeNull();
    expect(title!.getAttribute('style') ?? '').toContain('text-align: center');
  });

  it('6) the page family contract is untouched (template id stays business)', () => {
    const pageDocument = generateMagicPageDocument({ businessContext: context(), selectedTemplateId: 'food_story' });
    expect(pageDocument.template.id).toBe('business');
  });

  it('7) no other family is centered by the public render', () => {
    const others: TemplateId[] = [
      'barber_classic', 'beauty_studio', 'dental_clinic', 'gym_power', 'photography',
      'real_estate', 'legal_advisor', 'tech_startup', 'fashion_boutique', 'cafe_bakery', 'yoga_wellness',
    ];
    others.forEach((id) => {
      const html = renderFamily(id);
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const block = Array.from(parsed.querySelectorAll('div')).find((el) =>
        el.className.includes('max-w-[760px]') && el.className.includes('flex-col'),
      );
      if (!block) return; // the family uses a different hero composition entirely
      expect(block.className, id).toContain('items-start');
      expect(block.className, id).not.toContain('items-center');
    });
  });
});
