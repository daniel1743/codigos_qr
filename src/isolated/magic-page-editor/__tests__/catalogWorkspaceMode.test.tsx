// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorProvider, useEditor } from "../contexts/EditorContext";
import type { BioTemplateConfig, BlockItem } from "../../../premium-template-studio/types";

function product(id: string): BlockItem {
  return {
    id,
    title: `Producto ${id}`,
    description: `Descripción ${id}`,
    price: `$${id}`,
    imageUrl: "",
    ctaLabel: "Comprar",
    ctaUrl: "#comprar",
  };
}

function catalogConfig(products: BlockItem[] = [product("p0"), product("p1"), product("p2")]) {
  return {
    schemaVersion: 1,
    pageInstanceId: "catalog-inst",
    templateDefinitionId: "catalog-default-v1",
    metadata: { name: "Catálogo" },
    theme: {},
    layout: {},
    profile: {},
    seo: {},
    settings: {},
    blocks: [
      {
        id: "grid-1",
        type: "productGrid",
        variant: "catalog-premium-card-v1",
        visibility: { desktop: true, tablet: true, mobile: true },
        style: {},
        layout: { columns: 3 },
        interaction: {},
        content: { products },
      },
    ],
  } as unknown as BioTemplateConfig;
}

/** Renders the live canonical document and exposes the editor methods as buttons. */
function Probe() {
  const ed = useEditor();
  const grid = ed.canonicalDocument?.blocks.find((block) => block.type === "productGrid");
  const products = grid?.content.products ?? [];
  const first = products[0]?.id ?? "";
  return (
    <div>
      <span data-field="mode">{ed.catalogMode ? "catalog" : "generic"}</span>
      <span data-field="count">{products.length}</span>
      <span data-field="first-title">{products[0]?.title ?? ""}</span>
      <span data-field="ids">{products.map((item) => item.id).join(",")}</span>
      <span data-field="selected">{ed.selectedCollectionItem?.itemId ?? ""}</span>
      <span data-field="back">{ed.catalogBackHref ?? ""}</span>
      <button type="button" data-action="select" onClick={() => ed.selectCollectionItem("grid-1", "product-grid", first, "title")}>
        select
      </button>
      <button type="button" data-action="title" onClick={() => ed.inlineEdit("blocks.grid-1.content.products.0.title", "Editado")}>
        title
      </button>
      <button type="button" data-action="add2" onClick={() => ed.addCollectionItems("grid-1", "product-grid", 2)}>
        add2
      </button>
      <button type="button" data-action="dup" onClick={() => ed.collectionItemAction("grid-1", "product-grid", first, "duplicate")}>
        dup
      </button>
      <button type="button" data-action="del" onClick={() => ed.collectionItemAction("grid-1", "product-grid", first, "delete")}>
        del
      </button>
      <button type="button" data-action="down" onClick={() => ed.collectionItemAction("grid-1", "product-grid", first, "down")}>
        down
      </button>
    </div>
  );
}

function mount(node: ReactNode, props: Record<string, unknown>) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate="business"
        onCanonicalDocumentChange={() => Promise.resolve()}
        {...props}
      >
        {node}
      </EditorProvider>,
    );
  });
  return { host, root };
}

function field(host: HTMLElement, name: string): string {
  return host.querySelector(`[data-field="${name}"]`)?.textContent ?? "";
}

function click(host: HTMLElement, action: string) {
  act(() => {
    (host.querySelector(`[data-action="${action}"]`) as HTMLButtonElement | null)?.click();
  });
}

describe("C3.3-B · Magic catalog workspace mode", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("exposes catalog mode + back target and keeps the existing products", () => {
    const mounted = mount(<Probe />, {
      canonicalDocument: catalogConfig(),
      canonicalIsNew: false,
      catalog: true,
      catalogBackHref: "/pages/landing-1/edit",
    });
    expect(field(mounted.host, "mode")).toBe("catalog");
    expect(field(mounted.host, "back")).toBe("/pages/landing-1/edit");
    expect(field(mounted.host, "count")).toBe("3");
    act(() => mounted.root.unmount());
  });

  it("edits, adds, duplicates, deletes and reorders products through the canonical document", () => {
    const onCanonicalDocumentChange = vi.fn(() => Promise.resolve());
    const mounted = mount(<Probe />, {
      canonicalDocument: catalogConfig(),
      canonicalIsNew: false,
      catalog: true,
      onCanonicalDocumentChange,
    });

    click(mounted.host, "title");
    expect(field(mounted.host, "first-title")).toBe("Editado");

    click(mounted.host, "add2");
    expect(field(mounted.host, "count")).toBe("5");

    click(mounted.host, "dup");
    expect(field(mounted.host, "count")).toBe("6");

    click(mounted.host, "del");
    expect(field(mounted.host, "count")).toBe("5");

    click(mounted.host, "down");
    expect(field(mounted.host, "ids").startsWith("p1,")).toBe(true);

    expect(onCanonicalDocumentChange).toHaveBeenCalled();

    act(() => mounted.root.unmount());
  });

  it("tracks the selected product card item for the shared card controls", () => {
    const mounted = mount(<Probe />, {
      canonicalDocument: catalogConfig(),
      canonicalIsNew: false,
      catalog: true,
    });
    expect(field(mounted.host, "selected")).toBe("");
    click(mounted.host, "select");
    expect(field(mounted.host, "selected")).toBe("p0");
    act(() => mounted.root.unmount());
  });

  it("does not activate catalog mode outside the catalog route", () => {
    const mounted = mount(<Probe />, {
      canonicalDocument: catalogConfig(),
      canonicalIsNew: false,
    });
    expect(field(mounted.host, "mode")).toBe("generic");
    act(() => mounted.root.unmount());
  });
});
