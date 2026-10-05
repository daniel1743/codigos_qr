// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EditorProvider, useEditor } from "../contexts/EditorContext";
import { Block } from "../components/editor/Block";
import { ReviewsBlock } from "../components/blocks/ReviewsBlock";
import { TemplateRenderer } from "../components/templates/TemplateRenderer";
import { blockKit, blockLabels } from "../data/blockKit";
import {
  createInitialMagicPageDocument,
  hydrateMagicEditorState,
  serializeMagicEditorState,
  type MagicEditorStateV1,
} from "../../../features/magic-page-editor-production/magic-document";
import {
  addReview,
  deleteReview,
  duplicateReview,
  moveReview,
  reviewId,
  reviewsOrder,
} from "../utils/reviewsOps";
import type { BlockRef, PageDoc } from "../types/editor";

const KEY = "reviews-t";
const block: BlockRef = { key: KEY, type: "reviews" };
const rid = (slot: string) => reviewId(KEY, slot);
const cards = (host: HTMLElement) =>
  host.querySelectorAll<HTMLElement>('[data-editor-id^="reviews-t/review."]');
const cardText = (host: HTMLElement, slot: string) =>
  host.querySelector<HTMLElement>(`[data-editor-id="${rid(slot)}"]`)?.textContent ?? "";

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => document.body.replaceChildren());

function bioDoc(props: PageDoc["props"] = {}): MagicEditorStateV1 {
  const state = createInitialMagicPageDocument("bio");
  return hydrateMagicEditorState({ ...state, props: { ...state.props, ...props } });
}

/** Renders the real toolbar-free block plus the same editor mutations the panel performs. */
function EditorTools() {
  const ed = useEditor();
  return (
    <>
      <output data-testid="selection">{ed.selection?.id ?? ""}</output>
      <button data-testid="add" type="button" onClick={() => ed.updateDoc((d) => addReview(d, KEY))}>
        add
      </button>
      <button data-testid="duplicate" type="button" onClick={() => ed.updateDoc((d) => duplicateReview(d, KEY, "0"))}>
        duplicate
      </button>
      <button data-testid="delete" type="button" onClick={() => ed.updateDoc((d) => deleteReview(d, KEY, "0"))}>
        delete
      </button>
      <button data-testid="move" type="button" onClick={() => ed.updateDoc((d) => moveReview(d, KEY, "0", 1))}>
        move
      </button>
      <button data-testid="set-name" type="button" onClick={() => ed.setProp(rid("0"), "name", "Nuevo Nombre")}>
        name
      </button>
      <button data-testid="set-rating" type="button" onClick={() => ed.setProp(rid("0"), "rating", "2")}>
        rating
      </button>
      <button data-testid="undo" type="button" onClick={() => ed.undo()}>
        undo
      </button>
      <button data-testid="redo" type="button" onClick={() => ed.redo()}>
        redo
      </button>
    </>
  );
}

function mount(
  mode: "edit" | "preview",
  props: PageDoc["props"] = {},
  initialDocument?: MagicEditorStateV1,
  onDocumentChange?: (state: MagicEditorStateV1) => void,
) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <EditorProvider
        initialTemplate="bio"
        initialDocument={initialDocument ?? bioDoc(props)}
        initialMode={mode}
        onDocumentChange={onDocumentChange}>
        <Block block={block}>
          <ReviewsBlock block={block} />
        </Block>
        <EditorTools />
      </EditorProvider>,
    ),
  );
  return { host, root };
}

function mountTemplate(state: MagicEditorStateV1, mode: "edit" | "preview" = "preview") {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <EditorProvider initialTemplate="bio" initialDocument={state} initialMode={mode}>
        <TemplateRenderer showLandingBotPreview={false} />
      </EditorProvider>,
    ),
  );
  return { host, root };
}

function press(host: HTMLElement, testid: string) {
  const button = host.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`);
  if (!button) throw new Error(`missing probe ${testid}`);
  act(() => button.click());
}

describe("Reseñas block", () => {
  it('is registered in BlockKit as "Reseñas"', () => {
    const entry = blockKit.find((item) => item.type === "reviews");
    expect(entry, "reviews block is offered in add-block").toBeDefined();
    expect(entry?.label).toBe("Reseñas");
    expect(blockLabels.reviews).toBe("Reseñas");
  });

  it("creates two reviews by default", () => {
    const { host, root } = mount("preview");
    expect(cards(host)).toHaveLength(2);
    expect(host.textContent ?? "").not.toContain("Agregar reseña");
    act(() => root.unmount());
  });

  it("renders the saved avatar, name, rating and testimonial", () => {
    const { host, root } = mount("preview", {
      [rid("0")]: { avatar: "foto.jpg", name: "Ana Pérez", text: "Servicio excelente", rating: "3" },
    });
    const card = host.querySelector<HTMLElement>(`[data-editor-id="${rid("0")}"]`)!;
    expect(card.querySelector("img")?.getAttribute("src")).toBe("foto.jpg");
    expect(card.textContent).toContain("Ana Pérez");
    expect(card.textContent).toContain("Servicio excelente");
    expect(card.querySelector('[data-review-rating="3"]')).not.toBeNull();

    // A review without a photo falls back to the initials placeholder.
    const second = host.querySelector<HTMLElement>(`[data-editor-id="${rid("1")}"]`)!;
    expect(second.querySelector("img")).toBeNull();
    act(() => root.unmount());
  });

  it("shows the add-review control only while editing and below the maximum", () => {
    const editing = mount("edit");
    expect(editing.host.textContent ?? "").toContain("Agregar reseña");
    act(() => editing.root.unmount());

    const preview = mount("preview");
    expect(preview.host.textContent ?? "").not.toContain("Agregar reseña");
    act(() => preview.root.unmount());

    const full = mount("edit", { [`block:${KEY}`]: { items: "0,1,2,3,4,5" } });
    expect(cards(full.host)).toHaveLength(6);
    expect(full.host.textContent ?? "").not.toContain("Agregar reseña");
    act(() => full.root.unmount());
  });

  it("selects a review on click", () => {
    const { host, root } = mount("edit");
    const card = host.querySelector<HTMLElement>(`[data-editor-id="${rid("0")}"][data-cq]`);
    expect(card, "review is selectable while editing").not.toBeNull();
    act(() => card!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
    expect(host.querySelector('[data-testid="selection"]')?.textContent).toBe(rid("0"));
    act(() => root.unmount());
  });

  it("persists name and rating edits in the document", () => {
    const { host, root } = mount("edit");
    press(host, "set-name");
    expect(cardText(host, "0")).toContain("Nuevo Nombre");
    press(host, "set-rating");
    expect(host.querySelector(`[data-editor-id="${rid("0")}"] [data-review-rating="2"]`)).not.toBeNull();
    act(() => root.unmount());
  });

  it("renders the same contract through the public/template renderer with no controls", () => {
    const state = createInitialMagicPageDocument("bio");
    state.blocks = [...state.blocks, { key: "reviews-pub", type: "reviews" }];
    state.props = {
      ...state.props,
      "reviews-pub/review.0": { avatar: "p.jpg", name: "Cliente feliz", text: "Muy buena experiencia", rating: "5" },
    };
    const { host, root } = mountTemplate(hydrateMagicEditorState(state), "preview");
    const card = host.querySelector<HTMLElement>('[data-editor-id="reviews-pub/review.0"]');
    expect(card).not.toBeNull();
    expect(card?.querySelector("img")?.getAttribute("src")).toBe("p.jpg");
    expect(host.textContent ?? "").toContain("Cliente feliz");
    expect(host.textContent ?? "").not.toContain("Agregar reseña");
    act(() => root.unmount());
  });

  it("keeps add, delete, duplicate, move and edits undoable", () => {
    // add
    const add = mount("edit");
    expect(cards(add.host)).toHaveLength(2);
    press(add.host, "add");
    expect(cards(add.host)).toHaveLength(3);
    press(add.host, "undo");
    expect(cards(add.host)).toHaveLength(2);
    press(add.host, "redo");
    expect(cards(add.host)).toHaveLength(3);
    act(() => add.root.unmount());

    // duplicate
    const dup = mount("edit");
    press(dup.host, "duplicate");
    expect(cards(dup.host)).toHaveLength(3);
    press(dup.host, "undo");
    expect(cards(dup.host)).toHaveLength(2);
    act(() => dup.root.unmount());

    // delete
    const del = mount("edit");
    press(del.host, "delete");
    expect(cards(del.host)).toHaveLength(1);
    press(del.host, "undo");
    expect(cards(del.host)).toHaveLength(2);
    act(() => del.root.unmount());

    // move (names prove the order actually changed)
    const move = mount("edit", {
      [rid("0")]: { name: "AAA" },
      [rid("1")]: { name: "BBB" },
    });
    expect(cards(move.host)[0]?.textContent).toContain("AAA");
    press(move.host, "move");
    expect(cards(move.host)[0]?.textContent).toContain("BBB");
    press(move.host, "undo");
    expect(cards(move.host)[0]?.textContent).toContain("AAA");
    act(() => move.root.unmount());

    // edit
    const edit = mount("edit");
    press(edit.host, "set-name");
    expect(cardText(edit.host, "0")).toContain("Nuevo Nombre");
    press(edit.host, "undo");
    expect(cardText(edit.host, "0")).not.toContain("Nuevo Nombre");
    act(() => edit.root.unmount());
  });

  it("persists in PageDoc and survives save/reload", () => {
    let saved: unknown = null;
    const first = mount("edit", {}, bioDoc(), (state) => {
      saved = serializeMagicEditorState(state);
    });
    press(first.host, "add");
    expect(saved).not.toBeNull();
    const reloaded = hydrateMagicEditorState(saved);
    expect(reviewsOrder(reloaded.doc, KEY)).toHaveLength(3);
    act(() => first.root.unmount());

    const again = mount("edit", {}, reloaded);
    expect(cards(again.host)).toHaveLength(3);
    act(() => again.root.unmount());
  });
});

