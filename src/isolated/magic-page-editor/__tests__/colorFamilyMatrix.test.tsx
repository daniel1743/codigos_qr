// @vitest-environment happy-dom
// Adapted from the historical `colorFamilyMatrix.test.tsx` (f78ca43 → af9acb9).
// The original line asserted that `visualPalettes` WAS the family matrix; here the
// family matrix lives beside the 16 named themes, so the assertions that used to
// read `visualPalettes` read `familyPalettes`, and the theme-preservation gates
// that the historical branch never needed were added.
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PalettePicker } from '../components/editor/controls/PalettePicker';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { allPalettes, cardPaletteTokens, colorFamilies, familyPalettes, familyPalettesByFamily, legacyPaletteMap, visualPaletteById, visualPalettes } from '../data/visualPresets';
import { createInitialMagicPageDocument, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import type { PalettePreset, PaletteSemanticTokens } from '../types/editor';

const SEMANTIC: (keyof PaletteSemanticTokens)[] = ['pageBackground', 'surface', 'secondarySurface', 'text', 'muted', 'accent', 'accentFg', 'line', 'ctaBackground', 'ctaForeground', 'iconSurface', 'iconForeground'];
const isHex = (value: unknown): boolean => typeof value === 'string' && /^#[0-9A-F]{6}$/.test(value);

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function mount(node: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root };
}

/** The picker reads the editor context, so every mount runs inside a provider. */
function mountPicker(props: { value?: string; onChange: (value: string) => void }) {
  return mount(<EditorProvider initialTemplate="bio"><PalettePicker {...props} /></EditorProvider>);
}

function mountPage(palette: string) {
  const documentState = createInitialMagicPageDocument('bio');
  documentState.props['page'] = { ...(documentState.props['page'] ?? {}), family: 'bio', palette };
  return mount(<EditorProvider initialTemplate="bio" initialDocument={hydrateMagicEditorState(documentState)}><TemplateRenderer /></EditorProvider>);
}

describe('Magic color family matrix', () => {
  it('defines 12 families, six variants each, and 72 unique family palettes', () => {
    expect(colorFamilies).toHaveLength(12);
    expect(colorFamilies.every((family) => family.variants.length === 6)).toBe(true);
    expect(familyPalettes).toHaveLength(72);
    expect(new Set(familyPalettes.map((palette) => palette.id)).size).toBe(72);
    expect(allPalettes).toHaveLength(88);
    expect(new Set(allPalettes.map((palette) => palette.id)).size).toBe(88);
  });

  it('gives every family palette the twelve-token semantic contract, coherent with its page tone', () => {
    for (const palette of familyPalettes) {
      const semantic = palette.semantic;
      expect(semantic, palette.id).toBeDefined();
      expect(Object.keys(semantic ?? {}), palette.id).toEqual(expect.arrayContaining(SEMANTIC));
      for (const key of SEMANTIC) expect(isHex(semantic?.[key]), `${palette.id}.${key}=${String(semantic?.[key])}`).toBe(true);
      expect(semantic?.pageBackground, palette.id).toBe(palette.page.color);
      expect(semantic?.surface, palette.id).toBe(palette.page.surface);
      expect(semantic?.text, palette.id).toBe(palette.page.fg);
      expect(semantic?.muted, palette.id).toBe(palette.page.muted);
      expect(semantic?.line, palette.id).toBe(palette.page.line);
      expect(semantic?.accent, palette.id).toBe(palette.accent);
      expect(semantic?.accentFg, palette.id).toBe(palette.accentFg);
      expect(semantic?.ctaBackground, palette.id).toBe(palette.accent);
      expect(semantic?.ctaForeground, palette.id).toBe(palette.accentFg);
      expect(palette.familyId, palette.id).toBeDefined();
      expect(palette.variantId, palette.id).toBeDefined();
    }
    for (const family of colorFamilies)
      expect(familyPalettesByFamily[family.id]?.map((palette) => palette.id), family.id).toEqual(family.variants.map((_, index) => `${family.id}-${['light', 'soft', 'medium', 'rich', 'dark', 'premium'][index]}`));
  });

  it('keeps the 16 named themes in order and with their exact colours', () => {
    expect(visualPalettes.map((palette) => palette.id)).toEqual([
      'cream', 'black', 'teal', 'sage', 'silver', 'caramel',
      'red-energy', 'amber-sunny', 'lavender-soft', 'purple-editorial', 'cyan-electric',
      'mono-editorial', 'ice-blue', 'emerald-deep', 'terracotta', 'neon-dark'
    ]);
    // The six original ids the module documents as a compatibility contract.
    expect(visualPalettes.find((palette) => palette.id === 'cream')).toMatchObject({ page: { color: '#FBF8F1', fg: '#3A3329' }, accent: '#8A7A5B' });
    expect(visualPalettes.find((palette) => palette.id === 'caramel')).toMatchObject({ page: { color: '#6E4F3A', fg: '#F7EEE4' }, accent: '#B98A5A' });
    expect(visualPalettes.find((palette) => palette.id === 'black')).toMatchObject({ page: { color: '#0E0D0C', fg: '#E9DCC6' }, accent: '#D4AF6A' });
    expect(visualPalettes.find((palette) => palette.id === 'teal')).toMatchObject({ page: { color: '#1F4E57', fg: '#F7F0E6' }, accent: '#E4D2B5' });
    expect(visualPalettes.find((palette) => palette.id === 'sage')).toMatchObject({ page: { color: '#545D50', fg: '#FFFFFF' }, accent: '#6B7A4E' });
    expect(visualPalettes.find((palette) => palette.id === 'silver')).toMatchObject({ page: { color: '#F5F6F8', fg: '#121316' }, accent: '#3A3D44' });
    // The resolver returns the very same objects: the matrix cannot repaint them.
    for (const theme of visualPalettes) expect(visualPaletteById[theme.id], theme.id).toBe(theme);
    expect(Object.keys(cardPaletteTokens)).toEqual(visualPalettes.map((palette) => palette.id));
  });

  it('resolves every legacy id without repainting an id that already exists', () => {
    expect(Object.keys(legacyPaletteMap)).toHaveLength(22);
    for (const [legacyId, canonicalId] of Object.entries(legacyPaletteMap)) {
      const resolved = visualPaletteById[legacyId];
      const canonical = visualPaletteById[canonicalId];
      expect(resolved, legacyId).toBeDefined();
      expect(canonical, canonicalId).toBeDefined();
      const named = visualPalettes.find((palette) => palette.id === legacyId);
      if (named) expect(resolved, legacyId).toBe(named);
      else expect(resolved?.familyId, legacyId).toBe(canonical?.familyId);
    }
    // Legacy ids stay aliases: they never become family cards of their own.
    expect(familyPalettes.some((palette) => palette.id === 'red-energy')).toBe(false);
    expect(familyPalettes.some((palette) => palette.id === 'silver-minimal')).toBe(false);
  });

  it('navigates from 12 families to six variants and applies the variant on select', () => {
    const changes: string[] = [];
    const { host, root } = mountPicker({ onChange: (value) => changes.push(value) });
    expect(host.querySelectorAll('[data-palette-families] button')).toHaveLength(12);
    expect(host.querySelector('[data-palette-grid]')).toBeNull();
    expect(host.querySelector('[data-theme-grid]')).toBeNull();
    act(() => (host.querySelector('[data-palette-families] button') as HTMLButtonElement).click());
    expect(host.querySelectorAll('[data-palette-grid] button')).toHaveLength(6);
    expect(host.querySelectorAll('[data-palette-families] button')).toHaveLength(0);
    const [firstFamily] = colorFamilies;
    if (!firstFamily) throw new Error('colorFamilies está vacío');
    act(() => (host.querySelector('[data-palette-grid] button') as HTMLButtonElement).click());
    expect(changes).toEqual([`${firstFamily.id}-light`]);
    // Back to the family grid without touching the document.
    const back = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Familias') as HTMLButtonElement;
    act(() => back.click());
    expect(host.querySelectorAll('[data-palette-families] button')).toHaveLength(12);
    expect(host.querySelector('[data-palette-grid]')).toBeNull();
    expect(changes).toHaveLength(1);
    act(() => root.unmount());
  });

  it('keeps the 16 themes selectable in the Temas mode', () => {
    const changes: string[] = [];
    const { host, root } = mountPicker({ onChange: (value) => changes.push(value) });
    const themesTab = [...host.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((button) => button.textContent?.trim() === 'Temas') as HTMLButtonElement;
    act(() => themesTab.click());
    expect(changes).toHaveLength(0);
    expect(host.querySelectorAll('[data-theme-grid] button')).toHaveLength(16);
    expect(host.querySelector('[data-palette-families]')).toBeNull();
    const [firstTheme] = visualPalettes;
    if (!firstTheme) throw new Error('visualPalettes está vacío');
    act(() => (host.querySelector('[data-theme-grid] button') as HTMLButtonElement).click());
    expect(changes).toEqual([firstTheme.id]);
    act(() => root.unmount());
  });

  it('opens on the active palette and marks it as selected in both systems', () => {
    const family = mountPicker({ value: 'blue-rich', onChange: () => undefined });
    expect(family.host.querySelectorAll('[data-palette-grid] button')).toHaveLength(6);
    const selectedVariant = family.host.querySelectorAll('[data-palette-grid] button[aria-pressed="true"]');
    expect(selectedVariant).toHaveLength(1);
    expect(selectedVariant[0]?.textContent).toContain('Cobalt');
    expect(family.host.textContent).toContain('Seleccionada:');
    act(() => family.root.unmount());

    const theme = mountPicker({ value: 'red-energy', onChange: () => undefined });
    expect(theme.host.querySelectorAll('[data-theme-grid] button')).toHaveLength(16);
    const selectedTheme = theme.host.querySelectorAll('[data-theme-grid] button[aria-pressed="true"]');
    expect(selectedTheme).toHaveLength(1);
    expect(selectedTheme[0]?.textContent).toContain('Red Energy');
    act(() => theme.root.unmount());
  });

  it('propagates a family palette to the rendered page through the existing tokens', () => {
    const palette = visualPaletteById['blue-rich'] as PalettePreset;
    const { host, root } = mountPage('blue-rich');
    const page = host.querySelector<HTMLElement>('[data-page-family]');
    expect(page).not.toBeNull();
    expect(page?.style.background).toBe(palette.page.color);
    expect(page?.style.getPropertyValue('--surface')).toBe(palette.page.surface);
    expect(page?.style.getPropertyValue('--line')).toBe(palette.page.line);
    expect(page?.style.getPropertyValue('--fg')).toBe(`var(--unify-fg, ${palette.page.fg})`);
    expect(page?.style.getPropertyValue('--accent')).toBe(palette.accent);
    act(() => root.unmount());
  });

  it('keeps a family palette and a named theme through save and reload', () => {
    for (const id of ['blue-rich', 'red-energy']) {
      const initial = createInitialMagicPageDocument('bio');
      initial.props['page'] = { ...(initial.props['page'] ?? {}), family: 'bio', palette: id };
      const first = hydrateMagicEditorState(initial);
      const reloaded = hydrateMagicEditorState(serializeMagicEditorState(first));
      expect(reloaded.doc.props['page']?.['palette'], id).toBe(id);
      expect(reloaded.doc.props, id).toEqual(first.doc.props);
      expect(visualPaletteById[reloaded.doc.props['page']?.['palette'] ?? '']?.id, id).toBe(id);
    }
  });
});
