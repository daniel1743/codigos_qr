// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { cardFamilies } from '../data/cardFamilies';
import { IconPicker, iconLibrary, iconForId } from '../components/editor/controls/IconPicker';
import { cropFromPosition } from '../components/editor/controls/PositionPad';
import { resolveCard } from '../utils/cardLayout';
import { cardOrder, duplicateCard, moveCard, deleteCard } from '../utils/cardOps';
import { DecorationLayer } from '../components/editor/DecorationLayer';
import { EditorProvider } from '../contexts/EditorContext';
import { choosePanelPlacement } from '../components/editor/FloatingToolbar';
import { createInitialMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';

function mount(node: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root };
}

describe('M2.5 group editing and interaction recovery', () => {
  it('maps the 3x3 focus control to the canonical crop contract', () => {
    expect(cropFromPosition('left top')).toEqual({ cropX: '0', cropY: '0' });
    expect(cropFromPosition('right bottom')).toEqual({ cropX: '100', cropY: '100' });
    expect(cropFromPosition('center')).toEqual({ cropX: '50', cropY: '50' });
  });

  it('inherits group defaults while preserving explicit item overrides', () => {
    const family = cardFamilies.catalog;
    const resolved = resolveCard(family, { groupCardPalette: 'black', groupCardRadius: 'L', groupImageShape: 'circle' }, { cardPalette: 'cream' });
    expect(resolved.props.cardPalette).toBe('cream');
    expect(resolved.props.radius).toBe('L');
    expect(resolved.props.imageShape).toBe('circle');
    const inherited = resolveCard(family, { groupCardPalette: 'black' }, {});
    expect(inherited.props.cardPalette).toBe('black');
  });

  it('keeps collection add/delete/reorder operations in the existing order contract', () => {
    const state = createInitialMagicEditorState('bio').doc;
    const withDuplicate = duplicateCard(state, 'catalog', 3, 'catalog.', '0');
    const order = cardOrder(withDuplicate, 'catalog', 3);
    expect(order).toHaveLength(4);
    const moved = moveCard(withDuplicate, 'catalog', 3, order[0], 1);
    expect(cardOrder(moved, 'catalog', 3)[1]).toBe(order[0]);
    const deleted = deleteCard(moved, 'catalog', 3, order[0]);
    expect(cardOrder(deleted, 'catalog', 3)).not.toContain(order[0]);
  });

  it('provides one searchable canonical icon library with practical categories', () => {
    expect(iconLibrary.length).toBeGreaterThan(20);
    for (const category of ['Contacto', 'Redes', 'Negocios', 'Belleza', 'Mascotas', 'Comida', 'Salud', 'Servicios', 'Electricidad/Hogar', 'Ubicación', 'Calendario', 'Comercio', 'General']) {
      expect(iconLibrary.some((icon) => icon.category === category)).toBe(true);
    }
    expect(iconForId('calendar')).toBe(iconForId('calendar'));
    const { host, root } = mount(<IconPicker value="calendar" onChange={() => undefined} />);
    expect(host.querySelector('[aria-label="Buscar icono"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="radio"]').length).toBeGreaterThan(20);
    act(() => root.unmount());
  });

  it('renders decorations in a non-interactive layer', () => {
    const initial = createInitialMagicEditorState('bio');
    initial.doc.props.page = { decorLine: 'on', decorColor: '#D4AF37', decorOpacity: '25', decorWeight: '2' };
    const { host, root } = mount(<EditorProvider initialDocument={initial}><DecorationLayer id="page" /></EditorProvider>);
    const layer = host.querySelector('[data-decoration-layer]') as HTMLElement | null;
    expect(layer?.className).toContain('pointer-events-none');
    expect(layer?.querySelector('span')?.getAttribute('style')).toContain('#D4AF37');
    act(() => root.unmount());
  });

  it('chooses a least-overlap popover candidate and keeps the target visible', () => {
    const placement = choosePanelPlacement({
      target: { top: 220, left: 420, width: 180, height: 120 },
      panelWidth: 300,
      panelHeight: 240,
      containerWidth: 1000,
      viewportTop: 8,
      viewportBottom: 700
    });
    expect(placement.side).toBe('right');
    expect(placement.left).toBeGreaterThan(600);
    expect(placement.top).toBe(220);
  });
});
