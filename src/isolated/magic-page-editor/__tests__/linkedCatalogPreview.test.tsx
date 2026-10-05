// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider } from "../contexts/EditorContext";
import { CardFamilyBlock } from "../components/cards/CardFamilyBlock";
import { LinkedCatalogPreview } from "../components/cards/LinkedCatalogPreview";
import { cardFamilies } from "../data/cardFamilies";
import type { BlockRef, EditorMode, PageDoc } from "../types/editor";
import type {
  CatalogAccess,
  CatalogLinkConfig,
  CatalogProduct,
} from "../../features/magic-page-editor-production/catalog-link";

const block: BlockRef = { key: "catalog", type: "catalog" };
const family = cardFamilies.catalog;

function doc(props: PageDoc["props"] = {}): PageDoc {
  return { blocks: [{ ...block }], texts: {}, textStyles: {}, props, removed: {} };
}

function linkedLink(featuredProductIds: string[]): CatalogLinkConfig {
  return { mode: "linked", catalogPublicId: "catalog-public-1", featuredProductIds };
}

const product = (id: string, title: string): CatalogProduct => ({ id, title });

interface MountOptions {
  props?: PageDoc["props"];
  mode?: EditorMode;
  catalogAccess?: CatalogAccess;
}

function mount(node: ReactNode, { props = {}, mode = "edit", catalogAccess }: MountOptions = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate="business"
        initialMode={mode}
        initialDocument={{ templateId: "business", doc: doc(props) }}
        catalogAccess={catalogAccess}
      >
        {node}
      </EditorProvider>,
    );
  });
  return { host, root };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function ctaHref(host: HTMLElement): string | null {
  return host.querySelector('a[data-catalog-cta="full"]')?.getAttribute("href") ?? null;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

describe("linked catalog landing summary", () => {
  it("renders only the featured products, capped at three (test 8)", () => {
    const { host, root } = mount(
      <LinkedCatalogPreview
        block={block}
        family={family}
        link={linkedLink(["p2", "p1", "p3", "p4"])}
        products={[
          product("p1", "Producto uno"),
          product("p2", "Producto dos"),
          product("p3", "Producto tres"),
          product("p4", "Producto cuatro"),
        ]}
      />,
    );

    expect(host.querySelector('[data-catalog-product="p1"]')?.textContent).toContain("Producto uno");
    expect(host.querySelector('[data-catalog-product="p2"]')?.textContent).toContain("Producto dos");
    expect(host.querySelector('[data-catalog-product="p3"]')?.textContent).toContain("Producto tres");
    expect(host.querySelector('[data-catalog-product="p4"]')).toBeNull();
    expect(host.querySelectorAll("[data-catalog-product]")).toHaveLength(3);
    act(() => root.unmount());
  });

  it("points the full-catalog CTA to the linked public page (test 9)", () => {
    const { host, root } = mount(
      <LinkedCatalogPreview
        block={block}
        family={family}
        link={linkedLink(["p1"])}
        products={[product("p1", "Producto uno")]}
      />,
    );

    expect(ctaHref(host)).toBe("/pg/catalog-public-1");
    expect(host.textContent).toContain("Ver catálogo completo");
    act(() => root.unmount());
  });

  it("degrades safely when a featured product was deleted (test 11)", () => {
    const { host, root } = mount(
      <LinkedCatalogPreview
        block={block}
        family={family}
        link={linkedLink(["p1", "deleted", "p2"])}
        products={[product("p1", "Producto uno"), product("p2", "Producto dos")]}
      />,
    );

    expect(host.querySelectorAll("[data-catalog-product]")).toHaveLength(2);
    expect(host.querySelector('[data-catalog-product="deleted"]')).toBeNull();
    expect(host.textContent).not.toContain("deleted");
    act(() => root.unmount());
  });

  it("never renders administrative controls in preview (test 14)", () => {
    const { host, root } = mount(
      <LinkedCatalogPreview
        block={block}
        family={family}
        link={linkedLink(["p1"])}
        products={[product("p1", "Producto uno")]}
      />,
      { mode: "preview" },
    );

    expect(host.textContent).not.toContain("Administrar catálogo");
    expect(host.textContent).not.toContain("Crear catálogo completo");
    act(() => root.unmount());
  });
});

describe("catalog block ↔ catalog link wiring", () => {
  it("hides the full-catalog CTA when the block is not linked (test 10)", () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />);

    expect(ctaHref(host)).toBeNull();
    expect(host.textContent).not.toContain("Ver catálogo completo");
    act(() => root.unmount());
  });

  it("never renders administrative controls in an embedded block render (test 15)", () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />);

    expect(host.textContent).not.toContain("Administrar catálogo");
    expect(host.textContent).not.toContain("Crear catálogo completo");
    act(() => root.unmount());
  });

  it("renders the linked catalog products once the resolver responds", async () => {
    const resolve = vi.fn<CatalogAccess["resolve"]>(async () => ({
      pageId: "catalog-page-1",
      products: [product("p1", "Producto uno"), product("p2", "Producto dos")],
    }));
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: {
        "block:catalog": {
          mode: "linked",
          catalogPublicId: "catalog-public-1",
          featuredProductIds: JSON.stringify(["p1", "p2"]),
        },
      },
      catalogAccess: { resolve },
    });

    await flush();

    expect(resolve).toHaveBeenCalledWith("catalog-public-1");
    expect(host.querySelector('[data-catalog-product="p1"]')?.textContent).toContain("Producto uno");
    expect(ctaHref(host)).toBe("/pg/catalog-public-1");
    act(() => root.unmount());
  });

  it("keeps the embedded cards when the linked catalog cannot be resolved", async () => {
    const resolve = vi.fn<CatalogAccess["resolve"]>(async () => ({ pageId: null, products: null }));
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: {
        "block:catalog": {
          mode: "linked",
          catalogPublicId: "catalog-public-1",
          featuredProductIds: JSON.stringify(["p1"]),
        },
      },
      catalogAccess: { resolve },
    });

    await flush();

    expect(ctaHref(host)).toBeNull();
    expect(host.textContent).not.toContain("Ver catálogo completo");
    act(() => root.unmount());
  });
});

