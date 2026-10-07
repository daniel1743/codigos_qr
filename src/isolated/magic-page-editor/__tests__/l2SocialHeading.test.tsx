// @vitest-environment happy-dom
/**
 * Social block heading — the small gap L2.4 catalogued but deliberately did not
 * close, on the rule that a narrow row must not be used to hide a real gap.
 *
 * It follows `reviews.heading` exactly: the same id shape, the same opt-in
 * contract, the same panel control. Nothing here hardcodes the target's copy —
 * "Síguenos" appears only as a placeholder in the editor field and as a test
 * fixture the author could equally have typed as anything else.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mount(state: MagicEditorStateV1) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider initialTemplate={state.templateId} initialDocument={state}>
        <TemplateRenderer showLandingBotPreview={false} />
      </EditorProvider>,
    );
  });
  return { host, root };
}

/** The generic social block with an optional heading written into it. */
function renderSocial(heading?: string) {
  const state = createInitialMagicEditorState('business');
  state.doc.blocks = [{ key: 'social', type: 'social' }];
  if (heading !== undefined) state.doc.texts['social.title'] = heading;
  return mount(state);
}

/**
 * `EditableText` publishes `data-cq`, not `data-editor-id` (only `Editable`
 * does), so the heading carries its own hook — the same way `data-row-treatment`
 * and `data-presentation` mark the L2.3/L2.4 capabilities.
 */
const headingIn = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[data-block-heading="social"]');

describe('social heading · opt-in, and nothing until written', () => {
  it('renders no heading on a page that never had one', () => {
    const { host, root } = renderSocial();
    expect(headingIn(host)).toBeNull();
    act(() => root.unmount());
  });

  it('renders nothing for a heading that is only whitespace', () => {
    const { host, root } = renderSocial('   ');
    expect(headingIn(host)).toBeNull();
    act(() => root.unmount());
  });

  it('renders the authored text once written', () => {
    const { host, root } = renderSocial('Nuestras redes');
    const heading = headingIn(host);
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain('Nuestras redes');
    act(() => root.unmount());
  });

  it('is the author’s text, not the target’s copy', () => {
    // The point of the fixture: any string renders, so nothing is hardcoded.
    const { host, root } = renderSocial('Encuéntranos');
    expect(headingIn(host)?.textContent).toContain('Encuéntranos');
    act(() => root.unmount());
  });

  it('leaves the social group itself intact', () => {
    const { host, root } = renderSocial('Nuestras redes');
    expect(host.querySelectorAll('[data-editor-id^="social."]').length).toBeGreaterThan(1);
    act(() => root.unmount());
  });
});

describe('social heading · persists and reaches the public page', () => {
  it('round-trips through save and reload', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.blocks = [{ key: 'social', type: 'social' }];
    state.doc.texts['social.title'] = 'Nuestras redes';

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.texts['social.title']).toBe('Nuestras redes');
  });

  it('renders on the public page', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.blocks = [{ key: 'social', type: 'social' }];
    pageDocument.texts['social.title'] = 'Nuestras redes';

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.textContent).toContain('Nuestras redes');
    act(() => root.unmount());
    host.remove();
  });

  it('adds no heading to the public page when none was written', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.blocks = [{ key: 'social', type: 'social' }];

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.querySelector('[data-block-heading="social"]')).toBeNull();
    act(() => root.unmount());
    host.remove();
  });
});
