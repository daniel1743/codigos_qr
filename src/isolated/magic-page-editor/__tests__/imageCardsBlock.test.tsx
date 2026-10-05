// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditorProvider } from "../contexts/EditorContext";
import { Block } from "../components/editor/Block";
import { ImageCardsBlock } from "../components/blocks/ImageCardsBlock";
import { TemplateRenderer } from "../components/templates/TemplateRenderer";
import {
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
} from "../../../features/magic-page-editor-production/magic-document";
import type { BlockRef, PageDoc } from "../types/editor";

const block: BlockRef = { key: "imageCards-t", type: "imageCards" };

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function mountBlock(mode: "edit" | "preview", props: PageDoc["props"] = {}) {
  const state = createInitialMagicPageDocument("bio");
  state.props = { ...state.props, ...props };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <EditorProvider
        initialTemplate="bio"
        initialDocument={hydrateMagicEditorState(state)}
        initialMode={mode}>
        <Block block={block}>
          <ImageCardsBlock block={block} />
        </Block>
      </EditorProvider>,
    ),
  );
  return { host, root };
}

const cardId = (slot: string) => `imageCards-t/item.${slot}`;

describe("Tarjetas de imagen block", () => {
  it("creates two cards by default", () => {
    const { host, root } = mountBlock("preview");
    const cards = host.querySelectorAll('[data-editor-id^="imageCards-t/item."]');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.tagName.toLowerCase()).toBe("div");
    expect(cards[0]?.querySelector("img")).not.toBeNull();
    act(() => root.unmount());
  });

  it("renders each linked card as <a href><img/></a> in preview", () => {
    const { host, root } = mountBlock("preview", {
      [cardId("0")]: { href: "https://cripqer.dev/", newTab: "on" },
    });
    const anchor = host.querySelector<HTMLElement>(`a[data-editor-id="${cardId("0")}"]`);
    expect(anchor).not.toBeNull();
    expect(anchor?.getAttribute("href")).toBe("https://cripqer.dev/");
    expect(anchor?.getAttribute("target")).toBe("_blank");
    expect(anchor?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor?.querySelector("img")).not.toBeNull();
    // a card without a link stays a plain container (no anchor)
    expect(host.querySelector(`[data-editor-id="${cardId("1")}"]`)?.tagName.toLowerCase()).toBe("div");
    act(() => root.unmount());
  });

  it("stops rendering the anchor when the link is removed", () => {
    const { host, root } = mountBlock("preview", { [cardId("0")]: { href: "" } });
    const card = host.querySelector<HTMLElement>(`[data-editor-id="${cardId("0")}"]`);
    expect(card?.tagName.toLowerCase()).toBe("div");
    expect(card?.getAttribute("href")).toBeNull();
    act(() => root.unmount());
  });

  it("honours the configured corner shape", () => {
    const square = mountBlock("preview", { [cardId("0")]: { shape: "square" } });
    expect((square.host.querySelector<HTMLElement>(`[data-editor-id="${cardId("0")}"]`)?.style.borderRadius)).toBe("2px");
    act(() => square.root.unmount());

    const extra = mountBlock("preview", { [cardId("0")]: { shape: "extra" } });
    expect((extra.host.querySelector<HTMLElement>(`[data-editor-id="${cardId("0")}"]`)?.style.borderRadius)).toBe("34px");
    act(() => extra.root.unmount());
  });

  it("selects the card and prevents navigation in edit mode", () => {
    const { host, root } = mountBlock("edit", {
      [cardId("0")]: { href: "https://cripqer.dev/", newTab: "on" },
    });
    const anchor = host.querySelector<HTMLElement>(`[data-editor-id="${cardId("0")}"]`);
    expect(anchor?.tagName.toLowerCase()).toBe("a");
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    anchor?.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    act(() => root.unmount());
  });

  it("shows the add-card control only while editing and below the maximum", () => {
    const editing = mountBlock("edit");
    expect(editing.host.textContent ?? "").toContain("Agregar tarjeta");
    act(() => editing.root.unmount());

    const preview = mountBlock("preview");
    expect(preview.host.textContent ?? "").not.toContain("Agregar tarjeta");
    act(() => preview.root.unmount());

    const full = mountBlock("edit", { "block:imageCards-t": { items: "0,1,2,3" } });
    expect(full.host.querySelectorAll('[data-editor-id^="imageCards-t/item."]')).toHaveLength(4);
    expect(full.host.textContent ?? "").not.toContain("Agregar tarjeta");
    act(() => full.root.unmount());
  });

  it("renders the same contract through the public/template renderer", () => {
    const state = createInitialMagicPageDocument("bio");
    state.blocks = [...state.blocks, { key: "imageCards-pub", type: "imageCards" }];
    state.props = { ...state.props, "imageCards-pub/item.0": { href: "https://cripqer.dev/" } };
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() =>
      root.render(
        <EditorProvider
          initialTemplate="bio"
          initialDocument={hydrateMagicEditorState(state)}
          initialMode="preview">
          <TemplateRenderer showLandingBotPreview={false} />
        </EditorProvider>,
      ),
    );
    const anchor = host.querySelector<HTMLElement>('a[data-editor-id="imageCards-pub/item.0"]');
    expect(anchor?.getAttribute("href")).toBe("https://cripqer.dev/");
    expect(anchor?.querySelector("img")).not.toBeNull();
    act(() => root.unmount());
  });
});
