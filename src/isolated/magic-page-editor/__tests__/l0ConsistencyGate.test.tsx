// @vitest-environment happy-dom
/**
 * L0 · Confianza — the gaps this suite closes.
 *
 * 1. Nothing rendered the whole Block Kit end to end. `colStyle`/`col` in
 *    BusinessTemplate/PortfolioTemplate (`button`) and `b` in GenericBlock
 *    (`separator`) were `ReferenceError`s waiting for a user to add a block.
 *    `scripts/check-undeclared.mjs` catches them statically; this is the runtime
 *    counterpart, so the class stays closed even if the gate is bypassed.
 *
 * 2. `bgOverride` was cleared by writing `undefined` — a non-string value in a bag
 *    whose validator requires strings, which would make the page unreadable as
 *    MAGIC_V1 on reload. These tests pin the `""` contract and why it matters.
 *
 * 3. The frame-shape picker only draws `curve`/`straight`/`inset` for the variants
 *    that spread `bandShape`. They stay selectable — that is the tested contract —
 *    but are now flagged, so the option is not a silent no-op.
 */
import React, { useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { EditorProvider, useEditor } from '../contexts/EditorContext';
import { TemplateRenderer } from '../components/templates/TemplateRenderer';
import { useSelectionActions } from '../components/editor/useSelectionActions';
import { heroBandShapeVariants } from '../components/blocks/HeroFrame';
import {
  createInitialMagicEditorState,
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  isMagicPageDocument,
  serializeMagicEditorState,
  type MagicEditorStateV1,
} from '../../../features/magic-page-editor-production/magic-document';
import { detectDocumentKind } from '../../../features/magic-page-editor-production/document-session';
import type { BlockType, TemplateId } from '../types/editor';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const BLOCK_TYPES: BlockType[] = [
  'hero', 'profile', 'text', 'links', 'button', 'social', 'separator', 'image',
  'gallery', 'video', 'collection', 'catalog', 'cardPage', 'cardPortfolio',
  'cardMenu', 'cardStore', 'imageCards', 'reviews', 'services', 'cta',
  'whatsapp', 'contact', 'location',
];

/** Each template family the renderer can resolve, including the two page families. */
const COMBOS: { label: string; templateId: TemplateId; family?: string }[] = [
  { label: 'bio', templateId: 'bio' },
  { label: 'business', templateId: 'business' },
  { label: 'portfolio', templateId: 'portfolio' },
  { label: 'bio/catalog', templateId: 'bio', family: 'catalog' },
  { label: 'bio/gallery', templateId: 'bio', family: 'gallery' },
];

function mount(node: React.ReactElement) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  return { host, root };
}

function withDocument(state: MagicEditorStateV1, extra?: React.ReactNode) {
  return (
    <EditorProvider initialTemplate={state.templateId} initialDocument={state}>
      <TemplateRenderer showLandingBotPreview={false} />
      {extra}
    </EditorProvider>
  );
}

describe('L0 · Block Kit renders end to end', () => {
  it.each(COMBOS)('renders every block type in $label', ({ templateId, family }) => {
    const failures: string[] = [];

    for (const type of BLOCK_TYPES) {
      const state = createInitialMagicEditorState(templateId);
      state.doc.blocks = [{ key: `probe_${type}`, type }];
      if (family) state.doc.props["page"] = { ...(state.doc.props["page"] ?? {}), family };

      // React surfaces a render-time ReferenceError through `act`, but the
      // message alone would not say *which* block failed — collect and report.
      try {
        const { host, root } = mount(withDocument(state));
        expect(host.querySelector('[data-page-family]')).not.toBeNull();
        act(() => root.unmount());
      } catch (reason) {
        failures.push(`${type}: ${reason instanceof Error ? reason.message : String(reason)}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('renders the whole Block Kit at once, in every template', () => {
    for (const { templateId, family } of COMBOS) {
      const state = createInitialMagicEditorState(templateId);
      state.doc.blocks = BLOCK_TYPES.map((type, i) => ({ key: `all_${i}_${type}`, type }));
      if (family) state.doc.props["page"] = { ...(state.doc.props["page"] ?? {}), family };

      const { host, root } = mount(withDocument(state));
      expect(host.querySelector('[data-page-family]')).not.toBeNull();
      act(() => root.unmount());
    }
  });
});

describe('L0 · bgOverride is cleared without breaking the document', () => {
  it('treats an empty bgOverride as "no override" and falls back to page.bg', () => {
    const state = createInitialMagicEditorState('bio');
    // `crema` is a bio tone; the override is present but empty.
    state.doc.props["page"] = { bg: 'crema', bgOverride: '' };

    const { host, root } = mount(withDocument(state));
    expect(host.querySelector<HTMLElement>('[data-page-family]')?.style.background).toBe('#F5F0E8');
    act(() => root.unmount());
  });

  it('lets a real bgOverride win over page.bg', () => {
    const state = createInitialMagicEditorState('bio');
    state.doc.props["page"] = { bg: 'crema', bgOverride: '#0B1F3A' };

    const { host, root } = mount(withDocument(state));
    // A raw hex resolves through the derived-tone branch of useThemeTokens.
    const background = host.querySelector<HTMLElement>('[data-page-family]')?.style.background ?? '';
    expect(background.toUpperCase()).toContain('0B1F3A');
    act(() => root.unmount());
  });

  it('round-trips a document carrying an empty bgOverride', () => {
    const state = createInitialMagicEditorState('business');
    state.doc.props["page"] = { bg: 'arena', bgOverride: '' };

    const serialized = serializeMagicEditorState(state);
    expect(isMagicPageDocument(serialized)).toBe(true);
    expect(hydrateMagicEditorState(serialized).doc.props["page"]).toEqual({ bg: 'arena', bgOverride: '' });
  });

  it('documents why the clear path must not write undefined', () => {
    const document = createInitialMagicPageDocument('bio');
    const withUndefined = {
      ...document,
      props: { page: { bgOverride: undefined as unknown as string } },
    };

    // Two validators, different strictness. `isMagicPageDocument` only checks
    // structure, so it still accepts this — which is exactly why the defect went
    // unnoticed. `detectDocumentKind` is the one the load path uses, and it
    // rejects any non-string prop value, so the page would open as UNKNOWN.
    expect(isMagicPageDocument(withUndefined)).toBe(true);
    expect(detectDocumentKind(withUndefined)).not.toBe('MAGIC_V1');
  });

  it('keeps a page loadable as MAGIC_V1 after the override is cleared', () => {
    const state = createInitialMagicEditorState('bio');
    state.doc.props["page"] = { bg: 'crema', bgOverride: '' };
    expect(detectDocumentKind(serializeMagicEditorState(state))).toBe('MAGIC_V1');
  });
});

function ShapeProbe({ target }: { target: string }) {
  const { select } = useEditor();
  const actions = useSelectionActions();
  useEffect(() => select(target), [select, target]);
  const shape = actions.find((action) => action.key === 'shape');
  return <div data-shape-probe>{shape?.panel}</div>;
}

describe('L0 · frame-shape picker stays honest without shrinking', () => {
  const shapeButtons = (host: HTMLElement) =>
    host.querySelector('[data-testid="hero-frame-shape-grid"]')?.querySelectorAll('button') ?? [];

  function mountShapes(variant: string) {
    const state = createInitialMagicEditorState('bio');
    state.doc.props['block:hero'] = { variant };
    return mount(withDocument(state, <ShapeProbe target="block:hero:hero-image" />));
  }

  it('always offers all nine shapes, whatever the variant', () => {
    const { host, root } = mountShapes('centered');
    expect(shapeButtons(host)).toHaveLength(9);
    act(() => root.unmount());
  });

  it('flags the three variant-scoped shapes as non-applying where they cannot draw', () => {
    const { host, root } = mountShapes('centered');
    const flagged = host.querySelectorAll('[data-applies="false"]');
    expect(flagged).toHaveLength(3);
    act(() => root.unmount());
  });

  it('flags nothing for a variant that does consume the silhouette', () => {
    const variant = heroBandShapeVariants[0];
    if (!variant) throw new Error("heroBandShapeVariants is empty");
    const { host, root } = mountShapes(variant);
    expect(shapeButtons(host)).toHaveLength(9);
    expect(host.querySelectorAll('[data-applies="false"]')).toHaveLength(0);
    act(() => root.unmount());
  });
});
