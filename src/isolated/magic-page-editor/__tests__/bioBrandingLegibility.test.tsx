// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import {
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { BRANDING_BLUE, BRANDING_ON_DARK, contrastRatio, resolveBrandingTone } from '../utils/brandingContrast';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function bioDoc(palette: string) {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.props.page = { ...(documentState.props.page ?? {}), family: 'bio', palette };
  return documentState;
}

function brandingElement(host: HTMLElement) {
  return host.querySelector<HTMLElement>('[data-system-branding="cripqer"]');
}

function renderPublic(documentState: ReturnType<typeof bioDoc>) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));
  act(() => root.render(<MagicPublicRenderer document={saved} />));
  return { host, root };
}

function rgbOf(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return color.trim().toLowerCase();
  const value = hex[1];
  return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
}

/**
 * E1.1 — the system branding resolves its own contrast token from the surface it
 * sits on (official brand colours only) instead of inheriting the page
 * foreground at 60% opacity.
 */
describe('E1.1 system branding legibility', () => {
  it('no longer inherits --fg at 60% opacity', () => {
    const { host, root } = renderPublic(bioDoc('teal'));
    const el = brandingElement(host);
    expect(el).not.toBeNull();
    expect(el?.className ?? '').not.toContain('opacity-60');
    expect(el?.className ?? '').not.toContain('var(--fg)');
    expect(el?.className ?? '').toContain('var(--branding-fg)');
    act(() => root.unmount());
  });

  it('resolves its own token and keeps AA contrast on the surface it sits on', () => {
    for (const palette of ['teal', 'warm-cream', 'luxury-black', 'silver']) {
      const { host, root } = renderPublic(bioDoc(palette));
      const el = brandingElement(host);
      expect(el, palette).not.toBeNull();
      const token = el?.style.getPropertyValue('--branding-fg').trim() ?? '';
      expect([BRANDING_BLUE, BRANDING_ON_DARK], palette).toContain(token);
      const surface = el?.style.getPropertyValue('--surface').trim() ?? '';
      expect(token, palette).toBe(resolveBrandingTone(surface).color);
      const measured = contrastRatio(token, surface);
      if (measured !== null) expect(measured, palette).toBeGreaterThanOrEqual(4.5);
      act(() => root.unmount());
      host.remove();
    }
  });

  it('keeps editor and published branding identical, and wordmark follows the tone', () => {
    const documentState = bioDoc('luxury-black');
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));

    const editorHost = document.createElement('div');
    document.body.append(editorHost);
    const editorRoot = createRoot(editorHost);
    act(() => editorRoot.render(
      <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(saved)}>
        <TemplateRenderer />
      </EditorProvider>,
    ));
    const editorEl = brandingElement(editorHost);

    const { host: publicHost, root: publicRoot } = renderPublic(documentState);
    const publicEl = brandingElement(publicHost);

    expect(editorEl).not.toBeNull();
    expect(publicEl).not.toBeNull();
    expect(publicEl?.style.getPropertyValue('--branding-fg')).toBe(editorEl?.style.getPropertyValue('--branding-fg'));
    expect(publicEl?.dataset['brandingTone']).toBe(editorEl?.dataset['brandingTone']);

    const wordmark = publicEl?.querySelector<HTMLElement>('.logo-wordmark');
    const expected = publicEl?.dataset['brandingTone'] === 'inverse' ? BRANDING_ON_DARK : BRANDING_BLUE;
    expect(wordmark).not.toBeNull();
    expect(rgbOf(wordmark?.style.color ?? '')).toBe(rgbOf(expected ?? BRANDING_BLUE));

    act(() => editorRoot.unmount());
    act(() => publicRoot.unmount());
  });
});
