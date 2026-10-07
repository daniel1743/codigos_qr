// @vitest-environment happy-dom
/**
 * L1 · Free page-level colour tokens.
 *
 * The audit found this was the single highest-impact gap: none of the twelve
 * Magic Patterns accents matched any of the 16 presets (ΔE 4.6 … 88.7), and the
 * accent was not authorable at all. These tests pin three things:
 *
 *   1. every token reaches the DOM through the CSS custom properties the whole
 *      renderer already reads — no new render branch;
 *   2. a page that never sets them renders exactly as before;
 *   3. the overrides persist and keep the document valid magic-page V1.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import {
  createInitialMagicEditorState,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';
import { detectDocumentKind } from '../../../features/magic-page-editor-production/document-session';
import type { TemplateId } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function renderPage(templateId: TemplateId, page: Record<string, string>) {
  const state = createInitialMagicEditorState(templateId);
  state.doc.props.page = page;
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider initialTemplate={templateId} initialDocument={state}>
        <TemplateRenderer showLandingBotPreview={false} />
      </EditorProvider>,
    );
  });
  const pageEl = host.querySelector<HTMLElement>('[data-page-family]');
  const style = pageEl?.getAttribute('style') ?? '';
  return { host, root, style, state };
}

/**
 * Reads one custom property out of the inline style. Matching the variable is
 * stricter than "the hex appears somewhere" — the same hex can legitimately
 * arrive through a different token (the `cream` palette uses #8A7A5B for both
 * its accent and its muted tone).
 */
function cssVar(style: string, name: string): string | undefined {
  return style.match(new RegExp(`${name}:\\s*([^;]+)`))?.[1]?.trim();
}

describe('L1 · every free colour token reaches the rendered page', () => {
  it.each([
    ['accent', '--accent', '#2F6B4F'],
    ['accentFg', '--accent-fg', '#FFFFFF'],
    ['mutedColor', '--muted', '#5F6B63'],
    ['surfaceColor', '--surface', '#FFFDF8'],
    ['lineColor', '--line', '#E8E1D4'],
  ])('applies page.%s to %s', (key, variable, hex) => {
    const { root, style } = renderPage('bio', { [key]: hex });
    // `--muted` is emitted as `var(--unify-muted, <colour>)`, so compare loosely
    // for that one; the others are literal values.
    expect(cssVar(style, variable)).toContain(hex);
    act(() => root.unmount());
  });

  it('applies all five at once without interfering with each other', () => {
    const { root, style } = renderPage('bio', {
      accent: '#2F6B4F',
      accentFg: '#FFFFFF',
      mutedColor: '#5F6B63',
      surfaceColor: '#FFFDF8',
      lineColor: '#E8E1D4',
    });
    expect(cssVar(style, '--accent')).toBe('#2F6B4F');
    expect(cssVar(style, '--accent-fg')).toBe('#FFFFFF');
    expect(cssVar(style, '--muted')).toContain('#5F6B63');
    expect(cssVar(style, '--surface')).toBe('#FFFDF8');
    expect(cssVar(style, '--line')).toBe('#E8E1D4');
    act(() => root.unmount());
  });
});

describe('L1 · pages that never set a token are untouched', () => {
  it('falls back to the template theme accent when nothing is set', () => {
    // Business ships `accent: '#1F4E55'` in data/templates.ts.
    const { root, style } = renderPage('business', {});
    expect(cssVar(style, '--accent')).toBe('#1F4E55');
    act(() => root.unmount());
  });

  it('ignores an empty string, which is how the editor clears a token', () => {
    const { root, style } = renderPage('business', { accent: '', mutedColor: '', lineColor: '' });
    expect(cssVar(style, '--accent')).toBe('#1F4E55');
    act(() => root.unmount());
  });
});

describe('L1 · precedence is explicit → palette → template theme', () => {
  it('lets an explicit accent win over the palette accent', () => {
    // `cream` contributes accent #8A7A5B; the explicit prop must beat it. The
    // same hex is also cream's muted tone, so assert on `--accent` alone.
    const { root, style } = renderPage('bio', { palette: 'cream', accent: '#C2502A' });
    expect(cssVar(style, '--accent')).toBe('#C2502A');
    act(() => root.unmount());
  });

  it('uses the palette accent when only a palette is chosen', () => {
    const { root, style } = renderPage('bio', { palette: 'cream' });
    expect(cssVar(style, '--accent')).toBe('#8A7A5B');
    act(() => root.unmount());
  });
});

describe('L1 · tokens persist and keep the document loadable', () => {
  const TOKENS = {
    accent: '#2340D9',
    accentFg: '#FFFFFF',
    mutedColor: '#A39C8F',
    surfaceColor: '#191816',
    lineColor: '#2B2925',
  } as const;

  it('survives serialize → hydrate with every value intact', () => {
    const state = createInitialMagicEditorState('portfolio');
    state.doc.props.page = { ...TOKENS };

    const serialized = serializeMagicEditorState(state);
    const reloaded = hydrateMagicEditorState(serialized);

    expect(reloaded.doc.props.page).toEqual({ ...TOKENS });
  });

  it('keeps the document recognised as MAGIC_V1 on reload', () => {
    const state = createInitialMagicEditorState('portfolio');
    state.doc.props.page = { ...TOKENS };
    expect(detectDocumentKind(serializeMagicEditorState(state))).toBe('MAGIC_V1');
  });

  it('writes only strings, which is what the load validator requires', () => {
    const state = createInitialMagicEditorState('portfolio');
    state.doc.props.page = { ...TOKENS };
    const props = serializeMagicEditorState(state).props;
    for (const value of Object.values(props['page'] ?? {})) {
      expect(typeof value).toBe('string');
    }
  });
});
