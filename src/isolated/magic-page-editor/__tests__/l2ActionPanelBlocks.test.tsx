// @vitest-environment happy-dom
/**
 * L2.5 · `cta`, `whatsapp` and `contact` — one primitive, three block types.
 *
 * The two things this suite exists to hold apart:
 *
 *  · SEMANTICS — where the block sends the visitor. A real `href`, validated by
 *    the project's own `normalizeDestination`. An unusable destination renders
 *    NO `href` rather than `href=""`, which would be an anchor that quietly
 *    reloads the page: a dead link wearing a live one's clothes.
 *
 *  · PRESENTATION — how the block is painted. A panel surface, and nothing more.
 *
 * The tests that matter are the ones proving the two compose independently: the
 * same destination renders on all three surfaces, and changing the surface never
 * changes the link.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { blockKit, blockLabels } from '../data/blockKit';
import {
  ACTION_KINDS,
  ACTION_SEEDS,
  PANEL_SURFACES,
  actionHref,
  actionIsValid,
  actionKindOf,
  resolvePanelSurface,
} from '../utils/actionPanelOps';
import { ACTION_PANEL_DEFAULT, CONTACT_ROWS } from '../components/blocks/ActionPanelBlock';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { MagicPublicRenderer } from '../../../features/magic-page-editor-production/MagicPublicRenderer';
import type { MagicEditorStateV1 } from '../../../features/magic-page-editor-production/magic-document';
import type { BlockType } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const TYPES: BlockType[] = ['cta', 'whatsapp', 'contact'];

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

function renderBlock(
  type: BlockType,
  props: Record<string, Record<string, string>> = {},
  texts: Record<string, string> = {}
) {
  const state = createInitialMagicEditorState('business');
  state.doc.blocks = [{ key: type, type }];
  state.doc.props = { ...state.doc.props, ...props };
  state.doc.texts = { ...state.doc.texts, ...texts };
  return mount(state);
}

const panelIn = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-panel-surface]');
const actionIn = (host: HTMLElement, type: BlockType) =>
  host.querySelector<HTMLAnchorElement>(`[data-editor-id="${type}.action"]`);

describe('L2.5 · the panel vocabulary', () => {
  it('keeps the type’s own default for anything unrecognised', () => {
    expect(resolvePanelSurface(undefined, 'accent')).toBe('accent');
    expect(resolvePanelSurface('nonsense', 'plain')).toBe('plain');
  });

  it('accepts the three surfaces', () => {
    expect(resolvePanelSurface('plain', 'accent')).toBe('plain');
    expect(resolvePanelSurface('surface', 'accent')).toBe('surface');
    expect(resolvePanelSurface('accent', 'plain')).toBe('accent');
  });

  it('offers exactly the three surfaces the picker shows', () => {
    expect(PANEL_SURFACES.map((o) => o.value)).toEqual(['plain', 'surface', 'accent']);
  });

  it('gives each block type its own default, matching the target', () => {
    expect(ACTION_PANEL_DEFAULT.cta).toBe('accent');
    expect(ACTION_PANEL_DEFAULT.whatsapp).toBe('surface');
    expect(ACTION_PANEL_DEFAULT.contact).toBe('plain');
  });
});

describe('L2.5 · destinations are validated, never dead', () => {
  it('reads the action kind back off a stored destination', () => {
    expect(actionKindOf('https://wa.me/34600000000')).toBe('whatsapp');
    expect(actionKindOf('mailto:hola@tudominio.com')).toBe('email');
    expect(actionKindOf('tel:+34600000000')).toBe('phone');
    expect(actionKindOf('https://tudominio.com')).toBe('web');
    expect(actionKindOf(undefined)).toBe('web');
  });

  it('normalises the destinations the seed uses', () => {
    for (const kind of ACTION_KINDS.map((k) => k.value)) {
      const seed = ACTION_SEEDS[kind];
      // `https://` alone is the web seed and is deliberately incomplete until
      // the author types a domain; the other three ship usable.
      if (kind === 'web') continue;
      expect(actionHref(seed), `${kind} seed should be usable`).not.toBe('');
      expect(actionIsValid(seed)).toBe(true);
    }
  });

  it('returns empty for a destination that cannot be used', () => {
    expect(actionHref('')).toBe('');
    expect(actionHref('https://')).toBe('');
    expect(actionHref('mailto:sin-arroba')).toBe('');
    expect(actionHref('con espacios.com')).toBe('');
  });

  it('keeps a usable destination exactly', () => {
    expect(actionHref('https://tudominio.com')).toBe('https://tudominio.com');
    expect(actionHref('mailto:hola@tudominio.com')).toBe('mailto:hola@tudominio.com');
  });

  it('refuses a destination with spaces, including a spaced phone number', () => {
    // `normalizeDestination` rejects whitespace before it ever looks at the
    // scheme, so "+34 600 000 000" is refused as typed. That is the existing
    // contract every button group already lives under; L2.5 reuses it rather
    // than relaxing it behind the rest of the product's back.
    expect(actionHref('tel:+34 600 000 000')).toBe('');
    expect(actionHref('tel:+34600000000')).toBe('tel:+34600000000');
  });
});

describe('L2.5 · the three types are one primitive with different defaults', () => {
  it.each(TYPES)('renders %s with its own default surface', (type) => {
    const { host, root } = renderBlock(type);
    expect(panelIn(host)?.dataset['panelSurface']).toBe(ACTION_PANEL_DEFAULT[type as 'cta' | 'whatsapp' | 'contact']);
    act(() => root.unmount());
  });

  it.each(TYPES)('renders %s with one action element', (type) => {
    const { host, root } = renderBlock(type);
    const action = actionIn(host, type);
    expect(action).not.toBeNull();
    expect(action?.tagName).toBe('A');
    act(() => root.unmount());
  });

  it('gives whatsapp and contact a usable destination out of the box', () => {
    // `cta` seeds `https://`, which needs a domain before it can link — the same
    // state a brand-new button group already starts in. The two blocks whose
    // whole point is a reachable destination ship reachable.
    for (const type of ['whatsapp', 'contact'] as const) {
      const { host, root } = renderBlock(type);
      expect(actionIn(host, type)?.getAttribute('href'), type).toBeTruthy();
      act(() => root.unmount());
    }
  });

  it('is offered in the Block Kit with its own label', () => {
    for (const type of TYPES) {
      expect(blockKit.some((b) => b.type === type)).toBe(true);
      expect(blockLabels[type as 'cta' | 'whatsapp' | 'contact'].trim().length).toBeGreaterThan(2);
    }
  });

  it('shares one anatomy across the three', () => {
    // Same primitive, so all three publish the same panel and action hooks.
    for (const type of TYPES) {
      const { host, root } = renderBlock(type);
      expect(panelIn(host), `${type} panel`).not.toBeNull();
      expect(actionIn(host, type), `${type} action`).not.toBeNull();
      act(() => root.unmount());
    }
  });
});

describe('L2.5 · presentation and semantics compose independently', () => {
  it.each(['plain', 'surface', 'accent'])('paints the %s surface without touching the link', (surface) => {
    const destination = 'https://wa.me/34600111222';
    const { host, root } = renderBlock('whatsapp', {
      'block:whatsapp': { panelSurface: surface },
      'whatsapp.action': { href: destination },
    });
    expect(panelIn(host)?.dataset['panelSurface']).toBe(surface);
    expect(actionIn(host, 'whatsapp')?.getAttribute('href')).toBe(destination);
    act(() => root.unmount());
  });

  it('changes the destination without changing the surface', () => {
    const { host, root } = renderBlock('cta', {
      'block:cta': { panelSurface: 'plain' },
      'cta.action': { href: 'mailto:hola@tudominio.com' },
    });
    expect(panelIn(host)?.dataset['panelSurface']).toBe('plain');
    expect(actionIn(host, 'cta')?.getAttribute('href')).toBe('mailto:hola@tudominio.com');
    act(() => root.unmount());
  });

  it('describes the action kind on the panel, from the destination', () => {
    const { host, root } = renderBlock('whatsapp', {
      'whatsapp.action': { href: 'https://wa.me/34600111222' },
    });
    expect(panelIn(host)?.dataset['actionKind']).toBe('whatsapp');
    act(() => root.unmount());
  });

  it('omits the href entirely for an unusable destination', () => {
    const { host, root } = renderBlock('cta', { 'cta.action': { href: 'https://' } });
    const action = actionIn(host, 'cta');
    // Present and selectable, but not a link — not `href=""`.
    expect(action).not.toBeNull();
    expect(action?.hasAttribute('href')).toBe(false);
    act(() => root.unmount());
  });

  it('keeps a deliberately cleared destination cleared', () => {
    const { host, root } = renderBlock('whatsapp', { 'whatsapp.action': { href: '' } });
    expect(actionIn(host, 'whatsapp')?.hasAttribute('href')).toBe(false);
    act(() => root.unmount());
  });
});

describe('L2.5 · contact rows are links only when they can be', () => {
  it('renders no row until its label is written', () => {
    const { host, root } = renderBlock('contact');
    expect(host.querySelectorAll('[data-contact-row]')).toHaveLength(0);
    act(() => root.unmount());
  });

  it('renders a labelled row with a destination as a real link', () => {
    const { host, root } = renderBlock('contact', { 'contact.email': { href: 'mailto:hola@x.com' } }, {
      'contact.email.label': 'hola@x.com',
    });
    const row = host.querySelector<HTMLAnchorElement>('[data-contact-row="email"]');
    expect(row?.tagName).toBe('A');
    expect(row?.getAttribute('href')).toBe('mailto:hola@x.com');
    act(() => root.unmount());
  });

  it('renders a labelled row with no destination as plain text', () => {
    const { host, root } = renderBlock('contact', {}, { 'contact.address.label': 'Calle Mayor 1' });
    const row = host.querySelector<HTMLElement>('[data-contact-row="address"]');
    expect(row?.tagName).toBe('SPAN');
    expect(row?.hasAttribute('href')).toBe(false);
    // The label still shows: an address has nothing to link to.
    expect(row?.textContent).toContain('Calle Mayor 1');
    act(() => root.unmount());
  });

  it('offers exactly the three rows the target has', () => {
    expect(CONTACT_ROWS.map((r) => r.key)).toEqual(['email', 'phone', 'address']);
  });
});

describe('L2.5 · persists and reaches the public page', () => {
  it('round-trips the surface, the texts and the destinations', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.blocks = [{ key: 'contact', type: 'contact' }];
    state.doc.props['block:contact'] = { panelSurface: 'accent' };
    state.doc.props['contact.action'] = { href: 'tel:+34600111222' };
    state.doc.props['contact.email'] = { href: 'mailto:hola@x.com' };
    state.doc.texts['contact.title'] = 'Hablemos';
    state.doc.texts['contact.email.label'] = 'hola@x.com';

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.props['block:contact']?.['panelSurface']).toBe('accent');
    expect(reloaded.doc.props['contact.action']?.['href']).toBe('tel:+34600111222');
    expect(reloaded.doc.texts['contact.title']).toBe('Hablemos');
  });

  it('renders on the public page', () => {
    const pageDocument = createInitialMagicPageDocument('business');
    pageDocument.blocks = [{ key: 'whatsapp', type: 'whatsapp' }];
    pageDocument.props['block:whatsapp'] = { panelSurface: 'accent' };
    pageDocument.props['whatsapp.action'] = { href: 'https://wa.me/34600111222' };
    pageDocument.texts['whatsapp.title'] = 'Escríbenos';

    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<MagicPublicRenderer document={pageDocument} />);
    });

    expect(host.querySelector('[data-panel-surface="accent"]')).not.toBeNull();
    expect(host.textContent).toContain('Escríbenos');
    expect(host.querySelector('[data-editor-id="whatsapp.action"]')?.getAttribute('href')).toBe(
      'https://wa.me/34600111222'
    );
    act(() => root.unmount());
    host.remove();
  });

  it('never renders href="" on the public page, whatever is stored', () => {
    // The failure this pins: an anchor with `href=""` reloads the current page,
    // so it looks live and behaves dead. Neither a cleared nor a half-typed
    // destination may produce one.
    for (const stored of ['', 'https://', 'con espacios.com']) {
      const pageDocument = createInitialMagicPageDocument('business');
      pageDocument.blocks = [{ key: 'cta', type: 'cta' }];
      pageDocument.props['cta.action'] = { href: stored };

      const host = document.createElement('div');
      document.body.append(host);
      const root = createRoot(host);
      act(() => {
        root.render(<MagicPublicRenderer document={pageDocument} />);
      });

      const action = host.querySelector('[data-editor-id="cta.action"]');
      expect(action, `stored "${stored}"`).not.toBeNull();
      expect(action?.getAttribute('href'), `stored "${stored}"`).not.toBe('');
      act(() => root.unmount());
      host.remove();
    }
  });
});
