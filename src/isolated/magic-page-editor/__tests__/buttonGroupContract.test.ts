// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { createInitialMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import { EditorProvider } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { canonicalScope, ensureCanonicalButtonGroup, readButtonGroup, suggestButtonIcon } from '../utils/buttonGroup';

const seeds = [
  { label: 'Colaboremos', sub: 'Proyectos', href: 'https://example.com', icon: 'calendar' },
  { label: 'Escríbeme por WhatsApp', href: 'https://wa.me/34600000000' }
];

describe('canonical ButtonGroup contract', () => {
  it('adapts legacy links.N without deleting persisted values', () => {
    const state = createInitialMagicEditorState('bio');
    state.doc.props['links.0'] = { href: 'https://custom.example', variant: 'outline' };
    state.doc.texts['links.0.label'] = 'Personalizado';
    const legacy = readButtonGroup(state.doc, 'links', seeds);
    const canonical = ensureCanonicalButtonGroup(state.doc, legacy);

    expect(legacy.canonical).toBe(false);
    expect(legacy.items[0]).toMatchObject({ stableId: 'legacy-0', href: 'https://custom.example', label: 'Personalizado' });
    expect(canonical.props['links.0']).toEqual(state.doc.props['links.0']);
    expect(canonical.props['block:links']?.buttonGroupOrder).toBe('legacy-0,legacy-1');
    expect(canonical.props[canonicalScope('links', 'legacy-0')]).toMatchObject({ href: 'https://custom.example', label: 'Personalizado' });
  });

  it('detects sensible icons without overriding explicit choices', () => {
    expect(suggestButtonIcon('https://wa.me/1', 'Contacto')).toBe('whatsapp');
    expect(suggestButtonIcon('https://instagram.com/demo', 'Perfil')).toBe('instagram');
    expect(suggestButtonIcon('mailto:a@example.com', 'Contacto')).toBe('mail');
    expect(suggestButtonIcon('https://example.com', 'Reserva')).toBe('calendar');
  });

  it('suggests profession and semantic icons in Spanish, including accented words', () => {
    expect(suggestButtonIcon('https://example.com', 'Solicita presupuesto', 'Albañil')).toBe('services');
    expect(suggestButtonIcon('https://example.com', 'Consulta', 'Médica nutricionista')).toBe('health');
    expect(suggestButtonIcon('https://example.com', 'Portfolio', 'Fotógrafa')).toBe('camera');
    expect(suggestButtonIcon('https://example.com', 'Reserva', 'Chef y repostería')).toBe('food');
  });

  it('keeps destination recognition ahead of profession context', () => {
    expect(suggestButtonIcon('https://wa.me/1', 'WhatsApp', 'Albañil')).toBe('whatsapp');
  });

  it('keeps primary identity independent from array position', () => {
    const state = createInitialMagicEditorState('bio');
    state.doc.props['block:links'] = { buttonGroupOrder: 'btn_a,btn_b' };
    state.doc.props[canonicalScope('links', 'btn_a')] = { label: 'A', href: 'https://a', isPrimary: 'off' };
    state.doc.props[canonicalScope('links', 'btn_b')] = { label: 'B', href: 'https://b', isPrimary: 'on' };
    const model = readButtonGroup(state.doc, 'links', seeds);
    const reordered = { ...state.doc, props: { ...state.doc.props, 'block:links': { ...state.doc.props['block:links'], buttonGroupOrder: 'btn_b,btn_a' } } };
    const next = readButtonGroup(reordered, 'links', seeds);

    expect(model.items.find((item) => item.stableId === 'btn_b')?.isPrimary).toBe('on');
    expect(next.items[0]?.stableId).toBe('btn_b');
    expect(next.items[0]?.isPrimary).toBe('on');
  });

  it('resolves one master visual style for every child without creating item overrides', () => {
    const state = createInitialMagicEditorState('bio');
    state.doc.props['block:links'] = {
      ...state.doc.props['block:links'],
      groupCardCtaVariant: 'glass',
      groupCardCtaShape: 'rounded',
      groupCardCtaSize: 'lg'
    };
    const host = document.createElement('div');
    const root = createRoot(host);
    act(() => root.render(React.createElement(EditorProvider, { initialDocument: state }, React.createElement(TemplateRenderer))));

    const buttons = Array.from(host.querySelectorAll('[data-button-group="links"] a'));
    expect(buttons.length).toBe(4);
    expect(buttons.every((button) => button.getAttribute('data-variant') === 'glass')).toBe(true);
    expect(buttons.every((button) => button.getAttribute('data-shape') === 'rounded')).toBe(true);
    expect(buttons.every((button) => button.getAttribute('data-size') === 'lg')).toBe(true);
    expect(state.doc.props['links.0']?.variant).toBeUndefined();
    act(() => root.unmount());
  });
});
