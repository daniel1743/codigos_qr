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
import { textStyleToCss } from '../utils/styles';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

/**
 * E1.3 — product definition: "Unificar color" controls the colour of CONTENT
 * text (not every colour on the page). A content text with an individually
 * persisted colour must yield to the page-level override, while surfaces,
 * backgrounds, the map base, branding and cards with their own palette keep
 * their own colours. `goldText` stays an EXPLICIT exception (accent wins) and is
 * surfaced in the UI by `TypographyTreatmentPicker`.
 */
describe('E1.3 "Unificar color" contract — pure', () => {
  it('leaves a persisted content colour untouched while the unify is off', () => {
    expect(textStyleToCss({ color: '#D4AF6A' })).toMatchObject({ color: '#D4AF6A' });
  });

  it('makes a persisted content colour follow the active unify colour', () => {
    expect(textStyleToCss({ color: '#D4AF6A' }, { unifyFg: '#FFB700' })).toMatchObject({
      color: '#FFB700',
    });
  });

  it('never recolours a scope with its own palette (card.0 style)', () => {
    expect(
      textStyleToCss({ color: '#3A2A1E' }, { unifyFg: '#FFB700', unifyEligible: false }),
    ).toMatchObject({ color: '#3A2A1E' });
  });

  it('keeps goldText as an explicit semantic exception (accent always wins)', () => {
    expect(textStyleToCss({ goldText: true, color: '#D4AF6A' }, { unifyFg: '#FFB700' })).toMatchObject({
      color: 'var(--accent, #B8935A)',
    });
    expect(
      textStyleToCss({ goldText: true }, { unifyFg: '#FFB700', unifyEligible: false }),
    ).toMatchObject({ color: 'var(--accent, #B8935A)' });
  });

  it('leaves elements without a persisted colour untouched', () => {
    expect(textStyleToCss(undefined)).toEqual({});
    expect(textStyleToCss({})).toEqual({});
    expect(textStyleToCss({ color: undefined })).toEqual({});
  });

  it('never emits surface/background keys, so the unify cannot repaint surfaces', () => {
    const css = textStyleToCss({ color: '#111111', size: 18 }, { unifyFg: '#FFB700' });
    expect(Object.keys(css)).not.toContain('background');
    expect(Object.keys(css)).not.toContain('backgroundColor');
    expect(Object.keys(css)).not.toContain('--surface');
    expect(Object.keys(css)).not.toContain('--fg');
  });

  it('covers the real page: pinned content colours unify, card surfaces do not', () => {
    const pageContent = ['#D4AF6A', '#FFB700', '#E4D2B5', '#F7F0E6', '#2A2521', '#BFAE96'];
    for (const color of pageContent) {
      expect(textStyleToCss({ color }, { unifyFg: '#FFB700' }).color).toBe('#FFB700');
      expect(textStyleToCss({ color }, { unifyFg: '#FFB700', unifyEligible: false }).color).toBe(color);
    }
  });
});

describe('E1.3 "Unificar color" contract — wired into the page', () => {
  function rgb(color: string): string {
    const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
    if (!hex) return color.trim();
    const value = hex[1];
    return `rgb(${parseInt(value.slice(0, 2), 16)}, ${parseInt(value.slice(2, 4), 16)}, ${parseInt(value.slice(4, 6), 16)})`;
  }

  function mountWith(overrides: (doc: ReturnType<typeof createInitialMagicPageDocument>) => void) {
    const documentState = createInitialMagicPageDocument('bio');
    overrides(documentState);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(
      <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)}>
        <TemplateRenderer />
      </EditorProvider>,
    ));
    return { host, root, documentState };
  }

  function heroNameColors(host: HTMLElement): string[] {
    return Array.from(host.querySelectorAll<HTMLElement>('*'))
      .filter((element) => element.textContent?.trim() === 'Marina Solé')
      .map((element) => element.style.color)
      .filter(Boolean);
  }

  it('applies the unify colour to a content text that carries its own colour', () => {
    const { host, root } = mountWith((documentState) => {
      documentState.props.page = { ...(documentState.props.page ?? {}), textColor: '#FFB700' };
      documentState.textStyles['hero.name'] = { color: '#D4AF6A' };
    });
    const colors = heroNameColors(host);
    expect(colors.length).toBeGreaterThan(0);
    expect(rgb(colors[0])).toBe(rgb('#FFB700'));
    act(() => root.unmount());
  });

  it('keeps the persisted colour when the unify is off (no behaviour change)', () => {
    const { host, root } = mountWith((documentState) => {
      documentState.textStyles['hero.name'] = { color: '#D4AF6A' };
    });
    const colors = heroNameColors(host);
    expect(colors.length).toBeGreaterThan(0);
    expect(rgb(colors[0])).toBe(rgb('#D4AF6A'));
    act(() => root.unmount());
  });

  it('exposes --unify-fg on the page root in both editor and published output', () => {
    const documentState = createInitialMagicPageDocument('bio');
    documentState.props.page = { ...(documentState.props.page ?? {}), textColor: '#FFB700' };
    documentState.textStyles['hero.name'] = { color: '#D4AF6A' };
    const saved = serializeMagicEditorState(hydrateMagicEditorState(documentState));

    const editorHost = document.createElement('div');
    document.body.append(editorHost);
    const editorRoot = createRoot(editorHost);
    act(() => editorRoot.render(
      <EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(saved)}>
        <TemplateRenderer />
      </EditorProvider>,
    ));

    const publicHost = document.createElement('div');
    document.body.append(publicHost);
    const publicRoot = createRoot(publicHost);
    act(() => publicRoot.render(<MagicPublicRenderer document={saved} />));

    const editorPage = editorHost.querySelector<HTMLElement>('[data-page-family]');
    const publicPage = publicHost.querySelector<HTMLElement>('[data-page-family]');
    expect(editorPage?.style.getPropertyValue('--unify-fg')).toBe('#FFB700');
    expect(publicPage?.style.getPropertyValue('--unify-fg')).toBe('#FFB700');
    expect(editorPage?.style.getPropertyValue('--fg')).toBe('var(--unify-fg, #FFB700)');

    act(() => editorRoot.unmount());
    act(() => publicRoot.unmount());
  });
});
