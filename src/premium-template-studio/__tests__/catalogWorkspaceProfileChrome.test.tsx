// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { EditorProvider } from "../../isolated/magic-page-editor/contexts/EditorContext";
import { CanonicalCanvas } from "../../isolated/magic-page-editor/pages/CanonicalReadOnlyPage";
import { TemplateRenderer } from "../engine/TemplateRenderer";
import { getTemplateDefinition } from "../templates/definitions";
import type { BioTemplateConfig } from "../types";

function catalogConfig(): BioTemplateConfig {
  return getTemplateDefinition("catalog-default-v1").build();
}

function cardCount(html: string): number {
  return (html.match(/data-premium-card="magic-v1"/g) ?? []).length;
}

function renderCanvas(props: Record<string, unknown>) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialTemplate="business"
        onCanonicalDocumentChange={() => Promise.resolve()}
        canonicalDocument={catalogConfig()}
        canonicalIsNew={false}
        {...props}
      >
        <CanonicalCanvas />
      </EditorProvider>,
    );
  });
  return { host, root };
}

/**
 * C3.3-B.1 — the catalog workspace must not show the landing's profile cover +
 * identity header before the product grid. Those are page chrome (not catalog
 * content) and are not editable there; the catalog starts directly with its
 * own blocks (header/hero if present, then the product grid).
 */
describe("catalog workspace · no landing chrome before the product grid", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("drops the profile cover + identity header when hideProfileChrome is set", () => {
    const markup = renderToStaticMarkup(
      <TemplateRenderer
        config={catalogConfig()}
        documentKind="page"
        breakpoint="desktop"
        mode="edit"
        hideProfileChrome
      />,
    );

    expect(markup).not.toContain('data-editor-target="profile-cover"');
    expect(markup).not.toContain('data-editor-target="profile-bio"');
    expect(markup).not.toContain("<h1");

    // The product grid still renders all three editable cards...
    expect(cardCount(markup)).toBe(3);
    // ...and is the first authored block: its section (order 0) precedes the
    // heading block (order 1), with nothing before it.
    expect(markup.indexOf("order:0")).toBeGreaterThanOrEqual(0);
    expect(markup.indexOf("order:0")).toBeLessThan(markup.indexOf("order:1"));
  });

  it("keeps the landing chrome for a non-catalog canonical page", () => {
    const markup = renderToStaticMarkup(
      <TemplateRenderer
        config={catalogConfig()}
        documentKind="page"
        breakpoint="desktop"
        mode="edit"
      />,
    );

    expect(markup).toContain('data-editor-target="profile-cover"');
    expect(cardCount(markup)).toBe(3);
  });

  it("drops the chrome in the live catalog canvas, keeping the three cards", () => {
    const { host, root } = renderCanvas({ catalog: true });

    expect(host.querySelector('[data-editor-target="profile-cover"]')).toBeNull();
    expect(host.querySelector('[data-editor-target="profile-bio"]')).toBeNull();
    expect(host.querySelectorAll('[data-premium-card="magic-v1"]').length).toBe(3);

    act(() => root.unmount());
  });

  it("keeps the chrome in the non-catalog canonical canvas", () => {
    const { host, root } = renderCanvas({});

    expect(host.querySelector('[data-editor-target="profile-cover"]')).not.toBeNull();

    act(() => root.unmount());
  });
});
