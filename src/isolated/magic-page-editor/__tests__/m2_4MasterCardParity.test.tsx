// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { MediaShapePicker } from '../components/editor/controls/MediaShapePicker';
import { SocialLayoutPicker } from '../components/editor/controls/SocialLayoutPicker';
import { TypographyTreatmentPicker } from '../components/editor/controls/TypographyTreatmentPicker';
import { CtaTreatmentPicker } from '../components/editor/controls/CtaTreatmentPicker';
import { cardPaletteTokens, visualPalettes } from '../data/visualPresets';
import { referenceLayoutOptions } from '../utils/cardLayout';
import { createInitialMagicPageDocument, hydrateMagicEditorState, serializeMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';

function mount(node: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root };
}

describe('M2.4 Master Card parity controls', () => {
  it('exposes the six reference image-shape choices with visual previews', () => {
    const { host, root } = mount(<MediaShapePicker value="rounded" onChange={() => undefined} />);
    expect(host.querySelectorAll('[role="radio"]')).toHaveLength(6);
    expect(host.textContent).toContain('Cuadrada');
    expect(host.textContent).toContain('A sangre');
    act(() => root.unmount());
  });

  it('exposes visual previews for social layouts, typography treatments, and CTA shape/size', () => {
    const social = mount(<SocialLayoutPicker value="row" onChange={() => undefined} />);
    expect(social.host.textContent).toContain('Fila');
    expect(social.host.textContent).toContain('Grupo');
    act(() => social.root.unmount());

    const typography = mount(<TypographyTreatmentPicker value={{}} onChange={() => undefined} />);
    expect(typography.host.querySelector('[aria-label="Tratamiento tipográfico"]')?.querySelectorAll('[role="radio"]')).toHaveLength(5);
    expect(typography.host.textContent).toContain('Script');
    act(() => typography.root.unmount());

    const cta = mount(<CtaTreatmentPicker onChange={() => undefined} />);
    expect(cta.host.textContent).toContain('Cuadrado');
    expect(cta.host.textContent).toContain('Completo');
    expect(cta.host.querySelector('[aria-label="Forma del botón"]')?.querySelectorAll('[role="radio"]')).toHaveLength(4);
    expect(cta.host.querySelector('[aria-label="Tamaño del botón"]')?.querySelectorAll('[role="radio"]')).toHaveLength(4);
    act(() => cta.root.unmount());
  });

  it('keeps the expanded named card palettes and eight distinct reference compositions in the Magic contract', () => {
    expect(visualPalettes.map((palette) => palette.id)).toEqual([
      'cream', 'black', 'teal', 'sage', 'silver', 'caramel',
      'red-energy', 'amber-sunny', 'lavender-soft', 'purple-editorial', 'cyan-electric',
      'mono-editorial', 'ice-blue', 'emerald-deep', 'terracotta', 'neon-dark'
    ]);
    expect(Object.keys(cardPaletteTokens)).toEqual([
      'cream', 'black', 'teal', 'sage', 'silver', 'caramel',
      'red-energy', 'amber-sunny', 'lavender-soft', 'purple-editorial', 'cyan-electric',
      'mono-editorial', 'ice-blue', 'emerald-deep', 'terracotta', 'neon-dark'
    ]);
    expect(referenceLayoutOptions.map((option) => option.value)).toEqual([
      'cover', 'textOnly', 'iconText', 'image25', 'image40', 'imageRight', 'split', 'backgroundImage'
    ]);
  });

  it('round-trips card-scoped palette, preset, layout, and image shape through the existing document format', () => {
    const initial = createInitialMagicPageDocument('bio');
    initial.props['collection.0'] = {
      cardPalette: 'silver',
      layout: 'backgroundImage',
      cardBg: '#F4F4F5',
      cardAccent: '#A1A1AA',
      cardIconBg: '#E4E4E7',
      cardIconColor: '#18181B'
    };
    initial.props['collection.0.img'] = { shape: 'bleed', fit: 'cover' };
    const reloaded = hydrateMagicEditorState(serializeMagicEditorState(hydrateMagicEditorState(initial)));
    expect(reloaded.doc.props['collection.0']).toMatchObject({ cardPalette: 'silver', layout: 'backgroundImage', cardBg: '#F4F4F5', cardAccent: '#A1A1AA' });
    expect(reloaded.doc.props['collection.0.img']).toMatchObject({ shape: 'bleed', fit: 'cover' });
  });
});
