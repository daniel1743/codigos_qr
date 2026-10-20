import { describe, expect, it } from 'vitest';
import { generateMagicPageDocument } from '../magicPageDocument';
import {
  hydrateMagicEditorState,
  serializeMagicEditorState,
  validateMagicPageDocumentV1 } from
'../../../magic-page-editor-production/magic-document';
import { templates } from '../../data/templates';
import { createBusinessContextStore } from '../../state/businessContext';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

/**
 * Microfase 2A — hero *composition* alignment.
 *
 * Microfase 1 centers the hero *text* through `textStyles[id].align`. That alone
 * leaves the block that holds the text anchored left, so the CTA and the social
 * rows stay left too. `contentAlign` is the key that centers the block itself,
 * and HeroFrame reads it through `children({ align })`.
 *
 * The key is opt-in: it is written only for the families whose hero composition
 * the approved preview centers, and omitted — never written as 'left' —
 * everywhere else. An absent key is what lets a document generated before this
 * change keep the engine's own default.
 */

const HERO_KEY = 'block:hero';

function context(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Cocina Aurora', type: 'restaurant', description: 'Pastas frescas hechas en casa.' });
  return store.get();
}

function docFor(id: TemplateId) {
  return generateMagicPageDocument({ businessContext: context(), selectedTemplateId: id });
}

describe('Microfase 2A — contentAlign is opt-in per family', () => {
  it('1) food_story writes contentAlign: center on the hero block', () => {
    expect(docFor('food_story').props[HERO_KEY]?.['contentAlign']).toBe('center');
  });

  it('2) the preview centers exactly one family, so exactly one may opt in', () => {
    const centered = templates.filter((family) => family.hero.variant === 'fullBleed').map((f) => f.id);
    expect(centered).toEqual(['food_story']);
  });

  it('3) every other family omits the key entirely (not even "left")', () => {
    const others = templates.filter((family) => family.id !== 'food_story');
    expect(others.length).toBe(11);
    others.forEach((family) => {
      const hero = docFor(family.id).props[HERO_KEY] ?? {};
      expect(hero, family.id).not.toHaveProperty('contentAlign');
    });
  });

  it('4) the four keys the hero always carried are untouched', () => {
    const hero = docFor('food_story').props[HERO_KEY]!;
    expect(hero['variant']).toBe('fullBleed');
    expect(hero['height']).toBe('L');
    expect(hero['overlay']).toBe('medium');
    expect(hero['fusion']).toBe('none');
  });

  it('5) template.id stays the page-family contract (food_story -> business)', () => {
    expect(docFor('food_story').template.id).toBe('business');
  });

  it('6) serialize/validate keeps the property (it survives the wire)', () => {
    const doc = docFor('food_story');
    const roundTripped = validateMagicPageDocumentV1(JSON.parse(JSON.stringify(doc)));
    expect(roundTripped.props[HERO_KEY]?.['contentAlign']).toBe('center');
  });

  it('7) hydrate keeps the property', () => {
    const state = hydrateMagicEditorState(docFor('food_story'));
    expect(state.doc.props[HERO_KEY]?.['contentAlign']).toBe('center');
  });

  it('8) a document without the key stays valid and gains no key', () => {
    // The shape of a page generated before this change: fullBleed, no contentAlign.
    const legacy = serializeMagicEditorState({
      templateId: 'business',
      doc: {
        blocks: [{ key: 'hero', type: 'hero' }],
        texts: {},
        textStyles: {},
        props: { [HERO_KEY]: { variant: 'fullBleed', height: 'L', overlay: 'medium', fusion: 'none' } },
        removed: {},
      },
    });
    expect(legacy.props[HERO_KEY]).not.toHaveProperty('contentAlign');
    expect(validateMagicPageDocumentV1(legacy).props[HERO_KEY]).not.toHaveProperty('contentAlign');
  });

  it('9) generation stays deterministic for the new key', () => {
    const a = docFor('food_story');
    const b = docFor('food_story');
    expect(a.props[HERO_KEY]).toEqual(b.props[HERO_KEY]);
  });

  it('10) no document is produced with an invalid contentAlign value', () => {
    templates.forEach((family) => {
      const value = docFor(family.id).props[HERO_KEY]?.['contentAlign'];
      if (value === undefined) return;
      expect(['left', 'center']).toContain(value);
      expect(value, family.id).toBe('center');
    });
  });
});
