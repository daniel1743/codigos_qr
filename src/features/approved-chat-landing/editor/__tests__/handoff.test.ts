import { describe, expect, it } from 'vitest';
import { buildMagicEditorHandoff, MagicEditorHandoffError } from '../handoff';
import {
  hydrateMagicEditorState,
  serializeMagicEditorState,
  validateMagicPageDocumentV1
} from '../../../magic-page-editor-production/magic-document';
import { createBusinessContextStore } from '../../state/businessContext';
import { applySelection } from '../../utils/agent';
import { buildSeed } from '../../utils/seed';
import { getBusinessType } from '../../utils/templates';
import { templates } from '../../data/templates';
import type { TemplateId } from '../../types/cripqer';

const ENGINE_TEMPLATE_IDS = ['bio', 'business', 'portfolio'];
const FORBIDDEN_BLOCK_TYPES = ['cardPage', 'cardPortfolio', 'cardMenu', 'cardStore'];

/** A complete Business Context with the chosen family already selected. */
function contextWith(templateId: TemplateId) {
  const store = createBusinessContextStore();
  store.patch({ name: 'Barberia Santos', type: 'barbershop', description: 'Cortes clasicos y afeitado tradicional.' });
  store.patch({ goal: 'bookings', channel: 'whatsapp' });
  return applySelection(store.get(), templateId);
}

describe('Magic Editor hand-off', () => {
  it('1) builds an engine-valid document and hydrates it with the real engine', () => {
    const handoff = buildMagicEditorHandoff(contextWith('dark_craft'));
    expect(validateMagicPageDocumentV1(handoff.document)).toBe(handoff.document);
    expect(handoff.document.documentType).toBe('magic-page');
    expect(handoff.document.version).toBe(1);
    expect(handoff.document.template.id).toBe('business');
    expect(handoff.templateId).toBe('dark_craft');
    expect(handoff.editorState.templateId).toBe('business');
    expect(handoff.editorState).toEqual(hydrateMagicEditorState(handoff.document));
  });

  it('2) carries the business name, type and description into the document texts', () => {
    const handoff = buildMagicEditorHandoff(contextWith('warm_care'));
    expect(handoff.document.texts['hero.title']).toBe('Barberia Santos');
    expect(handoff.document.texts['hero.text']).toBe('Cortes clasicos y afeitado tradicional.');
    expect(handoff.document.texts['hero.eyebrow']).toBe(getBusinessType('barbershop')?.label);
  });


  it('3) the hydrated editor state serializes back to the same document', () => {
    const handoff = buildMagicEditorHandoff(contextWith('editorial_luxury'));
    expect(serializeMagicEditorState(handoff.editorState)).toEqual(handoff.document);
  });

  it('4) two families hand off two different documents over the same business data', () => {
    const a = buildMagicEditorHandoff(contextWith('dark_craft'));
    const b = buildMagicEditorHandoff(contextWith('local_friendly'));
    expect(a.document.template.id).toBe('business');
    expect(b.document.template.id).toBe('business');
    expect(a.document.props['page']!['accent'] === b.document.props['page']!['accent']).toBe(false);
    expect(a.document.props['block:hero']!['variant'] === b.document.props['block:hero']!['variant']).toBe(false);
    expect(a.document.texts['hero.title']).toBe(b.document.texts['hero.title']);
    expect(a.document === b.document).toBe(false);
  });

  it('5) a missing selection is a controlled error, never a silent family', () => {
    const empty = createBusinessContextStore().get();
    let caught: unknown = null;
    try {
      buildMagicEditorHandoff(empty);
    } catch (reason) {
      caught = reason;
    }
    expect(caught instanceof MagicEditorHandoffError).toBe(true);
    expect((caught as Error).name).toBe('MagicEditorHandoffError');
    expect((caught as Error).message.length > 0).toBe(true);
  });

  it('6) the editor state never shares mutable arrays with the document', () => {
    const handoff = buildMagicEditorHandoff(contextWith('visual_portfolio'));
    handoff.editorState.doc.blocks.pop();
    expect(handoff.document.blocks.length === handoff.editorState.doc.blocks.length).toBe(false);
  });


  it('7) the engine hydrator rejects anything the generator did not produce', () => {
    let threw = false;
    try {
      hydrateMagicEditorState({ documentType: 'magic-page', version: 1 });
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });

  it('8) the editor review seed (startAt=editor) produces a valid hand-off', () => {
    const seed = buildSeed('editor');
    expect(seed.stage).toBe('editor');
    const handoff = buildMagicEditorHandoff(seed.context);
    expect(validateMagicPageDocumentV1(handoff.document)).toBe(handoff.document);
    expect(handoff.pageName.trim().length > 0).toBe(true);
    expect(ENGINE_TEMPLATE_IDS.indexOf(handoff.document.template.id) !== -1).toBe(true);
  });

  it('9) every family maps to an engine template id with no forbidden block', () => {
    templates.forEach((family) => {
      const handoff = buildMagicEditorHandoff(contextWith(family.id));
      expect(ENGINE_TEMPLATE_IDS.indexOf(handoff.document.template.id) !== -1).toBe(true);
      handoff.document.blocks.forEach((block) => {
        expect(FORBIDDEN_BLOCK_TYPES.indexOf(block.type) === -1).toBe(true);
      });
    });
  });

  it('10) the same context and family always hand off the same document', () => {
    const context = contextWith('food_story');
    expect(buildMagicEditorHandoff(context)).toEqual(buildMagicEditorHandoff(context));
  });
});
