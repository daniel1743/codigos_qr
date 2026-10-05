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
import type { CatalogAccess, CatalogProduct } from "../../../features/magic-page-editor-production/catalog-link";
import { convertEmbeddedCatalogToFullCatalog } from "../../../features/magic-page-editor-production/catalog-conversion.service";
import type { BioTemplateConfig } from "../../../premium-template-studio/types";

const block: BlockRef = { key: "catalog", type: "catalog" };
const family = cardFamilies.catalog;

function doc(props: PageDoc["props"] = {}): PageDoc {
  return { blocks: [{ ...block }], texts: {}, textStyles: {}, props, removed: {} };
}

/** An EMBEDDED (local) catalog block showing `visible` of the family's cards. */
function embeddedDoc(visible: number): PageDoc {
  return doc({
    "block:catalog": {
      order: Array.from({ length: visible }, (_, index) => String(index)).join(","),
    },
  });
}

function linkedProps(featured: string[], publicId = "catalog-public-1"): PageDoc["props"] {
  return {
    "block:catalog": {
      mode: "linked",
      catalogPublicId: publicId,
      featuredProductIds: JSON.stringify(featured),
    },
  };
}

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
    await Promise.resolve();
  });
}

function productIds(host: HTMLElement): string[] {
  return [...host.querySelectorAll("[data-catalog-product]")].map(
    (el) => el.getAttribute("data-catalog-product") ?? "",
  );
}

/** Embedded (local) cards are the only elements with a `data-layout` attribute. */
function embeddedCardCount(host: HTMLElement): number {
  return host.querySelectorAll("[data-layout]").length;
}

function panelButton(host: HTMLElement, label: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll("button")].find((el) =>
    (el.textContent ?? "").includes(label),
  ) as HTMLButtonElement | undefined;
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

describe("C3.3-A.1 · MODO A — bloque local/independiente (embedded)", () => {
  it("embedded con 1 producto funciona sin catálogo", () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: embeddedDoc(1).props,
    });

    expect(embeddedCardCount(host)).toBe(1);
    expect(host.textContent).toContain(family.items[0].title);
    expect(host.textContent).not.toContain(family.items[1].title);
    act(() => root.unmount());
  });

  it("embedded con 3 productos funciona sin catálogo", () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: embeddedDoc(3).props,
    });

    expect(embeddedCardCount(host)).toBe(3);
    for (const item of family.items) expect(host.textContent).toContain(item.title);
    act(() => root.unmount());
  });

  it("el modo local no muestra estados ni CTA de catálogo y nunca llama al resolver", () => {
    const resolve = vi.fn<CatalogAccess["resolve"]>(async () => ({
      pageId: null,
      products: null,
      published: false,
    }));
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: embeddedDoc(3).props,
      catalogAccess: { resolve },
    });

    expect(host.textContent).not.toContain("Catálogo no disponible");
    expect(host.textContent).not.toContain("No se pudieron cargar los productos del catálogo.");
    expect(host.textContent).not.toContain("Ver catálogo completo");
    expect(productIds(host)).toEqual([]);
    expect(resolve).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it("el modo local conserva la edición de sus tarjetas y de la sección", () => {
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: embeddedDoc(3).props,
    });

    // Section title (editable heading) + each card's own commerce content render.
    expect(host.textContent).toContain(family.heading);
    expect(host.textContent).toContain(family.items[0].title);
    expect(host.textContent).toContain(family.items[0].price as string);
    expect(embeddedCardCount(host)).toBe(3);
    act(() => root.unmount());
  });
});

describe("C3.3-A.1 · conversión local → catálogo completo", () => {
  async function convert(visible: number) {
    let savedIds: string[] = [];
    const result = await convertEmbeddedCatalogToFullCatalog(
      {
        supabase: {} as never,
        userId: "u1",
        profileId: "prof1",
        landingPageTitle: "Mi landing",
        document: embeddedDoc(visible),
        saveLanding: vi.fn(async () => undefined),
      },
      {
        createPage: vi.fn(async () => ({ id: "cat-1", public_id: "PUB-CAT" })) as never,
        saveCatalogDraft: vi.fn(async (_s, _id, _u, config: BioTemplateConfig) => {
          const grid = config.blocks.find((b) => b.type === "productGrid");
          savedIds = (grid?.content.products ?? []).map((p) => (p as { id: string }).id);
          return { editorConfig: config } as never;
        }) as never,
      },
    );
    return { result, savedIds };
  }

  it.each([1, 2, 3])(
    "migra exactamente %i producto(s), con IDs canónicos del catálogo, y los deja destacados",
    async (visible) => {
      const { result, savedIds } = await convert(visible);
      expect(result.productIds).toHaveLength(visible);
      expect(savedIds).toHaveLength(visible);
      expect(savedIds).toEqual(result.productIds);
      expect(savedIds.every((id) => id.length > 0)).toBe(true);
      const props = result.document.props["block:catalog"];
      expect(props.mode).toBe("linked");
      expect(props.catalogPublicId).toBe("PUB-CAT");
      expect(JSON.parse(props.featuredProductIds)).toEqual(result.productIds);
    },
  );

  it("no inventa productos adicionales", async () => {
    const { result, savedIds } = await convert(2);
    expect(result.productIds).toHaveLength(2);
    expect(new Set(result.productIds).size).toBe(2);
    expect(savedIds).toHaveLength(2);
  });

  it("tras convertir, la landing toma los productos del catálogo (no las copias embedded)", async () => {
    const { result } = await convert(1);
    const productId = result.productIds[0];
    const { host, root } = mount(<CardFamilyBlock block={block} family={family} />, {
      props: result.document.props,
      catalogAccess: accessTo([{ id: productId, title: "Título desde el catálogo" }], true),
    });
    await flush();
    expect(host.querySelector(`[data-catalog-product="${productId}"]`)?.textContent).toContain(
      "Título desde el catálogo",
    );
    act(() => root.unmount());
  });
});

describe("C3.3-A.1 · gestión de destacados (máximo 3)", () => {
  it("un catálogo con 20 productos permite cualquier combinación de hasta 3", async () => {
    const { host, root } = mount(<CatalogConversionPanel blockKey="catalog" />, {
      props: linkedProps([]),
      catalogAccess: accessTo(catalog(20), true),
    });
    await flush();

    // Three arbitrary products, chosen in this order.
    act(() => panelButton(host, "Producto 17")?.click());
    act(() => panelButton(host, "Producto 3")?.click());
    act(() => panelButton(host, "Producto 8")?.click());

    expect(host.textContent).toContain("En la landing: 3 de 3");
    expect(host.textContent).toContain("Producto 17, Producto 3, Producto 8");
    act(() => root.unmount());
  });

  it("un cuarto destacado no reemplaza a otro en silencio; el usuario decide", async () => {
    const { host, root } = mount(<CatalogConversionPanel blockKey="catalog" />, {
      props: linkedProps([]),
      catalogAccess: accessTo(catalog(6), true),
    });
    await flush();

    act(() => panelButton(host, "Producto 0")?.click());
    act(() => panelButton(host, "Producto 1")?.click());
    act(() => panelButton(host, "Producto 2")?.click());
    expect(host.textContent).toContain("En la landing: 3 de 3");

    // The 4th is disabled and announced — never a silent replacement.
    const fourth = panelButton(host, "Producto 3");
    expect(fourth?.disabled).toBe(true);
    act(() => fourth?.click());
    expect(host.textContent).toContain("En la landing: 3 de 3");
    expect(host.textContent).toContain("Ya tienes 3 productos destacados");

    // The owner unchecks one, then chooses the 4th.
    act(() => panelButton(host, "Producto 0")?.click());
    expect(host.textContent).toContain("En la landing: 2 de 3");
    act(() => panelButton(host, "Producto 3")?.click());
    expect(host.textContent).toContain("En la landing: 3 de 3");
    expect(host.textContent).toContain("Producto 1, Producto 2, Producto 3");
    act(() => root.unmount());
  });
});

describe("C3.3-A.1 · catálogo conectado en borrador vs publicado", () => {
  it("un borrador propio se carga en el editor y permite seleccionar destacados", async () => {
    const { host, root } = mount(<CatalogConversionPanel blockKey="catalog" />, {
      props: linkedProps([]),
      catalogAccess: accessTo(catalog(2), false, "catalog-page-draft"),
    });
    await flush();

    expect(host.textContent).not.toContain("No se pudieron cargar los productos del catálogo.");
    expect(host.textContent).toContain("Producto 0");
    expect(host.textContent).toContain("Producto 1");

    act(() => panelButton(host, "Producto 0")?.click());
    expect(host.textContent).toContain("En la landing: 1 de 3");
    act(() => root.unmount());
  });

  it("un borrador permite Editar catálogo y NO habilita Ver catálogo", async () => {
    const { host, root } = mount(<CatalogConversionPanel blockKey="catalog" />, {
      props: linkedProps([]),
      catalogAccess: accessTo(catalog(2), false, "catalog-page-draft"),
    });
    await flush();

    expect(host.querySelector('[data-catalog-action="edit"]')?.getAttribute("href")).toBe(
      "/pages/catalog-page-draft/catalog",
    );
    expect(host.querySelector('[data-catalog-action="view"]')).toBeNull();
    expect(host.querySelector('[data-catalog-action="view-disabled"]')).not.toBeNull();
    expect(host.querySelector('a[href^="/pg/"]')).toBeNull();
    act(() => root.unmount());
  });

  it("un catálogo publicado habilita Ver catálogo", async () => {
    const { host, root } = mount(<CatalogConversionPanel blockKey="catalog" />, {
      props: linkedProps([], "pub-xyz"),
      catalogAccess: accessTo(catalog(2), true, "catalog-page-1"),
    });
    await flush();

    expect(host.querySelector('[data-catalog-action="view"]')?.getAttribute("href")).toBe(
      "/pg/pub-xyz",
    );
    act(() => root.unmount());
  });
});
