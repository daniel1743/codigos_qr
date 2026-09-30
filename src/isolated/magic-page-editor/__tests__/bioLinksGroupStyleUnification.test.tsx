// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import { createInitialMagicPageDocument, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function renderEditor(props: Record<string, Record<string, string>>) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(
    <EditorProvider initialTemplate="bio" initialDocument={{
      templateId: 'bio',
      doc: {
        blocks: [{ key: 'hero', type: 'hero' }, { key: 'links', type: 'links' }],
        texts: {},
        textStyles: {},
        props,
        removed: {}
      }
    }}>
      <TemplateRenderer />
    </EditorProvider>,
  ));
  return { host, root };
}

function linkCtas(host: HTMLElement) {
  return Array.from(host.querySelectorAll<HTMLElement>('[data-editor-id^="links."]'))
    .filter((element) => element.dataset.variant);
}

describe('Bio links group style unification', () => {
  it('uses one uniform template default when the group and items are unconfigured', () => {
    const { host, root } = renderEditor({});
    const ctas = linkCtas(host);

    expect(ctas.length).toBe(4);
    expect(ctas.every((cta) => cta.dataset.variant === 'soft')).toBe(true);
    expect(ctas.every((cta) => cta.dataset.shape === 'pill')).toBe(true);
    act(() => root.unmount());
  });

  it('applies the group style while preserving an explicit item override', () => {
    const { host, root } = renderEditor({
      'block:links': { groupCardCtaVariant: 'outline', groupCardCtaShape: 'square', groupCardCtaSize: 'lg' },
      'links.1': { variant: 'glass', shape: 'circle', size: 'sm' }
    });
    const ctas = linkCtas(host);

    expect(ctas[0]?.dataset.variant).toBe('outline');
    expect(ctas[0]?.dataset.shape).toBe('square');
    expect(ctas[0]?.dataset.size).toBe('lg');
    expect(ctas[1]?.dataset.variant).toBe('glass');
    expect(ctas[1]?.dataset.shape).toBe('circle');
    expect(ctas[1]?.dataset.size).toBe('sm');
    expect(ctas[2]?.dataset.variant).toBe('outline');
    expect(ctas[3]?.dataset.variant).toBe('outline');
    act(() => root.unmount());
  });

  it('keeps editor and public renderer resolution identical after serialization', () => {
    const magicDocument = createInitialMagicPageDocument('bio');
    magicDocument.props = {
      'block:links': { groupCardCtaVariant: 'ghost', groupCardCtaShape: 'soft' },
      'links.2': { variant: 'solid', shape: 'circle' }
    };
    const saved = serializeMagicEditorState(hydrateMagicEditorState(magicDocument));
    const { host, root } = renderEditor(saved.props as Record<string, Record<string, string>>);
    const editorCtas = linkCtas(host).map((cta) => `${cta.dataset.variant}:${cta.dataset.shape}`);

    const publicHost = document.createElement('div');
    document.body.append(publicHost);
    const publicRoot = createRoot(publicHost);
    act(() => publicRoot.render(<MagicPublicRenderer document={saved} />));
    const publicCtas = linkCtas(publicHost).map((cta) => `${cta.dataset.variant}:${cta.dataset.shape}`);

    expect(editorCtas).toEqual(['ghost:soft', 'ghost:soft', 'solid:circle', 'ghost:soft']);
    expect(publicCtas).toEqual(editorCtas);
    act(() => root.unmount());
    act(() => publicRoot.unmount());
  });
});
