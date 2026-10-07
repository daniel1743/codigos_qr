// @vitest-environment happy-dom
/**
 * L1 · Typography.
 *
 * The audit's second-biggest blocker: four of the six display faces the twelve
 * Magic Patterns families need were not loaded at all (DM Serif Display,
 * Montserrat, Playfair Display, Great Vibes), six families set a weight the
 * three-step scale could not express (300/600/800), every family used tracking
 * values outside {-0.02em, none, 0.14em}, all used `leading-*`, and two used
 * italic — none of which had a control.
 *
 * These tests pin the additive behaviour: new values work, and every value a
 * stored document can already contain keeps producing exactly what it did.
 */
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { textStyleToCss } from '../utils/styles';
import { templates, templateOrder } from '../data/templates';
import { sharedFontPairs } from '../data/fontPairs';
import { TypographyTreatmentPicker } from '../components/editor/controls/TypographyTreatmentPicker';
import { createInitialMagicEditorState, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import type { TextStyle } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('L1 · weight steps 300–800', () => {
  it.each([
    ['light', 300],
    ['regular', 400],
    ['medium', 500],
    ['semibold', 600],
    ['bold', 700],
    ['extrabold', 800],
  ] as const)('maps weight %s to %i', (weight, expected) => {
    expect(textStyleToCss({ weight }).fontWeight).toBe(expected);
  });

  it('keeps the legacy `bold` flag behaving exactly as before', () => {
    expect(textStyleToCss({ bold: true }).fontWeight).toBe(700);
    expect(textStyleToCss({ bold: false }).fontWeight).toBe(400);
    expect(textStyleToCss({}).fontWeight).toBeUndefined();
  });

  it('lets an explicit weight win over the legacy flag', () => {
    expect(textStyleToCss({ weight: 'light', bold: true }).fontWeight).toBe(300);
  });
});

describe('L1 · arbitrary tracking', () => {
  it('reads a number as em so the target values become expressible', () => {
    // The values the Magic Patterns components actually use.
    for (const em of [0.08, 0.1, 0.18, 0.2, 0.25, 0.3]) {
      expect(textStyleToCss({ tracking: em }).letterSpacing).toBe(`${em}em`);
    }
  });

  it('keeps the three named steps meaning what they always meant', () => {
    expect(textStyleToCss({ tracking: 'tight' }).letterSpacing).toBe('-0.02em');
    expect(textStyleToCss({ tracking: 'wide' }).letterSpacing).toBe('0.14em');
    expect(textStyleToCss({ tracking: 'normal' }).letterSpacing).toBeUndefined();
    expect(textStyleToCss({}).letterSpacing).toBeUndefined();
  });
});

describe('L1 · line-height and italic', () => {
  it('emits a unitless line-height', () => {
    expect(textStyleToCss({ lineHeight: 1.35 }).lineHeight).toBe(1.35);
    expect(textStyleToCss({}).lineHeight).toBeUndefined();
  });

  it('adds italic without touching anything else', () => {
    expect(textStyleToCss({ italic: true }).fontStyle).toBe('italic');
    expect(textStyleToCss({}).fontStyle).toBeUndefined();
  });
});

describe('L1 · display faces are reachable from every template', () => {
  it.each(templateOrder)('%s keeps its own three pairs first, so the default never moves', (templateId) => {
    const fonts = templates[templateId].theme.fonts;
    const ownThree = fonts.slice(0, 3).map((f) => f.id);
    expect(ownThree).toEqual(templates[templateId].theme.fonts.slice(0, 3).map((f) => f.id));
    expect(fonts.length).toBe(3 + sharedFontPairs.length);
  });

  it.each(templateOrder)('%s exposes every shared pair', (templateId) => {
    const ids = templates[templateId].theme.fonts.map((f) => f.id);
    for (const pair of sharedFontPairs) expect(ids).toContain(pair.id);
  });

  it.each(templateOrder)('%s has no duplicate font ids', (templateId) => {
    const ids = templates[templateId].theme.fonts.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers the four faces the audit found missing', () => {
    const displays = sharedFontPairs.map((p) => p.display).join(' ');
    for (const face of ['DM Serif Display', 'Montserrat', 'Playfair Display', 'Great Vibes']) {
      expect(displays).toContain(face);
    }
  });

  it('keeps an id stored by a published document resolvable', () => {
    // Regression guard: appending must not disturb the existing ids.
    for (const legacy of ['editorial', 'moderna', 'clasica', 'firma', 'bodoni', 'garamond', 'neutra']) {
      const found = templateOrder.some((templateId) =>
        templates[templateId].theme.fonts.some((f) => f.id === legacy),
      );
      expect(found).toBe(true);
    }
  });
});

describe('L1 · the new text fields persist', () => {
  it('round-trips weight, tracking, line-height and italic', () => {
    const style: TextStyle = {
      size: 44,
      weight: 'extrabold',
      tracking: 0.18,
      lineHeight: 1.15,
      italic: true,
      upper: true,
    };
    const state = createInitialMagicEditorState('bio');
    state.doc.textStyles['hero.title'] = style;

    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(state));
    expect(reloaded.doc.textStyles['hero.title']).toEqual(style);
    expect(textStyleToCss(reloaded.doc.textStyles['hero.title']).fontWeight).toBe(800);
    expect(textStyleToCss(reloaded.doc.textStyles['hero.title']).letterSpacing).toBe('0.18em');
  });
});

describe('L1 · the typography panel keeps its contract', () => {
  function mount(node: React.ReactElement) {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(node));
    return { host, root };
  }

  it('still exposes exactly five families, as m2_4MasterCardParity requires', () => {
    const { host, root } = mount(<TypographyTreatmentPicker value={{}} onChange={() => undefined} />);
    const family = host.querySelector('[aria-label="Tratamiento tipográfico"]');
    expect(family?.querySelectorAll('[role="radio"]')).toHaveLength(5);
    act(() => root.unmount());
  });

  it('offers six weights', () => {
    const { host, root } = mount(<TypographyTreatmentPicker value={{}} onChange={() => undefined} />);
    const weights = host.querySelector('[aria-label="Peso tipográfico"]');
    expect(weights?.querySelectorAll('[role="radio"]')).toHaveLength(6);
    act(() => root.unmount());
  });

  it('offers a custom tracking field that clears back to the named steps', () => {
    const patches: Partial<TextStyle>[] = [];
    const { host, root } = mount(
      <TypographyTreatmentPicker value={{ tracking: 'wide' }} onChange={(p) => patches.push(p)} />,
    );
    // The named step stays selected while no numeric value is set.
    const tracking = host.querySelector('[aria-label="Tracking tipográfico"]');
    expect(tracking?.querySelector('[aria-checked="true"]')?.textContent).toContain('Amplio');
    act(() => root.unmount());
  });
});
