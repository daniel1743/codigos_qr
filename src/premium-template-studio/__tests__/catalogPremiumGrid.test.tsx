import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTemplateDefinition } from "../templates/definitions";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { createInitialState, templateReducer } from "../state/templateReducer";
import {
  MAX_BULK_PRODUCTS,
  applyProductGridItemAction,
  appendProducts,
  clampBulkCount,
  createPlaceholderProducts,
} from "../components/blocks/productGridCollection";
import { pageCanonicalService } from "../../services/page-canonical.service";
import { extractCatalogProducts } from "../../features/magic-page-editor-production/catalog-products";
import {
  normalizeCatalogLink,
  resolveFeaturedProducts,
} from "../../features/magic-page-editor-production/catalog-link";
import type { BioTemplateConfig, BlockItem } from "../types";

/* ------------------------------------------------------------------ */
/* Fixtures                                                           */
/* ------------------------------------------------------------------ */

function product(id: string, over: Partial<BlockItem> = {}): BlockItem {
  return {
    id,
    title: `Producto ${id}`,
    description: `Descripción ${id}`,
    price: `$${id}`,
    ctaLabel: "Comprar",
    ctaUrl: "#comprar",
    imageUrl: "",
    ...over,
  };
}

function catalogConfig(products: BlockItem[]): BioTemplateConfig {
  const base = getTemplateDefinition("catalog-default-v1").build();
  return {
    ...base,
    blocks: base.blocks.map((block) =>
      block.type === "productGrid" ? { ...block, content: { ...block.content, products } } : block,
    ),
  };
}

function productGridOf(config: BioTemplateConfig) {
  return config.blocks.find((block) => block.type === "productGrid")!;
}

function magicCardCount(html: string): number {
  return (html.match(/data-premium-card="magic-v1"/g) ?? []).length;
}

/* ------------------------------------------------------------------ */
/* FASE 1 — the catalog grid renders EVERY stored product             */
/* ------------------------------------------------------------------ */

describe("canonical catalog premium grid renders all products", () => {
  for (const count of [1, 3, 10]) {
    it(`renders ${count} product(s) with the Magic premium card`, () => {
      const products = Array.from({ length: count }, (_, index) => product(`p${index}`));
      const config = catalogConfig(products);

      const html = renderToStaticMarkup(
        <TemplateRenderer config={config} mode="edit" breakpoint="desktop" />,
      );

      expect(magicCardCount(html)).toBe(count);
      for (const item of products) {
        expect(html).toContain(item.title);
      }
    });
  }

  it("keeps the count across desktop, tablet and mobile breakpoints", () => {
    const products = Array.from({ length: 10 }, (_, index) => product(`p${index}`));
    const config = catalogConfig(products);
    for (const breakpoint of ["desktop", "tablet", "mobile"] as const) {
      const html = renderToStaticMarkup(
        <TemplateRenderer config={config} mode="edit" breakpoint={breakpoint} />,
      );
      expect(magicCardCount(html)).toBe(10);
    }
  });
});

/* ------------------------------------------------------------------ */
/* FASE 2/3 — CRUD helpers over canonical BlockItem                   */
/* ------------------------------------------------------------------ */

describe("canonical catalog product CRUD", () => {
  it("adds a single SAFE placeholder (never copies real commerce data)", () => {
    const existing = [product("p0", { price: "$99.900", imageUrl: "https://x/y.png" })];
    const { products, addedIds } = appendProducts(existing, 1, { placeholder: true });

    expect(products).toHaveLength(2);
    expect(addedIds).toHaveLength(1);
    const created = products[1]!;
    expect(created.id).toBe(addedIds[0]);
    expect(created.title).toBe("Producto");
    expect(created.price).toBe("$0.00");
    expect(created.imageUrl).toBe("");
    expect(created.price).not.toBe("$99.900");
    expect(created.imageUrl).not.toBe("https://x/y.png");
  });

  it("adds 10 products at once with unique ids", () => {
    const { products, addedIds } = appendProducts([], 10, { placeholder: true });
    expect(products).toHaveLength(10);
    expect(new Set(addedIds).size).toBe(10);
    expect(new Set(products.map((item) => item.id)).size).toBe(10);
  });

  it("clamps a bulk count into [1, MAX_BULK_PRODUCTS]", () => {
    expect(clampBulkCount(0)).toBe(1);
    expect(clampBulkCount(-5)).toBe(1);
    expect(clampBulkCount(999)).toBe(MAX_BULK_PRODUCTS);
    expect(createPlaceholderProducts(200)).toHaveLength(MAX_BULK_PRODUCTS);
  });

  it("keeps the legacy clone-the-last behavior for non-catalog grids", () => {
    const existing = [product("p0", { price: "$10.000", imageUrl: "https://x/z.png" })];
    const { products } = appendProducts(existing, 1, { placeholder: false });
    expect(products).toHaveLength(2);
    expect(products[1]!.price).toBe("$10.000");
    expect(products[1]!.imageUrl).toBe("https://x/z.png");
    expect(products[1]!.id).not.toBe("p0");
  });

  it("duplicates one product in place", () => {
    const products = [product("a"), product("b"), product("c")];
    const result = applyProductGridItemAction(products, "b", "duplicate");
    expect(result.changed).toBe(true);
    const ids = result.products.map((item) => item.id);
    expect(ids).toHaveLength(4);
    expect(ids[0]).toBe("a");
    expect(ids[1]).toBe("b");
    expect(ids[3]).toBe("c");
    expect(ids[2]).toBe(result.selectedItemId);
    expect(result.products[2]!.title).toBe("Producto b");
  });

  it("deletes one product and clears the selection", () => {
    const products = [product("a"), product("b"), product("c")];
    const result = applyProductGridItemAction(products, "b", "delete");
    expect(result.products.map((item) => item.id)).toEqual(["a", "c"]);
    expect(result.selectedItemId).toBeNull();
    expect(result.changed).toBe(true);
  });

  it("moves a product up and down", () => {
    const products = [product("a"), product("b"), product("c")];
    expect(applyProductGridItemAction(products, "c", "up").products.map((i) => i.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(applyProductGridItemAction(products, "a", "down").products.map((i) => i.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("is a no-op for a missing target so the caller never dispatches", () => {
    const products = [product("a")];
    const result = applyProductGridItemAction(products, "missing", "delete");
    expect(result.changed).toBe(false);
    expect(result.products).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* FASE 2 — editing survives reducer + save/reload/publish            */
/* ------------------------------------------------------------------ */

describe("canonical catalog editing pipeline", () => {
  function withEdits(): { config: BioTemplateConfig; blockId: string; itemId: string } {
    const config = catalogConfig([product("p0"), product("p1"), product("p2")]);
    const grid = productGridOf(config);
    let state = createInitialState(config);

    const patch = (field: string, value: unknown) => {
      state = templateReducer(state, {
        type: "patchBlockField",
        id: grid.id,
        path: `content.products.0.${field}`,
        value,
      });
    };

    patch("title", "Título editado");
    patch("description", "Descripción editada");
    patch("price", "$49.900");
    patch("ctaLabel", "Comprar ahora");
    patch("ctaUrl", "#comprar-ahora");
    patch("imageUrl", "https://cdn.example/product.png");

    return { config: state.config, blockId: grid.id, itemId: grid.content.products![0]!.id };
  }

  it("persists every edited field through a save/reload round-trip", () => {
    const { config, blockId, itemId } = withEdits();

    // save (serialize) → reload (parse)
    const reloaded = JSON.parse(JSON.stringify(config)) as BioTemplateConfig;
    const restored = productGridOf(reloaded).content.products!.find((item) => item.id === itemId)!;

    expect(restored.title).toBe("Título editado");
    expect(restored.description).toBe("Descripción editada");
    expect(restored.price).toBe("$49.900");
    expect(restored.ctaLabel).toBe("Comprar ahora");
    expect(restored.ctaUrl).toBe("#comprar-ahora");
    expect(restored.imageUrl).toBe("https://cdn.example/product.png");
    expect(productGridOf(reloaded).id).toBe(blockId);
  });

  it("saveDraft writes the full product list into pages.template_config", async () => {
    const { config } = withEdits();
    const envelope = { schemaVersion: 1 as const, editorConfig: config };
    const fake = createFakeSupabase(() => ({ data: { template_config: envelope }, error: null }));

    await pageCanonicalService.saveDraft(
      fake as unknown as SupabaseClient,
      "page-1",
      "user-1",
      config,
    );

    const update = fake.allCalls.find((call) => call.method === "update")!;
    const payload = update.args[0] as Record<string, unknown>;
    const persisted = payload["template_config"] as { editorConfig: BioTemplateConfig };
    const products = productGridOf(persisted.editorConfig).content.products!;
    expect(products).toHaveLength(3);
    expect(products[0]!.title).toBe("Título editado");
    expect(payload).not.toHaveProperty("published_template_config");
  });

  it("publish writes the full product list into pages.published_template_config", async () => {
    const { config } = withEdits();
    const publishedRow = {
      id: "page-1",
      public_id: "pubcatalog",
      published: true,
      published_revision: 1,
      published_template_config: { schemaVersion: 1 as const, editorConfig: config },
    };
    const fake = createFakeSupabase(() => ({ data: publishedRow, error: null }));

    await pageCanonicalService.publish(
      fake as unknown as SupabaseClient,
      "page-1",
      "user-1",
      config,
      0,
    );

    const update = fake.allCalls.find((call) => call.method === "update")!;
    const payload = update.args[0] as Record<string, unknown>;
    const published = payload["published_template_config"] as { editorConfig: BioTemplateConfig };
    expect(productGridOf(published.editorConfig).content.products).toHaveLength(3);
    expect(payload["published"]).toBe(true);
    expect(payload["published_revision"]).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* FASE 4 — editor chrome only in edit mode                           */
/* ------------------------------------------------------------------ */

describe("canonical catalog editor surface vs public surface", () => {
  const products = [product("p0"), product("p1"), product("p2")];
  const config = catalogConfig(products);
  const blockId = productGridOf(config).id;

  it("shows editor affordances (add tile + item actions) in edit mode", () => {
    const html = renderToStaticMarkup(
      <TemplateRenderer
        config={config}
        mode="edit"
        breakpoint="desktop"
        editing={{
          selectedBlockId: blockId,
          selectedCollectionItem: {
            blockId,
            collection: "product-grid",
            itemId: products[0]!.id,
            field: "item",
          },
          onInlineEdit: () => undefined,
          onAddCollectionItem: () => undefined,
          onCollectionItemAction: () => undefined,
        }}
      />,
    );

    expect(html).toContain('data-catalog-add-products="true"');
    expect(html).toContain("Añadir producto");
    expect(html).toContain("Agregar 3 productos");
    expect(html).toContain("Ver detalle");
    expect(html).toContain('aria-label="Duplicar producto"');
    expect(html).toContain('aria-label="Eliminar producto"');
  });

  it("renders every product with NO editor controls in public mode", () => {
    const html = renderToStaticMarkup(
      <TemplateRenderer config={config} mode="public" breakpoint="desktop" />,
    );

    expect(magicCardCount(html)).toBe(3);
    for (const item of products) expect(html).toContain(item.title);

    expect(html).not.toContain('data-catalog-add-products="true"');
    expect(html).not.toContain("Añadir producto");
    expect(html).not.toContain("Ver detalle");
    expect(html).not.toContain("Duplicar producto");
    expect(html).not.toContain("Eliminar producto");
    expect(html).not.toContain('data-premium-selection-label="card"');
  });
});

/* ------------------------------------------------------------------ */
/* C3 regression — landing featured products ↔ published catalog      */
/* ------------------------------------------------------------------ */

describe("landing featured products still read the published catalog", () => {
  function envelope(config: BioTemplateConfig) {
    return { schemaVersion: 1 as const, editorConfig: config };
  }

  it("resolves the featured subset in order from the catalog products", () => {
    const config = catalogConfig([product("p0"), product("p1"), product("p2")]);
    const products = extractCatalogProducts(envelope(config));
    expect(products.map((item) => item.id)).toEqual(["p0", "p1", "p2"]);

    const link = normalizeCatalogLink({
      mode: "linked",
      catalogPublicId: "pubcatalog",
      featuredProductIds: ["p2", "p0"],
    });
    expect(resolveFeaturedProducts(link, products).map((item) => item.id)).toEqual(["p2", "p0"]);
  });

  it("ignores a deleted featured product without crashing or empty cards", () => {
    const config = catalogConfig([product("p0"), product("p1"), product("p2")]);
    const reduced = {
      ...config,
      blocks: config.blocks.map((block) =>
        block.type === "productGrid"
          ? {
              ...block,
              content: {
                ...block.content,
                products: block.content.products!.filter((item) => item.id !== "p2"),
              },
            }
          : block,
      ),
    } as BioTemplateConfig;

    const products = extractCatalogProducts(envelope(reduced));
    const link = normalizeCatalogLink({
      mode: "linked",
      catalogPublicId: "pubcatalog",
      featuredProductIds: ["p2", "p0"],
    });
    expect(resolveFeaturedProducts(link, products).map((item) => item.id)).toEqual(["p0"]);
  });
});

/* ------------------------------------------------------------------ */
/* Fake Supabase (mirrors the page-canonical service test helper)     */
/* ------------------------------------------------------------------ */

type Call = { method: string; args: unknown[] };

function makeBuilder(
  record: (call: Call) => void,
  terminal: () => { data: unknown; error: unknown },
) {
  const builder: Record<string, unknown> = {
    select: () => {
      record({ method: "select", args: [] });
      return builder;
    },
    update: (payload: unknown) => {
      record({ method: "update", args: [payload] });
      return builder;
    },
    eq: (column: string, value: unknown) => {
      record({ method: "eq", args: [column, value] });
      return builder;
    },
    maybeSingle: () => {
      record({ method: "maybeSingle", args: [] });
      return Promise.resolve(terminal());
    },
    single: () => {
      record({ method: "single", args: [] });
      return Promise.resolve(terminal());
    },
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(terminal()).then(resolve),
  };
  return builder;
}

function createFakeSupabase(
  onQuery: (table: string, calls: Call[]) => { data: unknown; error: unknown },
) {
  const allCalls: { table: string; method: string; args: unknown[] }[] = [];
  const fake = {
    from: (table: string) => {
      const calls: Call[] = [];
      return makeBuilder(
        (call) => {
          calls.push(call);
          allCalls.push({ table, ...call });
        },
        () => onQuery(table, calls),
      );
    },
    allCalls,
  };
  return fake;
}
