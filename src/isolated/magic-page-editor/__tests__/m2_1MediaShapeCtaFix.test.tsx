// @vitest-environment happy-dom
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { useSelectionActions } from '../components/editor/useSelectionActions';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import { createInitialMagicPageDocument, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function ActionProbe({ target }: { target: string }) {
  const { select } = useEditor();
  const actions = useSelectionActions();
  useEffect(() => select(target), [select, target]);
  const shape = actions.find((action) => action.key === 'shape');
  const treatment = actions.find((action) => action.key === 'treatment');
  return <div data-action-probe><div data-action-labels>{actions.map((action) => action.label).join('|')}</div>{shape?.panel ?? treatment?.panel}</div>;
}

function mount(target: string, initialDevice: 'desktop' | 'mobile') {
  const documentState = createInitialMagicPageDocument('bio');
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(
    <EditorProvider initialTemplate="bio" initialDevice={initialDevice} initialDocument={hydrateMagicEditorState(documentState)}>
      <TemplateRenderer />
      <ActionProbe target={target} />
    </EditorProvider>,
  ));
  return { host, root };
}

describe('M2.1 media shape reachability and CTA shape cleanup', () => {
  it.each(['desktop', 'mobile'] as const)('exposes all six media shapes for generic images on %s', (device) => {
    const { host, root } = mount('collection.0.img', device);
    const group = host.querySelector('[aria-label="Forma de imagen"]');
    expect(group?.querySelectorAll('button')).toHaveLength(6);
    expect(group?.textContent).toContain('Cuadrada');
    expect(group?.textContent).toContain('Redondeada');
    expect(group?.textContent).toContain('Círculo');
    expect(group?.textContent).toContain('Óvalo');
    expect(group?.textContent).toContain('Arco');
    expect(group?.textContent).toContain('A sangre');
    act(() => root.unmount());
  });

  it.each(['desktop', 'mobile'] as const)('exposes all six media shapes for Hero media on %s', (device) => {
    const { host, root } = mount('block:hero:hero-image', device);
    expect(host.querySelector('[aria-label="Forma de imagen"]')?.querySelectorAll('button')).toHaveLength(6);
    act(() => root.unmount());
  });

  it.each(['desktop', 'mobile'] as const)('keeps only CTA shapes in the CTA treatment picker on %s', (device) => {
    const { host, root } = mount('links.0', device);
    const group = host.querySelector('[aria-label="Forma del botón"]');
    expect(group?.querySelectorAll('button')).toHaveLength(4);
    expect(group?.textContent).toContain('Cuadrado');
    expect(group?.textContent).toContain('Suave');
    expect(group?.textContent).toContain('Píldora');
    expect(group?.textContent).toContain('Círculo');
    expect(group?.textContent).not.toContain('Óvalo');
    expect(group?.textContent).not.toContain('Arco');
    expect(group?.textContent).not.toContain('A sangre');
    expect(host.querySelector('[data-action-labels]')?.textContent).toContain('Enlace');
    act(() => root.unmount());
  });

  it('mutates generic shape and Hero mediaShape independently and preserves both publicly', () => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props['collection.0.img'] = { shape: 'oval' };
    documentState.props['block:hero'] = { mediaShape: 'arch' };
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));
    const reloaded = hydrateMagicEditorState(saved);
    expect(reloaded.doc.props['collection.0.img']?.shape).toBe('oval');
    expect(reloaded.doc.props['block:hero']?.mediaShape).toBe('arch');

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<MagicPublicRenderer document={saved} />));
    expect(host.querySelector<HTMLElement>('[data-editor-id="collection.0.img"]')?.style.borderRadius).toBe('50%');
    expect(host.querySelector<HTMLElement>('[data-editor-id="block:hero:hero-image"]')?.style.borderRadius).toBe('9999px 9999px 18px 18px');
    act(() => root.unmount());
  });
});
