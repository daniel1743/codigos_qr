// @vitest-environment happy-dom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { CanonicalCanvas } from '../pages/CanonicalReadOnlyPage';
import { createCanonicalSemanticTarget } from '../adapters/canonical-adapter';
import { applyCanonicalPatch } from '../adapters/canonical-patcher';
import { getTemplateDefinition } from '../../../premium-template-studio/templates/definitions';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const config = getTemplateDefinition('menu-default-v1').build();

function Probe() {
  const ed = useEditor();
  return <output data-testid="selection">{ed.selection?.id ?? 'none'}</output>;
}

/**
 * P0-1 characterization (documented, NOT silently ignored).
 *
 * On a CANONICAL_V1 document the Magic canvas renders the premium renderer, whose
 * item targets call `ed.select(id)`. Magic's `select()` requires the id to exist in
 * its element registry, and nothing registers premium elements, so no contextual
 * surface can appear. Even a naive "register the DOM targets" bridge would be unsafe:
 * the semantic layer has no commands for `buttonGroup` items, so the toolbar would
 * expose controls that write nothing. Fixing this needs an explicit product decision
 * (bridge + adapter/patcher support, or routing canonical pages to the editor that
 * already owns them) and is reported as BLOCKED in the recovery report.
 */
describe('CANONICAL_V1 editability (P0-1 characterization)', () => {
  it('has no semantic command for button-group items yet', () => {
    const block = config.blocks.find((entry) => entry.type === 'buttonGroup');
    expect(block).toBeTruthy();
    const item = block!.content.items?.[0];
    expect(item).toBeTruthy();

    const target = createCanonicalSemanticTarget(config, `${block!.id}:button-group:${item!.id}:button`, 'Botón');
    expect(target.targetKind).toBe('unknown');
    expect(target.capabilities.canEditCTA).toBeUndefined();

    const patched = applyCanonicalPatch(config, target, { type: 'SET_CTA_URL', payload: { url: 'https://example.com' } });
    /* Content is untouched: a bridge without commands would render dead controls. */
    expect(patched).toEqual(config);
    const after = patched.blocks.find((entry) => entry.type === 'buttonGroup')?.content.items?.[0];
    expect(after?.url).toBe(item!.url);
  });

  it('produces no Magic selection when a canonical button target is tapped', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <EditorProvider canonicalDocument={config}>
          <CanonicalCanvas />
          <Probe />
        </EditorProvider>,
      );
    });

    const target = host.querySelector('[data-editor-target]');
    expect(target).toBeTruthy();
    act(() => {
      (target as HTMLElement).click();
    });

    expect(host.querySelector('[data-testid="selection"]')?.textContent).toBe('none');
    act(() => root.unmount());
    host.remove();
  });
});
