// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider } from "../contexts/EditorContext";
import { CardFamilyBlock } from "../components/cards/CardFamilyBlock";
import { CatalogConversionPanel } from "../components/editor/CatalogConversionPanel";
import { cardFamilies } from "../data/cardFamilies";
import type { BlockRef, EditorMode, PageDoc } from "../types/editor";
import {
  readCatalogLink,
  resolveFeaturedProducts,
  writeCatalogLink,
  type CatalogAccess,
  type CatalogProduct,
} from "../../../features/magic-page-editor-production/catalog-link";
import {
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from "../../../features/magic-page-editor-production/magic-document";
import { extractCatalogProducts } from "../../../features/magic-page-editor-production/catalog-products";

const block: BlockRef = { key: "catalog", type: "catalog" };
const family = cardFamilies.catalog;
const CATALOG_PUBLIC_ID = "catalog-public-1";

function doc(props: PageDoc["props"] = {}): PageDoc {
  return { blocks: [{ ...block }], texts: {}, textStyles: {}, props, removed: {} };
}

function linkedProps(featured: string[], publicId = CATALOG_PUBLIC_ID): PageDoc["props"] {
  return {
    "block:catalog": {
      mode: "linked",
      catalogPublicId: publicId,
      featuredProductIds: JSON.stringify(featured),
    },
  };
}

/** A catalog product with every commerce field, so changes are observable. */
function product(index: number, over: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: `p${index}`,
    title: `Producto ${index}`,
    description: `Descripción ${index}`,
    price: `${index} €`,
    imageUrl: `https://cdn.example/${index}.png`,
    ctaLabel: "Comprar",
    ctaUrl: `https://shop.example/${index}`,
    ...over,
  };
}

function catalog(count: number): CatalogProduct[] {
  return Array.from({ length: count }, (_, index) => product(index));
}

/** A resolver returning the given catalog snapshot (the single source of truth). */
function accessTo(
  products: CatalogProduct[],
  published: boolean,
  pageId: string | null = "catalog-page-1",
) {
  const resolve = vi.fn<CatalogAccess["resolve"]>(async () => ({ pageId, products, published }));
  return { resolve };
}

interface MountOptions {
  props?: PageDoc["props"];
  mode?: EditorMode;
  catalogAccess?: CatalogAccess;
}

function mount(node: ReactNode, { props = {}, mode = "edit", catalogAccess }: MountOptions = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const render = (n: ReactNode = node, o: MountOptions = {}) =>
    act(() => {
      root.render(
        <EditorProvider
          initialTemplate="business"
          initialMode={o.mode ?? mode}
          initialDocument={{ templateId: "business", doc: doc(o.props ?? props) }}
          catalogAccess={o.catalogAccess ?? catalogAccess}
        >
          {n}
        </EditorProvider>,
      );
    });
  render();
  return { host, root, render };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function productIds(host: HTMLElement): string[] {
  return [...host.querySelectorAll("[data-catalog-product]")].map(
    (el) => el.getAttribute("data-catalog-product") ?? "",
  );
}

function cardText(host: HTMLElement, id: string): string {
  return host.querySelector(`[data-catalog-product="${id}"]`)?.textContent ?? "";
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

describe("C3.3-A · catálogo → landing, única fuente de verdad", () => {
  it("muestra los 3 productos de un catálogo con 3 productos", async () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: linkedProps(["p0", "p1", "p2"]),
      catalogAccess: accessTo(catalog(3), true),
    });
    await flush();

    expect(productIds(host)).toEqual(["p0", "p1", "p2"]);
    expect(host.querySelectorAll("[data-catalog-product]")).toHaveLength(3);
    act(() => root.unmount());
  });

  it("con 10 productos muestra EXCLUSIVAMENTE los featuredProductIds", async () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: linkedProps(["p7", "p2", "p9"]),
      catalogAccess: accessTo(catalog(10), true),
    });
    await flush();

    expect(productIds(host)).toEqual(["p7", "p2", "p9"]);
    expect(productIds(host)).toHaveLength(3);
    expect(host.querySelector('[data-catalog-product="p5"]')).toBeNull();
    act(() => root.unmount());
  });

  it("elimina un destacado borrado del catálogo sin crash ni tarjeta fantasma", async () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: linkedProps(["p1", "p2", "p3"]),
      catalogAccess: accessTo([product(1), product(3)], true),
    });
    await flush();

    expect(productIds(host)).toEqual(["p1", "p3"]);
    expect(host.querySelector('[data-catalog-product="p2"]')).toBeNull();
    expect(host.textContent).not.toContain("Producto 2");
    act(() => root.unmount());
  });

  it("ignora IDs inexistentes del catálogo", () => {
    const link = {
      mode: "linked" as const,
      catalogPublicId: CATALOG_PUBLIC_ID,
      featuredProductIds: ["ghost", "p1"],
    };
    const resolved = resolveFeaturedProducts(link, [product(1)]);
    expect(resolved.map((entry) => entry.id)).toEqual(["p1"]);
  });

  it("mode=linked + catálogo no resoluble NO renderiza los productos embedded engañosos", async () => {
    const embeddedTitle = family.items[0].title;
    const resolve = vi.fn<CatalogAccess["resolve"]>(async () => ({
      pageId: null,
      products: null,
      published: false,
    }));
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: linkedProps(["p0"]),
      catalogAccess: { resolve },
    });
    await flush();

    expect(host.textContent).not.toContain(embeddedTitle);
    expect(productIds(host)).toEqual([]);
    expect(host.textContent).toContain("Catálogo no disponible");
    act(() => root.unmount());
  });

  it("el catálogo completo sigue mostrando TODOS sus productos", () => {
    const config = {
      schemaVersion: 1,
      blocks: [
        {
          id: "grid",
          type: "productGrid",
          content: { products: catalog(10).map((item) => ({ ...item })) },
        },
      ],
    };
    expect(extractCatalogProducts(config)).toHaveLength(10);
  });

  it("refleja un cambio de precio, título, imagen y CTA del catálogo sin tocar la landing", async () => {
    const mounted = mount(<CardFamilyBlock block={block} family={family} />, {
      props: linkedProps(["p1"]),
      catalogAccess: accessTo([product(1)], true),
    });
    await flush();

    expect(cardText(mounted.host, "p1")).toContain("Producto 1");
    expect(cardText(mounted.host, "p1")).toContain("1 €");
    expect(mounted.host.querySelector('[data-catalog-product="p1"] img')?.getAttribute("src")).toBe(
      "https://cdn.example/1.png",
    );
    expect(
      mounted.host.querySelector('[data-catalog-product="p1"] a')?.getAttribute("href"),
    ).toBe("https://shop.example/1");

    // The catalog changes: same featured id, brand-new commerce data.
    mounted.render(<CardFamilyBlock block={block} family={family} />, {
      props: linkedProps(["p1"]),
      catalogAccess: accessTo(
        [
          product(1, {
            title: "Producto uno renovado",
            price: "99 €",
            imageUrl: "https://cdn.example/1-nuevo.png",
            ctaUrl: "https://shop.example/1-nuevo",
          }),
        ],
        true,
      ),
    });
    await flush();

    expect(cardText(mounted.host, "p1")).toContain("Producto uno renovado");
    expect(cardText(mounted.host, "p1")).toContain("99 €");
    expect(mounted.host.querySelector('[data-catalog-product="p1"] img')?.getAttribute("src")).toBe(
      "https://cdn.example/1-nuevo.png",
    );
    expect(
      mounted.host.querySelector('[data-catalog-product="p1"] a')?.getAttribute("href"),
    ).toBe("https://shop.example/1-nuevo");
    expect(cardText(mounted.host, "p1")).not.toContain("1 €");
    act(() => mounted.root.unmount());
  });

  it("persiste exactamente la selección de destacados tras guardar/recargar", async () => {
    const saved = writeCatalogLink(doc(), "catalog", {
      mode: "linked",
      catalogPublicId: CATALOG_PUBLIC_ID,
      featuredProductIds: ["p3", "p1"],
    });
    const reloaded = hydrateMagicEditorState(
      serializeMagicEditorState({ templateId: "business", doc: saved }),
    );
    expect(readCatalogLink(reloaded.doc, "catalog")).toEqual({
      mode: "linked",
      catalogPublicId: CATALOG_PUBLIC_ID,
      featuredProductIds: ["p3", "p1"],
    });

    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: reloaded.doc.props,
      catalogAccess: accessTo(catalog(5), true),
    });
    await flush();

    expect(productIds(host)).toEqual(["p3", "p1"]);
    act(() => root.unmount());
  });
});

describe("C3.3-A · panel del bloque conectado: editar vs ver", () => {
  it("catálogo draft: Editar funciona y Ver no lleva a un 404", async () => {
    const { host, root } = mount(<CatalogConversionPanel blockKey="catalog" />, {
      props: linkedProps(["p0", "p1"]),
      catalogAccess: accessTo(catalog(3), false, "catalog-page-draft"),
    });
    await flush();

    expect(host.querySelector('[data-catalog-action="edit"]')?.getAttribute("href")).toBe(
      "/pages/catalog-page-draft/catalog",
    );
    expect(host.querySelector('[data-catalog-action="view"]')).toBeNull();
    expect(host.querySelector('[data-catalog-action="view-disabled"]')).not.toBeNull();
    expect(host.querySelector('a[href^="/pg/"]')).toBeNull();
    expect(host.textContent).toContain("borrador");
    act(() => root.unmount());
  });

  it("catálogo publicado: Ver apunta a /pg/{publicId}", async () => {
    const { host, root } = mount(<CatalogConversionPanel blockKey="catalog" />, {
      props: linkedProps(["p0"], "pub-xyz"),
      catalogAccess: accessTo(catalog(3), true, "catalog-page-1"),
    });
    await flush();

    expect(host.querySelector('[data-catalog-action="view"]')?.getAttribute("href")).toBe(
      "/pg/pub-xyz",
    );
    expect(host.querySelector('[data-catalog-action="edit"]')?.getAttribute("href")).toBe(
      "/pages/catalog-page-1/catalog",
    );
    expect(host.querySelector('[data-catalog-action="view-disabled"]')).toBeNull();
    act(() => root.unmount());
  });
});
