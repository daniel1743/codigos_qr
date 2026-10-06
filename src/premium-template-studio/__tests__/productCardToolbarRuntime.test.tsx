// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RenderProvider } from "../engine/RenderContext";
import { PremiumProductCardMagicV1 } from "../components/blocks/PremiumProductCardMagicV1";
import { createDemoConfig } from "../templates/definitions";
import type { BlockItem, BlockStyle } from "../types";

/**
 * Runtime regression for C3.3-A.1-H2.
 *
 * The SSR/string tests never exercised `MagicToolbarContent`, because it renders
 * inside a `createPortal` that bails out when `document` is undefined. The
 * toolbar only loads in a real browser, so the shipped bug
 * (`const { cardStyle } = require("../../engine/styleEngine")`) threw
 * `ReferenceError: require is not defined` on the FIRST edit interaction and
 * crashed the whole catalog editor.
 *
 * This test mounts the REAL premium catalog card in `mode="edit"` with a field
 * selected — the exact path that renders the toolbar — under a DOM environment,
 * so any runtime error on that path fails the suite.
 */
const PRODUCT: BlockItem = {
  id: "p1",
  title: "Producto uno",
  description: "Descripción corta",
  price: "$10",
  ctaLabel: "Comprar",
  ctaUrl: "#comprar",
  imageUrl: "",
};

const BLOCK_STYLE: BlockStyle = {};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === "undefined") {
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub;
  }
});

afterEach(() => {
  document.body.replaceChildren();
});

function mountToolbar(field: string) {
  const config = createDemoConfig();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <RenderProvider
        value={{
          theme: config.theme,
          breakpoint: "desktop",
          mode: "edit",
          selectedCollectionItem: {
            blockId: "catalog-products",
            collection: "product-grid",
            itemId: "p1",
            field,
          },
          onInlineEdit: () => undefined,
          onListCollectionItemImages: async () => [],
          onUploadCollectionItemImage: () => undefined,
          onRemoveCollectionItemImage: () => undefined,
        }}
      >
        <PremiumProductCardMagicV1
          product={PRODUCT}
          blockId="catalog-products"
          itemId="p1"
          inlinePathPrefix="blocks.catalog-products.content.products.0"
          blockStyle={BLOCK_STYLE}
        />
      </RenderProvider>,
    );
  });
  return { host, root };
}

describe("Magic catalog product card toolbar · runtime", () => {
  for (const field of ["title", "description", "price", "image", "cta", "card"] as const) {
    it(`renders the "${field}" toolbar without throwing`, () => {
      const { host, root } = mountToolbar(field);

      expect(host.querySelector('[data-premium-card="magic-v1"]'), "card renders").not.toBeNull();
      const toolbar = document.body.querySelector('[data-magic-contextual-toolbar="true"]');
      expect(toolbar, `toolbar portal renders for field "${field}"`).not.toBeNull();

      act(() => root.unmount());
    });
  }
});
