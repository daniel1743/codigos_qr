// @vitest-environment happy-dom
import React, { useEffect, useState } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { useSelectionActions } from '../components/editor/useSelectionActions';
import { createInitialMagicEditorState } from '../../../features/magic-page-editor-production/magic-document';
import { bioLinks } from '../data/bioContent';
import { readButtonGroup } from '../utils/buttonGroup';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Editor probe: exposes registry identity, action keys and the live panels. */
function Probe() {
  const ed = useEditor();
  const actions = useSelectionActions();
  const [, setTick] = useState(0);
  useEffect(() => {
    setTick(1);
  }, []);
  const model = readButtonGroup(ed.doc, 'links', bioLinks);
  const design = actions.find((action) => action.key === 'design');
  const content = actions.find((action) => action.key === 'content');
  const manage = actions.find((action) => action.key === 'manage');
  const more = actions.find((action) => action.key === 'more-actions');
  return (
    <>
      <output data-testid="identity-2">{ed.getInfo('links.1')?.label ?? ''}</output>
      <output data-testid="identity-block">{ed.getInfo('block:links')?.label ?? ''}</output>
      <output data-testid="action-keys">{actions.map((action) => action.key).join(',')}</output>
      <output data-testid="selected">{ed.selection?.id ?? 'none'}</output>
      <output data-testid="order">{model.order.join('|')}</output>
      <output data-testid="align-1">{ed.doc.textStyles['links.0.label']?.align ?? ''}</output>
      <output data-testid="href-0">{ed.getElement('links.0')?.getAttribute('href') ?? ''}</output>
      <output data-testid="href-1">{ed.getElement('links.1')?.getAttribute('href') ?? ''}</output>
      <output data-testid="label-weight">{document.querySelector('[data-editor-id="links.0"] span span')?.getAttribute('style') ?? ''}</output>
      <button data-testid="select-1" onClick={() => ed.select('links.0')} />
      <button data-testid="select-2" onClick={() => ed.select('links.1')} />
      <button data-testid="select-group" onClick={() => ed.select('block:links')} />
      <button data-testid="undo" onClick={() => ed.undo()} />
      <div data-testid="design-panel">{design?.panel}</div>
      <div data-testid="content-panel">{content?.panel}</div>
      <div data-testid="manage-panel">{manage?.panel}</div>
      <div data-testid="more-panel">{more?.panel}</div>
    </>
  );
}

describe('Button group UX recovery', () => {
  let host: HTMLDivElement;
  let root: Root;

  const mount = () => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const initial = createInitialMagicEditorState('bio');
    act(() => {
      root.render(
        React.createElement(EditorProvider, { initialDocument: initial, initialTemplate: 'bio' },
          React.createElement(TemplateRenderer, null),
          React.createElement(Probe, null)),
      );
    });
  };

  const click = (testId: string) => {
    act(() => {
      host.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)!.click();
    });
  };

  const text = (testId: string) => host.querySelector(`[data-testid="${testId}"]`)?.textContent ?? '';

  beforeEach(mount);
  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('identifies the selected button and the collection instead of a generic "Botón"', () => {
    expect(text('identity-2')).toBe('Botón 2 de 4 · Guía: Costa Brava en 5 días');
    expect(text('identity-block')).toBe('Grupo de botones · 4 elementos');
  });

  it('exposes one obvious action per intent, without duplicate navigation or delete', () => {
    click('select-2');
    expect(text('action-keys')).toBe('content,design,icon-panel,primary,more-actions');
    click('select-group');
    expect(text('action-keys')).toBe('add-button,design,spacing,align,manage,more-actions');
  });

  it('announces the group scope before anything is changed', () => {
    click('select-2');
    expect(text('design-panel')).toContain('Este cambio se aplicará a todos los botones (4).');
    expect(text('design-panel')).toContain('Diseño de los 4 botones');
    expect(text('content-panel')).toContain('Este enlace solo pertenece a este botón.');
    expect(text('content-panel')).toContain('Solo afecta a este botón.');
  });

  it('keeps every destination independent and visible per button', () => {
    expect(text('href-0')).toBe('https://marinasole.com/colaborar');
    expect(text('href-1')).toBe('https://marinasole.com/guia');
    click('select-2');
    expect(text('content-panel')).toContain('Enlace de · Guía: Costa Brava');
  });

  it('centers the label without losing the group typography', () => {
    click('select-1');
    const panel = host.querySelector('[data-testid="content-panel"]')!;
    const center = Array.from(panel.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Centro')!;
    act(() => {
      center.click();
    });

    expect(text('align-1')).toBe('center');
    const label = host.querySelector('[data-editor-id="links.0"] span span')?.getAttribute('style') ?? '';
    expect(label).toContain('text-align: center');
    const sub = host.querySelectorAll('[data-editor-id="links.0"] span span')[1]?.getAttribute('style') ?? '';
    expect(label).toContain('font-size: 22px');
    expect(sub).toContain('text-align: center');
  });

  it('lists the whole collection in the roster and selects a row on tap', () => {
    click('select-group');
    const panel = host.querySelector('[data-testid="manage-panel"]')!;
    expect(panel.textContent).toContain('Gestionar botones · 4');
    expect(panel.textContent).toContain('Posición 1 de 4 · marinasole.com/colaborar');
    expect(panel.textContent).toContain('Posición 4 de 4 · wa.me/34600000000');

    act(() => {
      panel.querySelector<HTMLButtonElement>('[aria-label^="Editar Botón 2 de 4"]')!.click();
    });
    expect(text('selected')).toBe('links.1');
  });

  it('deletes from the roster with confirmation, feedback and undo', () => {
    click('select-group');
    const panel = host.querySelector('[data-testid="manage-panel"]')!;
    act(() => {
      panel.querySelector<HTMLButtonElement>('[aria-label^="Eliminar Botón 3 de 4"]')!.click();
    });
    const confirm = Array.from(panel.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Sí, eliminar')!;
    act(() => {
      confirm.click();
    });

    expect(text('order')).toBe('legacy-0|legacy-1|legacy-3');
    click('undo');
    expect(text('order')).toBe('legacy-0|legacy-1|legacy-2|legacy-3');
  });
});

