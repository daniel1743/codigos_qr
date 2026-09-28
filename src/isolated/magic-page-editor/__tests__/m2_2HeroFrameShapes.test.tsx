// @vitest-environment happy-dom
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { useSelectionActions } from '../components/editor/useSelectionActions';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { HeroFrame, heroFrameMediaShapeStyle, heroShapeIds } from '../components/blocks/HeroFrame';
import { heroFrameShapes } from '../components/editor/controls/HeroFrameShapePicker';
import { heroVariants } from '../components/editor/controls/HeroVariantPicker';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import { createInitialMagicPageDocument, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import type { HeroVariant } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function ActionProbe({ target }: { target: string }) {
  const { select } = useEditor();
  const actions = useSelectionActions();
  useEffect(() => select(target), [select, target]);
  const shape = actions.find((action) => action.key === 'shape');
  return <div data-action-probe>{shape?.panel}</div>;
}

function mount(node: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root };
}

describe('M2.2 Hero frame shape expansion', () => {
  it('keeps the three legacy shapes and exposes the six new shapes', () => {
    expect(heroShapeIds).toEqual([
      'curve', 'straight', 'inset', 'curve-deep', 'curve-up',
      'curve-up-deep', 'wave', 'wave-double', 'arch',
    ]);
    expect(heroFrameShapes.map((shape) => shape.value)).toEqual([...heroShapeIds]);
    expect(heroFrameShapes).toHaveLength(9);
  });

  it('produces a visual style for every new shape without changing legacy styles', () => {
    expect(heroFrameMediaShapeStyle('curve', 72)).toEqual({});
    expect(heroFrameMediaShapeStyle('straight', 72)).toEqual({});
    expect(heroFrameMediaShapeStyle('inset', 72)).toEqual({});
    const styles = heroShapeIds.slice(3).map((shape) => JSON.stringify(heroFrameMediaShapeStyle(shape, 72)));
    expect(new Set(styles).size).toBe(6);
  });

  it.each(['desktop', 'mobile'] as const)('exposes all nine shapes from Portada > Forma on %s', (device) => {
    const documentState = createInitialMagicPageDocument('bio');
    const { host, root } = mount(
      <EditorProvider initialTemplate="bio" initialDevice={device} initialDocument={hydrateMagicEditorState(documentState)}>
        <TemplateRenderer />
        <ActionProbe target="block:hero" />
      </EditorProvider>,
    );
    expect(host.querySelector('[data-testid="hero-frame-shape-grid"]')?.querySelectorAll('button')).toHaveLength(9);
    expect(host.querySelector('[data-testid="hero-frame-shape-grid"]')?.textContent).toContain('Onda doble');
    act(() => root.unmount());
  });

  it('renders every new frame shape across all 30 Hero variants', () => {
    const props: Record<string, Record<string, string>> = {};
    for (const shape of heroFrameShapes) {
      for (const variant of heroVariants) {
        props[`hero:${shape.value}:${variant.value}`] = { shape: shape.value, variant: variant.value };
      }
    }
    const { host, root } = mount(
      <EditorProvider
        initialTemplate="bio"
        initialDocument={{
          templateId: 'bio',
          doc: { blocks: [], texts: {}, textStyles: {}, props, removed: {} },
        }}
      >
        <div>
          {heroFrameShapes.flatMap((shape) => heroVariants.map((variant) => {
            const id = `hero:${shape.value}:${variant.value}`;
            return <HeroFrame key={id} id={id} media="/hero.jpg" mediaAlt="Hero" defaultVariant={variant.value as HeroVariant} radius={24}>{() => <span>Contenido</span>}</HeroFrame>;
          }))}
        </div>
      </EditorProvider>,
    );
    expect(host.querySelectorAll('[data-hero]')).toHaveLength(9 * 30);
    for (const shape of heroFrameShapes) {
      expect(host.querySelectorAll(`[data-shape="${shape.value}"]`)).toHaveLength(30);
    }
    act(() => root.unmount());
  });

  it('persists a selected frame shape and renders the same shape publicly', () => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props['block:hero'] = { shape: 'curve-up-deep', variant: 'centered' };
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));
    const reloaded = hydrateMagicEditorState(saved);
    expect(reloaded.doc.props['block:hero']?.shape).toBe('curve-up-deep');

    const { host, root } = mount(<MagicPublicRenderer document={saved} />);
    const hero = host.querySelector<HTMLElement>('[data-hero="centered"]');
    expect(hero?.getAttribute('data-shape')).toBe('curve-up-deep');
    expect(host.querySelector<HTMLElement>('[data-editor-id="block:hero:hero-image"]')?.style.borderRadius).toBe('50% 50% 0px 0px');
    act(() => root.unmount());
  });
});
