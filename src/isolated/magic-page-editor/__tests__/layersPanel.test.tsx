// @vitest-environment happy-dom
/**
 * Capas y Colores - the two permanent toolbar entries drive the real document.
 *
 * Both panels are thin clients of the native editor: Layers derives its rows
 * from `doc.blocks` on every render, and every control calls an action that
 * already existed (`select`, `moveBlock`, `setProp`, `deleteBlock`). These
 * tests mount the real TopBar inside the real EditorProvider, so what they pin
 * is the wiring the task asks for: the list matches the document, moving
 * reaches the document, the lock is enforced by the editor itself, deletion is
 * confirmed first, and Colores opens the existing PalettePicker instead of a
 * second colour engine.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { EditorProvider, useEditor } from "../contexts/EditorContext";
import { TopBar } from "../components/editor/TopBar";
import { layerRowName, layerRows } from "../components/editor/LayersPanel";
import { TemplateRenderer } from "../components/templates/TemplateRenderer";
import { blockLabels } from "../data/blockKit";
import { colorFamilies, familyPalettesByFamily, visualPalettes } from "../data/visualPresets";
import { isBlockLocked } from "../utils/blockLock";
import {
  createInitialMagicEditorState,
  hydrateMagicEditorState,
  serializeMagicEditorState,
} from "../../../features/magic-page-editor-production/magic-document";
import { createBeautyAtelierNoirState } from "../../../features/magic-page-editor-production/premium-pilots/BeautyAtelierNoir";
import { createVidaYHuellasState } from "../../../features/magic-page-editor-production/premium-pilots/VidaYHuellas";
import type { MagicEditorStateV1 } from "../../../features/magic-page-editor-production/magic-document";
import type { BlockRef, PageDoc } from "../types/editor";

type EditorApi = ReturnType<typeof useEditor>;

/** The live editor, captured by the probe so tests can drive actions directly. */
let api: EditorApi | null = null;
/** The document as the editor currently holds it. */
let latest: PageDoc | null = null;

function lockedKeys(doc: PageDoc): string[] {
  return Object.keys(doc.props).filter((key) => doc.props[key]?.["locked"] === "true");
}

function Probe() {
  const ed = useEditor();
  api = ed;
  latest = ed.doc;
  return (
    <>
      <output data-testid="order">{ed.doc.blocks.map((block) => block.key).join(",")}</output>
      <output data-testid="selection">{ed.selection?.id ?? ""}</output>
      <output data-testid="blockkey">{ed.selection?.blockKey ?? ""}</output>
      <output data-testid="locks">{lockedKeys(ed.doc).join(",")}</output>
      <output data-testid="palette">{ed.doc.props["page"]?.["palette"] ?? ""}</output>
      <output data-testid="bgOverride">{ed.doc.props["page"]?.["bgOverride"] ?? ""}</output>
      <output data-testid="accent">{ed.doc.props["page"]?.["accent"] ?? ""}</output>
    </>
  );
}

/** The starter the product creates for a new Bio page, plus overrides. */
function bioState(overrides: Partial<PageDoc> = {}): MagicEditorStateV1 {
  const base = createInitialMagicEditorState("bio");
  return { templateId: "bio", doc: { ...base.doc, ...overrides } };
}

function keysOf(state: MagicEditorStateV1): string[] {
  return state.doc.blocks.map((block) => block.key);
}

function withExtraGallery(blocks: BlockRef[]): BlockRef[] {
  return [...blocks, { key: "gallery-4f2a", type: "gallery" }];
}

function click(host: HTMLElement, selector: string) {
  const element = host.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`no element for ${selector}`);
  act(() => {
    element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function read(host: HTMLElement, id: string): string {
  return host.querySelector(`[data-testid=${id}]`)?.textContent ?? "";
}

function attribute(host: HTMLElement, selector: string, name: string): string | null {
  return host.querySelector(selector)?.getAttribute(name) ?? null;
}

function isDisabled(host: HTMLElement, selector: string): boolean {
  return host.querySelector(selector)?.hasAttribute("disabled") ?? false;
}

function order(host: HTMLElement): string[] {
  return read(host, "order").split(",");
}

function open(host: HTMLElement, id: "layers" | "colors") {
  click(host, `[data-toolbar-menu=${id}] button`);
}

/** Expectation helper: the document after `key` swaps with its neighbour. */
function swapped(keys: string[], key: string, direction: -1 | 1): string[] {
  const next = [...keys];
  const from = next.indexOf(key);
  const to = from + direction;
  const moved = next[from];
  if (moved === undefined) return keys;
  next[from] = next[to] ?? moved;
  next[to] = moved;
  return next;
}

function mount(
  state: MagicEditorStateV1,
  options: { device?: "desktop" | "mobile"; canvas?: boolean } = {},
) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <EditorProvider
        initialDocument={state}
        initialMode="edit"
        initialDevice={options.device ?? "desktop"}
      >
        <TopBar />
        {options.canvas === false ? null : <TemplateRenderer />}
        <Probe />
      </EditorProvider>,
    );
  });
  return {
    host,
    close: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  api = null;
  latest = null;
  Element.prototype.scrollIntoView = () => {};
});

describe("Capas · la lista es el documento", () => {
  it("1) una fila por bloque real, en el orden del documento", () => {
    const state = bioState();
    const { host, close } = mount(state);
    open(host, "layers");

    expect(host.querySelector("[data-layers-panel]")).not.toBeNull();
    expect(host.querySelectorAll("[data-layer-row]")).toHaveLength(state.doc.blocks.length);
    expect(order(host)).toEqual(keysOf(state));

    close();
  });

  it("2) los bloques repetidos se distinguen por orden, sin reescribir sus claves", () => {
    const blocks = withExtraGallery(createInitialMagicEditorState("bio").doc.blocks);
    const rows = layerRows(bioState({ blocks }).doc);

    expect(rows.map((row) => row.key)).toEqual(blocks.map((block) => block.key));
    const galleries = rows.filter((row) => row.type === "gallery");
    expect(galleries.map((row) => row.key)).toEqual(["gallery", "gallery-4f2a"]);
    expect(galleries.map(layerRowName)).toEqual([
      `${blockLabels.gallery} 1`,
      `${blockLabels.gallery} 2`,
    ]);
    expect(layerRowName(rows[0]!)).toBe(blockLabels.hero);
  });

  it("3) seleccionar una capa selecciona ese bloque en el lienzo", () => {
    const { host, close } = mount(bioState());
    open(host, "layers");

    click(host, "[data-layer-select=gallery]");
    expect(read(host, "selection")).toBe("block:gallery");
    expect(read(host, "blockkey")).toBe("gallery");

    close();
  });
});

describe("Reordenar · Subir y Bajar", () => {
  it("4) mover reescribe el orden nativo y respeta los extremos", () => {
    const state = bioState();
    const { host, close } = mount(state);
    open(host, "layers");
    const keys = keysOf(state);
    const last = keys[keys.length - 1]!;

    expect(isDisabled(host, "[data-layer-row=hero] [data-layer-action=up]")).toBe(true);
    expect(isDisabled(host, `[data-layer-row=${last}] [data-layer-action=up]`)).toBe(false);
    expect(isDisabled(host, `[data-layer-row=${last}] [data-layer-action=down]`)).toBe(true);

    click(host, "[data-layer-row=links] [data-layer-action=down]");
    expect(order(host)).toEqual(swapped(keys, "links", 1));

    click(host, "[data-layer-row=links] [data-layer-action=up]");
    expect(order(host)).toEqual(keys);

    close();
  });

  it("5) el orden nuevo sobrevive serializar e hidratar, y Deshacer lo revierte", () => {
    const state = bioState();
    const { host, close } = mount(state);
    open(host, "layers");
    const keys = keysOf(state);

    click(host, "[data-layer-row=social] [data-layer-action=down]");
    const moved = order(host);
    expect(moved).not.toEqual(keys);

    const document = serializeMagicEditorState({ templateId: "bio", doc: latest! });
    expect(document.documentType).toBe("magic-page");
    expect(hydrateMagicEditorState(document).doc.blocks.map((block) => block.key)).toEqual(moved);

    click(host, "[aria-label=Deshacer]");
    expect(order(host)).toEqual(keys);

    close();
  });
});

describe("Bloqueo · lo aplica el editor, no el boton", () => {
  it("6) Bloquear escribe el prop nativo y desactiva mover y eliminar", () => {
    const { host, close } = mount(bioState());
    open(host, "layers");

    click(host, "[data-layer-row=social] [data-layer-action=lock]");

    expect(read(host, "locks")).toBe("block:social");
    expect(attribute(host, "[data-layer-row=social]", "data-layer-locked")).toBe("true");
    expect(attribute(host, "[data-layer-row=hero]", "data-layer-locked")).toBe("false");
    expect(isDisabled(host, "[data-layer-row=social] [data-layer-action=up]")).toBe(true);
    expect(isDisabled(host, "[data-layer-row=social] [data-layer-action=down]")).toBe(true);
    expect(isDisabled(host, "[data-layer-row=social] [data-layer-action=delete]")).toBe(true);
    expect(isDisabled(host, "[data-layer-row=social] [data-layer-action=lock]")).toBe(false);

    close();
  });

  it("7) un bloque protegido rechaza texto, estilos, props, ocultar, mover y eliminar", () => {
    const { host, close } = mount(bioState());
    open(host, "layers");
    click(host, "[data-layer-row=links] [data-layer-action=lock]");
    const before = order(host);

    act(() => {
      api!.setText("links.0", "otro");
      api!.setTextStyle("links.0", { size: 40 });
      api!.setProp("links.0", "label", "otro");
      api!.moveBlock("links", 1);
      api!.toggleHidden("links");
      api!.deleteBlock("links");
    });

    expect(latest!.texts["links.0"]).toBeUndefined();
    expect(latest!.textStyles["links.0"]).toBeUndefined();
    expect(latest!.props["links.0"]).toBeUndefined();
    expect(latest!.blocks.find((block) => block.key === "links")?.hidden).toBeFalsy();
    expect(order(host)).toEqual(before);

    // El bloqueo es del bloque, no del editor: el resto sigue editable.
    act(() => api!.setText("hero.bio", "Sigue editable"));
    expect(latest!.texts["hero.bio"]).toBe("Sigue editable");

    close();
  });

  it("8) desbloquear devuelve las acciones permitidas", () => {
    const { host, close } = mount(bioState());
    open(host, "layers");
    click(host, "[data-layer-row=links] [data-layer-action=lock]");
    click(host, "[data-layer-row=links] [data-layer-action=lock]");

    expect(read(host, "locks")).toBe("");
    act(() => api!.setText("links.0", "Editable otra vez"));
    expect(latest!.texts["links.0"]).toBe("Editable otra vez");
    act(() => api!.moveBlock("links", 1));
    expect(order(host)).not.toEqual(keysOf(bioState()));

    close();
  });

  it("9) el bloqueo sobrevive serializar e hidratar", () => {
    const { host, close } = mount(bioState());
    open(host, "layers");
    click(host, "[data-layer-row=social] [data-layer-action=lock]");

    const restored = hydrateMagicEditorState(
      serializeMagicEditorState({ templateId: "bio", doc: latest! }),
    );
    expect(isBlockLocked(restored.doc, "social")).toBe(true);
    expect(isBlockLocked(restored.doc, "hero")).toBe(false);

    close();
  });
});

describe("Eliminar · primero la confirmacion", () => {
  it("10) Eliminar pregunta antes y no toca el documento si se cancela", () => {
    const { host, close } = mount(bioState());
    open(host, "layers");
    const before = order(host);

    click(host, "[data-layer-row=collection] [data-layer-action=delete]");
    expect(host.querySelector("[data-layer-confirm]")).not.toBeNull();
    expect(host.textContent).toContain("Eliminar bloque");
    expect(order(host)).toEqual(before);

    click(host, "[data-layer-confirm-cancel]");
    expect(host.querySelector("[data-layer-confirm]")).toBeNull();
    expect(order(host)).toEqual(before);

    close();
  });

  it("11) aceptar elimina el bloque del documento y Deshacer lo devuelve", () => {
    const { host, close } = mount(bioState());
    open(host, "layers");
    const keys = keysOf(bioState());

    click(host, "[data-layer-row=collection] [data-layer-action=delete]");
    click(host, "[data-layer-confirm-accept]");
    expect(order(host)).not.toContain("collection");
    expect(latest!.blocks.some((block) => block.key === "collection")).toBe(false);

    click(host, "[aria-label=Deshacer]");
    expect(order(host)).toEqual(keys);

    close();
  });
});

describe("Colores · el selector nativo de siempre", () => {
  it("12) el catalogo real: 12 familias x 6 variantes y 16 temas", () => {
    const { host, close } = mount(bioState());
    open(host, "colors");

    expect(host.querySelector("[data-palette-families]")).not.toBeNull();
    expect(colorFamilies).toHaveLength(12);
    expect(visualPalettes).toHaveLength(16);
    for (const family of colorFamilies) {
      expect(familyPalettesByFamily[family.id] ?? []).toHaveLength(6);
    }

    close();
  });

  it("13) elegir una variante escribe la paleta de pagina y limpia el override", () => {
    const { host, close } = mount(bioState({ props: { page: { bgOverride: "url(foto.jpg)" } } }));
    open(host, "colors");
    const variant = (familyPalettesByFamily[colorFamilies[0]!.id] ?? [])[0]!;
    expect(variant).toBeDefined();

    click(host, "[data-palette-families] button");
    expect(host.querySelector("[data-palette-grid]")).not.toBeNull();
    click(host, "[data-palette-grid] button");

    expect(read(host, "palette")).toBe(variant.id);
    expect(read(host, "bgOverride")).toBe("");

    close();
  });

  it("14) abrir y cerrar Colores no modifica la pagina guardada", () => {
    const { host, close } = mount(
      bioState({ props: { page: { accent: "#123456", bgOverride: "url(foto.jpg)" } } }),
    );

    open(host, "colors");
    expect(read(host, "accent")).toBe("#123456");
    expect(read(host, "bgOverride")).toBe("url(foto.jpg)");

    open(host, "colors");
    expect(host.querySelector("[data-palette-families]")).toBeNull();
    expect(read(host, "bgOverride")).toBe("url(foto.jpg)");

    close();
  });
});

describe("Regresiones · las plantillas premium no cambian", () => {
  const pilots: Array<{ name: string; state: () => MagicEditorStateV1 }> = [
    { name: "Vida y Huellas 02", state: createVidaYHuellasState },
    { name: "Beauty Atelier Noir 01", state: createBeautyAtelierNoirState },
  ];

  for (const pilot of pilots) {
    it(`${pilot.name}: abrir Capas lista sus bloques y no toca el documento`, () => {
      const state = pilot.state();
      const { host, close } = mount(state, { canvas: false });

      open(host, "layers");
      expect(order(host)).toEqual(keysOf(state));
      expect(latest!.props).toEqual(state.doc.props);

      const restored = hydrateMagicEditorState(
        serializeMagicEditorState({ templateId: state.templateId, doc: latest! }),
      );
      expect(restored.doc.blocks).toEqual(state.doc.blocks);
      expect(restored.doc.props).toEqual(state.doc.props);

      close();
    });
  }
});
