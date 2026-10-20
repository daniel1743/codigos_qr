import { describe, expect, it } from 'vitest';
import { generateMagicPageDocument } from '../magicPageDocument';
import {
  hydrateMagicEditorState,
  serializeMagicEditorState,
  validateMagicPageDocumentV1 } from
'../../../magic-page-editor-production/magic-document';
import { templates } from '../../data/templates';
import { IMG } from '../../data/images';
import { createBusinessContextStore } from '../../state/businessContext';
import type { BusinessContext, TemplateId } from '../../types/cripqer';

/**
 * Microfase 1 — hero text alignment fidelity.
 *
 * `textStyles` used to be emitted as `{}` unconditionally, so the alignment the
 * approved preview draws never reached the editor and `fullBleed` fell back to
 * the template's hardcoded `items-start` branch. These tests pin the alignment
 * at every stage of the documented flow — generator, serialize, hydrate,
 * saveDraft — and pin the families that must NOT be aligned, so a later change
 * cannot quietly spread it to templates the preview does not center.
 */

function context(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Cocina Aurora', type: 'restaurant', description: 'Pastas frescas hechas en casa.' });
  return store.get();
}

function docFor(id: TemplateId) {
  return generateMagicPageDocument({ businessContext: context(), selectedTemplateId: id });
}

describe('Microfase 1 — hero alignment travels through textStyles', () => {
  it('1) food_story generates a non-empty textStyles', () => {
    const doc = docFor('food_story');
    expect(Object.keys(doc.textStyles).length).toBeGreaterThan(0);
  });

  it('2) food_story hero.title is centered', () => {
    expect(docFor('food_story').textStyles['hero.title']).toEqual({ align: 'center' });
  });

  it('3) food_story hero.text is centered', () => {
    expect(docFor('food_story').textStyles['hero.text']).toEqual({ align: 'center' });
  });

  it('3b) food_story hero.eyebrow is centered too (the preview centers the whole hero row)', () => {
    expect(docFor('food_story').textStyles['hero.eyebrow']).toEqual({ align: 'center' });
  });

  it('4) serialize/validate keeps the styles (the document survives the wire)', () => {
    const doc = docFor('food_story');
    const roundTripped = validateMagicPageDocumentV1(JSON.parse(JSON.stringify(doc)));
    expect(roundTripped.textStyles).toEqual(doc.textStyles);
    expect(roundTripped.textStyles['hero.title']?.['align']).toBe('center');
    expect(roundTripped.textStyles['hero.text']?.['align']).toBe('center');
  });

  it('5) hydrate keeps the styles', () => {
    const state = hydrateMagicEditorState(docFor('food_story'));
    expect(state.doc.textStyles['hero.title']).toEqual({ align: 'center' });
    expect(state.doc.textStyles['hero.text']).toEqual({ align: 'center' });
  });

  it('6) saveDraft receives exactly the document carrying those styles', async () => {
    const doc = docFor('food_story');
    const seen: unknown[] = [];
    const saveDraft = async (payload: unknown) => {
      seen.push(payload);
    };

    await saveDraft(doc);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toBe(doc);
    // Exactly the hero texts the document fills, and nothing else.
    expect(doc.textStyles).toEqual({
      'hero.title': { align: 'center' },
      'hero.eyebrow': { align: 'center' },
      'hero.text': { align: 'center' },
    });
    // Every hero text run the document fills carries a style, and the button's
    // own label — which its row centers, not `text-align` — carries none. Scoped
    // to the hero ids: Microfase 3B made the document fill the services rows too,
    // and those carry no alignment because no preview centers them.
    expect(Object.keys(doc.textStyles).sort()).toEqual(
      Object.keys(doc.texts).
      filter((id) => id.startsWith('hero.') && id !== 'hero.cta.label').
      sort(),
    );
    expect(doc.textStyles['hero.cta.label']).toBeUndefined();
  });

  it('7) every written style targets a text the document actually fills', () => {
    templates.forEach((family) => {
      const doc = docFor(family.id);
      Object.keys(doc.textStyles).forEach((id) => {
        expect(doc.texts[id], `${family.id} styles "${id}" but never writes it`).toBeTruthy();
      });
    });
  });

  it('8) no other family gets an invented alignment', () => {
    const centered = templates.filter((family) => family.hero.variant === 'fullBleed').map((f) => f.id);
    // The preview centers exactly one hero variant; anything else must stay empty.
    expect(centered).toEqual(['food_story']);

    templates.forEach((family) => {
      const doc = docFor(family.id);
      if (family.hero.variant === 'fullBleed') return;
      expect(doc.textStyles).toEqual({});
    });
  });

  it('9) only alignment is written — no size, weight, colour or tracking', () => {
    const doc = docFor('food_story');
    expect(Object.keys(doc.textStyles).length).toBeGreaterThan(0);
    Object.values(doc.textStyles).forEach((style) => {
      expect(Object.keys(style)).toEqual(['align']);
      expect(style.align).toBe('center');
    });
  });

  it('10) template.id is still the page family contract (food_story -> business)', () => {
    expect(docFor('food_story').template.id).toBe('business');
  });

  it('11) an empty document is still valid and untouched when no alignment applies', () => {
    const state = serializeMagicEditorState({ templateId: 'business', doc: { blocks: [], texts: {}, textStyles: {}, props: {}, removed: {} } });
    expect(state.textStyles).toEqual({});
    expect(validateMagicPageDocumentV1(state).textStyles).toEqual({});
  });

  it('12) the properties the document contract already carried are unchanged', () => {
    const doc = docFor('food_story');
    // The four keys the engine vocabulary always produced, plus the two this
    // line of microphases added on top: `contentAlign` (2A) and `src` (3A, the
    // media channel HeroFrame already reads as `p['src'] ?? media`). The shape is
    // still pinned exactly, so a stray key here fails rather than slips through.
    expect(doc.props['block:hero']).toEqual({ variant: 'fullBleed', height: 'L', overlay: 'medium', fusion: 'none', src: IMG.food, contentAlign: 'center' });
    expect(doc.props['page']?.['bg']).toBe('#F6F0E6');
    expect(doc.blocks.map((b) => b.type)).toEqual(['hero', 'services', 'gallery', 'reviews', 'location']);
  });
});
