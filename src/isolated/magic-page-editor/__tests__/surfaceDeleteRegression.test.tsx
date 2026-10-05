// @vitest-environment happy-dom
//
// P0 — Surface delete UX (real tree).
//
// Drives the REAL production tree: BioTemplate renders the "Lo último" collection
// in grid layout, where the white `cq-surface` overlay (`collection.0.surface`) is
// a sibling of the image (`collection.0.img`) inside the card (`collection.0`) and
// is NOT backed by any card family. The surface toolbar must offer a Trash that
// hides ONLY that surface — never the image, never the card, never a sibling text —
// and the whole flow must stay undoable and crash-free.
import React, { Component, type ReactNode } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { useSelectionActions } from '../components/editor/useSelectionActions';
import {
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
} from '../../../features/magic-page-editor-production/magic-document';

// Exact ids BioTemplate produces for the first "Lo último" grid card.
const cardId = 'collection.0';
const imageId = `${cardId}.img`;
const surfaceId = `${cardId}.surface`;

const errors: unknown[] = [];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  errors.length = 0;
  document.body.replaceChildren();
});

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    errors.push(error);
  }
  override render() {
    if (this.state.failed) return <div data-testid="crashed">This page didn&apos;t load</div>;
    return this.props.children;
  }
}

/** Renders the real toolbar actions; only the ones with an `onClick` (the Trash). */
function ToolbarProbe() {
  const actions = useSelectionActions();
  return (
    <div data-testid="toolbar">
      {actions
        .filter((action) => !!action.onClick)
        .map((action) => (
          <button
            key={action.key}
            type="button"
            data-action={action.key}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

function EditorTools() {
  const ed = useEditor();
  return (
    <>
      <output data-testid="selection">{ed.selection?.id ?? ''}</output>
      <button data-testid="undo" type="button" onClick={() => ed.undo()}>
        undo
      </button>
      <button data-testid="redo" type="button" onClick={() => ed.redo()}>
        redo
      </button>
    </>
  );
}

function mount() {
  const documentState = createInitialMagicPageDocument('bio');
  // A single "Lo último" block, switched to the grid presentation so the surface
  // overlay actually renders on top of the image.
  documentState.blocks = [{ key: 'collection', type: 'collection' }];
  documentState.props = { 'block:collection': { layout: 'grid' } };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate="bio"
        initialDevice="desktop"
        initialDocument={hydrateMagicEditorState(documentState)}
        initialMode="edit"
      >
        <Boundary>
          <TemplateRenderer showLandingBotPreview={false} />
          <ToolbarProbe />
          <EditorTools />
        </Boundary>
      </EditorProvider>,
    );
  });
  return { host, root };
}

function click(host: HTMLElement, selector: string) {
  const el = host.querySelector<HTMLElement>(selector);
  if (!el) return false;
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
}

describe('P0 surface delete — Trash hides only the surface', () => {
  it('removes the surface, keeps the card + image, stays alive and undo restores it', async () => {
    const { host, root } = mount();

    // The white surface, its image and the card all render.
    expect(host.querySelector(`[data-editor-id="${imageId}"]`), 'image renders').not.toBeNull();
    expect(host.querySelector(`[data-editor-id="${cardId}"]`), 'card renders').not.toBeNull();
    const surface = host.querySelector<HTMLElement>(`[data-editor-id="${surfaceId}"][data-cq]`);
    expect(surface, 'surface is selectable').not.toBeNull();

    // Real selection: click the surface.
    await act(async () => {
      expect(click(host, `[data-editor-id="${surfaceId}"][data-cq]`)).toBe(true);
    });
    expect(host.querySelector('[data-testid="selection"]')?.textContent).toBe(surfaceId);

    // The toolbar offers a Trash, and it is a surface action — not a card delete.
    const trash = host.querySelector<HTMLButtonElement>('[data-action="remove"]');
    expect(trash, 'Trash appears for the surface').not.toBeNull();
    expect(
      host.querySelector('[data-action="delete"]'),
      'no card-level delete is offered for a surface',
    ).toBeNull();

    // Click the Trash.
    await act(async () => {
      expect(click(host, '[data-action="remove"]')).toBe(true);
    });

    // Surface disappears; card + image remain; selection cleared; editor alive.
    expect(host.querySelector(`[data-editor-id="${surfaceId}"]`), 'surface is gone').toBeNull();
    expect(host.querySelector(`[data-editor-id="${imageId}"]`), 'image remains').not.toBeNull();
    expect(host.querySelector(`[data-editor-id="${cardId}"]`), 'card remains').not.toBeNull();
    expect(host.querySelector('[data-testid="selection"]')?.textContent).toBe('');
    expect(host.querySelector('[data-testid="crashed"]'), 'editor must not crash').toBeNull();
    expect(
      errors,
      `no render error should escape (saw: ${errors.map(String).join('; ')})`,
    ).toEqual([]);

    // Undo restores the surface; the card and image were never removed.
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="undo"]')!.click();
    });
    expect(
      host.querySelector(`[data-editor-id="${surfaceId}"]`),
      'undo restores the surface',
    ).not.toBeNull();
    expect(
      host.querySelector(`[data-editor-id="${imageId}"]`),
      'image kept through undo',
    ).not.toBeNull();
    expect(
      host.querySelector(`[data-editor-id="${cardId}"]`),
      'card kept through undo',
    ).not.toBeNull();

    // Redo hides it again.
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="redo"]')!.click();
    });
    expect(host.querySelector(`[data-editor-id="${surfaceId}"]`)).toBeNull();
    expect(host.querySelector(`[data-editor-id="${imageId}"]`)).not.toBeNull();

    act(() => root.unmount());
  });
});
