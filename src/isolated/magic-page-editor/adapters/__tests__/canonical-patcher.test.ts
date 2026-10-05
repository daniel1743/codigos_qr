import { describe, expect, it } from 'vitest';
import { applyCanonicalPatch } from '../canonical-patcher';
import type { BioTemplateConfig } from '../../../../premium-template-studio/types';
import type { SemanticTarget } from '../../types/semantic-selection';
import type { SemanticCommand } from '../../types/semantic-commands';

describe('Canonical Patcher', () => {
  const createMockConfig = (): BioTemplateConfig => ({
    schemaVersion: 1,
    pageInstanceId: 'inst-1',
    templateDefinitionId: 'bio',
    metadata: { name: 'Test' },
    theme: {} as any,
    layout: {} as any,
    profile: {} as any,
    seo: {} as any,
    settings: {} as any,
    blocks: [
      {
        id: 'block1',
        type: 'hero',
        variant: 'split',
        visibility: { desktop: true, tablet: true, mobile: true },
        style: {},
        layout: { constraints: { maxWidth: '100%' }, sticky: false },
        interaction: {},
        content: {
          title: 'Original Title',
          titleElement: { visible: true },
          primaryCTA: { label: 'Click Me', url: '#', style: 'filled', size: 'md' },
          avatar: { url: 'avatar.png', shape: 'circle' }
        },
      },
      {
        id: 'block2',
        type: 'text',
        variant: 'default',
        visibility: { desktop: true, tablet: true, mobile: true },
        style: {},
        layout: { constraints: { maxWidth: '100%' }, sticky: false },
        interaction: {},
        content: { body: 'Hello world' },
      }
    ],
  });

  it('updates text of a block', () => {
    const config = createMockConfig();
    const target: SemanticTarget = {
      documentKind: 'canonical',
      id: 'block1:title',
      targetKind: 'text',
      label: 'Title'
    };
    const command: SemanticCommand = { type: 'SET_TEXT', payload: { value: 'New Title' } };

    const patched = applyCanonicalPatch(config, target, command);
    expect(patched.blocks[0].content.title).toBe('New Title');
    expect(patched.blocks[0].content.primaryCTA?.label).toBe('Click Me'); // Untouched
  });

  it('updates a CTA label', () => {
    const config = createMockConfig();
    const target: SemanticTarget = {
      documentKind: 'canonical',
      id: 'block1:hero-cta',
      targetKind: 'cta-primary',
      label: 'CTA'
    };
    const command: SemanticCommand = { type: 'SET_CTA_LABEL', payload: { label: 'Updated Label' } };

    const patched = applyCanonicalPatch(config, target, command);
    expect(patched.blocks[0].content.primaryCTA?.label).toBe('Updated Label');
  });

  it('toggles visibility of an element', () => {
    const config = createMockConfig();
    const target: SemanticTarget = {
      documentKind: 'canonical',
      id: 'block1:title',
      targetKind: 'text',
      label: 'Title'
    };
    const command: SemanticCommand = { type: 'SET_ELEMENT_VISIBILITY', payload: { hidden: true } };

    const patched = applyCanonicalPatch(config, target, command);
    expect(patched.blocks[0].content.titleElement?.visible).toBe(false);
  });

  it('deletes a block', () => {
    const config = createMockConfig();
    const target: SemanticTarget = {
      documentKind: 'canonical',
      id: 'block1',
      targetKind: 'hero',
      label: 'Hero'
    };
    const command: SemanticCommand = { type: 'DELETE_BLOCK', payload: {} };

    const patched = applyCanonicalPatch(config, target, command);
    expect(patched.blocks.length).toBe(1);
    expect(patched.blocks[0].id).toBe('block2');
  });

  it('updates avatar shape and zoom', () => {
    const config = createMockConfig();
    const target: SemanticTarget = { documentKind: 'canonical', id: 'block1:hero-image', targetKind: 'image', label: 'Avatar' };

    const patchedShape = applyCanonicalPatch(config, target, { type: 'SET_AVATAR_SHAPE', payload: { shape: 'arch' } });
    expect(patchedShape.blocks[0].content.avatar?.shape).toBe('arch');

    const patchedZoom = applyCanonicalPatch(patchedShape, target, { type: 'SET_MEDIA_ZOOM', payload: { zoom: 1.5 } });
    expect(patchedZoom.blocks[0].content.avatar?.media?.zoom).toBe(1.5);
  });

  it('updates a canonical collection image href without touching sibling fields', () => {
    const config = createMockConfig();
    config.blocks.push({
      id: 'collection1',
      type: 'collection',
      variant: 'cards',
      visibility: { desktop: true, tablet: true, mobile: true },
      style: {},
      layout: { constraints: { maxWidth: '100%' }, sticky: false },
      interaction: {},
      content: {
        items: [{ id: 'item1', label: 'Producto', imageUrl: 'product.jpg', url: '', description: 'Detalle' }],
      },
    } as any);
    const target: SemanticTarget = {
      documentKind: 'canonical',
      id: 'collection1:items:item1:image',
      targetKind: 'media',
      label: 'Imagen',
    };

    const linked = applyCanonicalPatch(config, target, {
      type: 'SET_IMAGE_HREF',
      payload: { href: 'https://wa.me/56912345678', newTab: true },
    });
    const item = linked.blocks[2].content.items?.[0];
    expect(item).toMatchObject({
      id: 'item1',
      label: 'Producto',
      imageUrl: 'product.jpg',
      url: 'https://wa.me/56912345678',
      newTab: true,
      description: 'Detalle',
    });

    const cleared = applyCanonicalPatch(linked, target, {
      type: 'SET_IMAGE_HREF',
      payload: { href: '', newTab: false },
    });
    expect(cleared.blocks[2].content.items?.[0]).toMatchObject({ url: '', newTab: false });
  });

  it('updates hero fusion', () => {
    const config = createMockConfig();
    const target: SemanticTarget = { documentKind: 'canonical', id: 'block1', targetKind: 'hero', label: 'Hero' };

    const patched = applyCanonicalPatch(config, target, { type: 'SET_HERO_FUSION', payload: { mode: 'halo' } });
    expect(patched.blocks[0].content.fusion).toBe('halo');
  });

  it('updates card layout and emphasis', () => {
    const config = createMockConfig();
    const target: SemanticTarget = { documentKind: 'canonical', id: 'block1', targetKind: 'section', label: 'Cards' };

    const patchedLayout = applyCanonicalPatch(config, target, { type: 'SET_CARD_LAYOUT', payload: { layout: 'image-left' } });
    expect(patchedLayout.blocks[0].content.cardLayout).toBe('image-left');

    const patchedEmphasis = applyCanonicalPatch(patchedLayout, target, { type: 'SET_CARD_EMPHASIS', payload: { emphasis: true } });
    expect(patchedEmphasis.blocks[0].content.cardEmphasis).toBe(true);
  });
});
