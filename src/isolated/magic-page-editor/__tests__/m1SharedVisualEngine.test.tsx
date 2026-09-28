// @vitest-environment happy-dom
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

function mountEditor(props: Record<string, Record<string, string>>, textStyles: Record<string, Record<string, unknown>> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(<EditorProvider initialTemplate="bio" initialDocument={{
      templateId: 'bio',
      doc: {
        blocks: [
          { key: 'hero', type: 'hero' }, { key: 'social', type: 'social' }, { key: 'links', type: 'links' },
          { key: 'collection', type: 'collection' }, { key: 'gallery', type: 'gallery' }
        ], texts: {}, textStyles: textStyles as never, props, removed: {}
      }
    }}><TemplateRenderer /></EditorProvider>);
  });
  return { host, root };
}

describe('M1 shared visual engine', () => {
  it('renders the CTA treatment matrix and shared media shape through PageDoc props', () => {
    const { host, root } = mountEditor({
      page: { palette: 'silver', decorRing: 'on' },
      'links.0': { variant: 'glass', shape: 'circle', size: 'lg', iconPosition: 'none', kind: 'card' },
      'collection.0.img': { shape: 'oval', fit: 'contain' },
      'block:social': { socialLayout: 'arc', socialShape: 'rounded', socialFill: 'outline', socialSize: 'lg' }
    }, { 'hero.name': { typeStyle: 'luxury', weight: 'medium', tracking: 'wide', goldText: true } });

    const cta = host.querySelector<HTMLElement>('[data-variant="glass"]');
    expect(cta?.dataset['shape']).toBe('circle');
    expect(cta?.dataset['size']).toBe('lg');
    expect(cta?.dataset['kind']).toBe('card');
    expect(host.querySelector<HTMLElement>('[data-social-layout="arc"]')).not.toBeNull();
    expect(host.querySelector<HTMLElement>('[data-decoration-layer]')?.className).toContain('pointer-events-none');
    expect(host.querySelector<HTMLElement>('[data-editor-id="collection.0.img"]')?.style.borderRadius).toBe('50%');
    expect(host.querySelector<HTMLElement>('[data-page-family]')?.style.background).toBe('#D9DBE0');

    act(() => root.unmount());
  });

  it('preserves M1 props through Magic serialization and public rendering', () => {
    const magicDocument = createInitialMagicPageDocument('bio');
    magicDocument.props = {
      page: { palette: 'caramel', decorWave: 'on' },
      'links.0': { variant: 'ghost', shape: 'soft', size: 'full', iconPosition: 'right', kind: 'standard' },
      'collection.0.img': { shape: 'arch' },
      'block:social': { socialLayout: 'cluster' }
    };
    magicDocument.textStyles = { 'hero.name': { typeStyle: 'editorial', weight: 'bold', tracking: 'tight', upper: true, goldText: true } };
    const roundTrip = serializeMagicEditorState(hydrateMagicEditorState(magicDocument));
    expect(roundTrip.props).toEqual(magicDocument.props);
    expect(roundTrip.textStyles).toEqual(magicDocument.textStyles);

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<MagicPublicRenderer document={roundTrip} />));
    expect(host.querySelector('[data-variant="ghost"]')).not.toBeNull();
    expect(host.querySelector('[data-social-layout="cluster"]')).not.toBeNull();
    expect(host.querySelector('[data-decoration-layer]')).not.toBeNull();
    act(() => root.unmount());
  });
});
