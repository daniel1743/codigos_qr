import { describe, expect, it } from 'vitest';
import {
  PLACEHOLDER_BUSINESS_NAME,
  buildMagicBlocks,
  engineFontId,
  generateMagicPageDocument } from
'../magicPageDocument';
import { validateMagicPageDocumentV1 } from '../../../magic-page-editor-production/magic-document';
import { templates } from '../../data/templates';
import { getBusinessType, getTemplate } from '../../utils/templates';
import { createBusinessContextStore } from '../../state/businessContext';
import type { BusinessContext, TemplateId } from '../../types/cripqer';
import { MAGIC_VIDEO_DEMO_OWNER, MAGIC_VIDEO_DEMO_URL } from '../../../../isolated/magic-page-editor/utils/video';

const FORBIDDEN_BLOCK_TYPES = ['cardPage', 'cardPortfolio', 'cardMenu', 'cardStore'];
const ENGINE_TEMPLATE_IDS = ['bio', 'business', 'portfolio'];
/** Every block type the isolated editor declares. */
const KNOWN_BLOCK_TYPES = ['hero', 'profile', 'text', 'links', 'button', 'social', 'image', 'gallery', 'video', 'collection', 'location', 'catalog', 'cardPage', 'cardPortfolio', 'cardMenu', 'cardStore', 'imageCards', 'reviews', 'separator', 'services', 'cta', 'whatsapp', 'contact'];
function completeContext(): BusinessContext {
  const store = createBusinessContextStore();
  store.patch({ name: 'Barberia Santos', type: 'barbershop', description: 'Cortes clasicos y afeitado tradicional.' });
  store.patch({ goal: 'bookings', channel: 'whatsapp' });
  return store.get();
}

function partialContext(): BusinessContext {
  return createBusinessContextStore().get();
}

function allFamilies(): TemplateId[] {
  return templates.map((family) => family.id);
}

describe('generateMagicPageDocument', () => {
  it('1) a complete BusinessContext produces an engine-valid document', () => {
    const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: 'dark_craft' });
    expect(validateMagicPageDocumentV1(doc)).toBe(doc);
    expect(doc.documentType).toBe('magic-page');
    expect(doc.version).toBe(1);
    expect(doc.template.id).toBe('business');
    expect(doc.meta).toEqual({ createdBy: 'magic-editor', schemaVersion: 1 });
    expect(doc.blocks[0]).toEqual({ key: 'hero', type: 'hero' });
    expect(doc.texts['hero.title']).toBe('Barberia Santos');
    expect(doc.texts['hero.eyebrow']).toBe(getBusinessType('barbershop')?.label);
    expect(doc.texts['hero.text']).toBe('Cortes clasicos y afeitado tradicional.');
  });

  it('2) a partial BusinessContext still produces a valid document with safe placeholders', () => {
    const doc = generateMagicPageDocument({ businessContext: partialContext(), selectedTemplateId: 'warm_care' });
    expect(validateMagicPageDocumentV1(doc)).toBe(doc);
    expect(doc.texts['hero.title']).toBe(PLACEHOLDER_BUSINESS_NAME);
    expect(doc.texts['hero.eyebrow']).toBe(undefined);
    expect(doc.texts['hero.text']).toBe(undefined);
    expect(doc.texts['hero.bio']).toBe(undefined);
    expect(doc.blocks.length > 0).toBe(true);
  });

  it('3) the selected family is preserved and only engine template ids are used', () => {
    allFamilies().forEach((id) => {
      const family = getTemplate(id);
      const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: id });
      expect(doc.template.id).toBe(family.pageFamily);
      expect(ENGINE_TEMPLATE_IDS.indexOf(doc.template.id) !== -1).toBe(true);
      expect(doc.props['page']!['font']).toBe(engineFontId(family));
      expect(doc.props['block:hero']!['variant']).toBe(family.hero.variant);
    });
  });

  it('4) changing the family keeps the business data and only changes template and style', () => {
    const context = completeContext();
    const a = generateMagicPageDocument({ businessContext: context, selectedTemplateId: 'dark_craft' });
    const b = generateMagicPageDocument({ businessContext: context, selectedTemplateId: 'local_friendly' });
    expect(a.template.id).toBe('business');
    expect(b.template.id).toBe('business');
    expect(a.texts['hero.title']).toBe('Barberia Santos');
    expect(b.texts['hero.title']).toBe('Barberia Santos');
    expect(a.texts['hero.eyebrow']).toBe(b.texts['hero.eyebrow']);
    expect(a.texts['hero.text']).toBe(b.texts['hero.text']);
    expect(a.props['page']!['accent'] === b.props['page']!['accent']).toBe(false);
    expect(a.props['block:hero']!['variant'] === b.props['block:hero']!['variant']).toBe(false);
    expect(a.props['page']!['font'] === b.props['page']!['font']).toBe(false);
  });

  it('5) every prop and text value is a string', () => {
    allFamilies().forEach((id) => {
      const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: id });
      Object.keys(doc.props).forEach((scope) => {
        Object.keys(doc.props[scope]!).forEach((key) => {
          expect(typeof doc.props[scope]![key] === 'string').toBe(true);
        });
      });
      Object.keys(doc.texts).forEach((key) => {
        expect(typeof doc.texts[key] === 'string').toBe(true);
      });
    });
  });

  it('6) no forbidden block type is ever emitted', () => {
    allFamilies().forEach((id) => {
      const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: id });
      doc.blocks.forEach((block) => {
        expect(FORBIDDEN_BLOCK_TYPES.indexOf(block.type) === -1).toBe(true);
        expect(KNOWN_BLOCK_TYPES.indexOf(block.type) !== -1).toBe(true);
      });
      expect(doc.removed).toEqual({});
    });
  });

  it('7) block ids are deterministic and unique', () => {
    allFamilies().forEach((id) => {
      const keys = buildMagicBlocks(getTemplate(id)).map((block) => block.key);
      const unique = keys.filter((key, index) => keys.indexOf(key) === index);
      expect(unique.length).toBe(keys.length);
      expect(keys[0]).toBe('hero');
    });
  });

  it('8) the same input produces a deep-equal document', () => {
    const input = { businessContext: completeContext(), selectedTemplateId: 'editorial_luxury' as TemplateId };
    expect(generateMagicPageDocument(input)).toEqual(generateMagicPageDocument(input));
  });

  it('9) every family produces a document the real validator accepts', () => {
    allFamilies().forEach((id) => {
      const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: id });
      expect(validateMagicPageDocumentV1(doc)).toBe(doc);
      expect(ENGINE_TEMPLATE_IDS.indexOf(doc.template.id) !== -1).toBe(true);
    });
  });

  it('10) a serialize and parse round-trip keeps the structure', () => {
    const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: 'food_story' });
    const parsed = JSON.parse(JSON.stringify(doc));
    expect(parsed).toEqual(doc);
    expect(validateMagicPageDocumentV1(parsed)).toBe(parsed);
  });

  it('11) the generator never depends on the Power Editor', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('src/features/approved-chat-landing/generation/magicPageDocument.ts', 'utf8');
    const forbidden = ['parametric-engine-v2', 'premium-template-studio', 'canonical-page', 'power-editor'];
    const code = source.split(String.fromCharCode(10)).filter((line) => {
      const t = line.trim();
      let keep = true;
      if (t.indexOf('*') === 0) keep = false;
      if (t.indexOf('/') === 0) keep = false;
      return keep;
    });
    code.forEach((line) => {
      forbidden.forEach((needle) => {
        expect(line.indexOf(needle) === -1).toBe(true);
      });
    });
    const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: 'minimal_premium' });
    expect(doc.theme).toEqual({});
    expect(doc.content).toEqual({});
  });

  it('12) the four target business shapes map to real engine output', () => {
    const cases: { template: TemplateId; name: string; type: string; family: string }[] = [
      { template: 'professional_trust', name: 'Bufete Rivas', type: 'lawyer', family: 'business' },
      { template: 'personal_brand', name: 'Ana Rojas', type: 'coach', family: 'bio' },
      { template: 'local_friendly', name: 'Floreria Norte', type: 'florist', family: 'business' },
      { template: 'visual_portfolio', name: 'Estudio Olmo', type: 'photographer', family: 'portfolio' },
    ];
    cases.forEach((entry) => {
      const store = createBusinessContextStore();
      store.patch({ name: entry.name, type: entry.type, description: 'Descripcion de prueba.' });
      const doc = generateMagicPageDocument({ businessContext: store.get(), selectedTemplateId: entry.template });
      expect(validateMagicPageDocumentV1(doc)).toBe(doc);
      expect(doc.template.id).toBe(entry.family);
      expect(doc.blocks.length).toBeGreaterThan(1);
    });
  });

  it('13) the personal brand preview carries a marked demo video in the native video scope', () => {
    const doc = generateMagicPageDocument({ businessContext: completeContext(), selectedTemplateId: 'personal_brand' });
    expect(doc.blocks.find((block) => block.type === 'video')).toEqual({ key: 'video', type: 'video' });
    expect(doc.props["video"]).toEqual({
      href: MAGIC_VIDEO_DEMO_URL,
      demo: 'true',
      demoOwner: MAGIC_VIDEO_DEMO_OWNER,
    });
    expect(doc.props['block:video']).toBeUndefined();
  });
});
