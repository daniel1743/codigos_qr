import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createBlock } from "../constants/blockDefinitions";
import { ContextualEditorActions } from "../components/ContextualEditorActions";
import { createDemoConfig } from "../templates/definitions";
import { StudioContext, type StudioContextValue } from "../state/studioContext";
import { createInitialState, templateReducer } from "../state/templateReducer";
import type { BioTemplateConfig } from "../types";

function contextValue(config: BioTemplateConfig): StudioContextValue {
  return {
    state: createInitialState(config),
    dispatch: vi.fn(),
    tier: "free",
    adapters: {} as StudioContextValue["adapters"],
    breakpoint: "desktop",
    setBreakpoint: vi.fn(),
    panel: "settings",
    setPanel: vi.fn(),
    previewing: false,
    setPreviewing: vi.fn(),
    saveState: "idle",
    error: null,
    save: vi.fn(async () => undefined),
    publish: vi.fn(async () => undefined),
  };
}

function withSelection(config: BioTemplateConfig, id: string): StudioContextValue {
  const value = contextValue(config);
  return { ...value, state: templateReducer(value.state, { type: "selectBlock", id }) };
}

function renderActions(
  value: StudioContextValue,
  props: ComponentProps<typeof ContextualEditorActions>,
) {
  return renderToStaticMarkup(
    createElement(StudioContext.Provider, { value }, createElement(ContextualEditorActions, props)),
  );
}

describe("canonical contextual editor actions", () => {
  it("surfaces desktop actions for a selected hero without changing the document model", () => {
    const config = createDemoConfig();
    const hero = createBlock("hero");
    hero.id = "hero-contextual";
    hero.element = { optional: false, visible: true, protected: false };
    const selected = withSelection({ ...config, blocks: [hero] }, hero.id);

    const markup = renderActions(selected, { surface: "desktop" });

    expect(markup).toContain('data-contextual-surface="desktop"');
    expect(markup).toContain('data-contextual-target="hero-contextual"');
    expect(markup).toContain('aria-label="Editar"');
    expect(markup).toContain('aria-label="Duplicar"');
    expect(markup).toContain('aria-label="Más ajustes"');
    expect(markup).not.toContain('aria-label="Eliminar"');
  });

  it("uses the mobile sheet surface and touch-safe wrapping for a selected card", () => {
    const config = createDemoConfig();
    const productGrid = createBlock("productGrid");
    productGrid.id = "products-contextual";
    productGrid.content.products = [
      {
        id: "product-1",
        name: "Producto",
        element: { optional: false, visible: true, protected: false },
      },
    ];
    const selected = withSelection({ ...config, blocks: [productGrid] }, productGrid.id);

    const markup = renderActions(selected, {
      surface: "mobile",
      selectedCollectionItem: {
        blockId: productGrid.id,
        collection: "product-grid",
        itemId: "product-1",
        field: "item",
      },
    });

    expect(markup).toContain('data-contextual-surface="mobile"');
    expect(markup).toContain('data-contextual-target="product-1"');
    expect(markup).toContain("flex-wrap");
    expect(markup).toContain('aria-label="Eliminar"');
  });

  it("does not expose hide/remove actions for protected elements", () => {
    const config = createDemoConfig();
    const hero = createBlock("hero");
    hero.id = "protected-hero";
    hero.element = { optional: true, visible: true, protected: true };
    const selected = withSelection({ ...config, blocks: [hero] }, hero.id);

    const markup = renderActions(selected, { surface: "desktop" });

    expect(markup).toContain('aria-label="Elemento protegido"');
    expect(markup).not.toContain('aria-label="Ocultar"');
    expect(markup).not.toContain('aria-label="Eliminar"');
  });
});
