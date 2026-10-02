// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorProvider } from "../contexts/EditorContext";
import { CatalogConversionPanel } from "../components/editor/CatalogConversionPanel";
import type { PageDoc } from "../types/editor";
import type { CatalogConversionResult } from "../../../features/magic-page-editor-production/catalog-conversion.service";

function doc(): PageDoc {
  return {
    blocks: [{ key: "catalog", type: "catalog" }],
    texts: {},
    textStyles: {},
    props: {},
    removed: {},
  };
}

function linkedDoc(): PageDoc {
  return {
    ...doc(),
    props: {
      "block:catalog": {
        mode: "linked",
        catalogPublicId: "public-catalog",
        featuredProductIds: JSON.stringify(["product-1"]),
      },
    },
  };
}

function mount(
  conversion: (
    document: PageDoc,
    templateId: "bio" | "business" | "portfolio",
    blockKey: string,
  ) => Promise<CatalogConversionResult>,
) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate="business"
        initialDocument={{ templateId: "business", doc: doc() }}
        catalogConversion={conversion}
      >
        <CatalogConversionPanel blockKey="catalog" />
      </EditorProvider>,
    );
  });
  return { host, root };
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

describe("CatalogConversionPanel", () => {
  it("shows the conversion action, prevents double click, and exposes administration after success", async () => {
    const conversion = vi.fn(async (): Promise<CatalogConversionResult> => ({
      status: "linked",
      catalogPage: { id: "catalog-page-1", public_id: "public-catalog" },
      document: linkedDoc(),
      productIds: ["product-1"],
    }));
    const { host, root } = mount(conversion);
    const button = host.querySelector("button") as HTMLButtonElement;
    expect(host.textContent).toContain("Crear catálogo completo");

    await act(async () => {
      button.click();
      button.click();
      await Promise.resolve();
    });

    expect(conversion).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain("Catálogo conectado");
    expect(host.textContent).toContain("Administrar catálogo");
    act(() => root.unmount());
  });

  it("keeps embedded mode and allows retry after a failure", async () => {
    const conversion = vi.fn().mockRejectedValue(new Error("fallo controlado"));
    const { host, root } = mount(conversion);
    const button = host.querySelector("button") as HTMLButtonElement;
    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    expect(host.textContent).toContain("Crear catálogo completo");
    expect(host.textContent).not.toContain("Catálogo conectado");
    act(() => root.unmount());
  });
});
