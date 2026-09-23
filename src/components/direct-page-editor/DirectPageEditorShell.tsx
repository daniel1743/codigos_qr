import { useEffect, useMemo, useState } from "react";
import { Copy, EyeOff, ImagePlus, Plus, Redo2, Save, Undo2, X } from "lucide-react";
import type {
  DirectItem,
  PageDocumentBlockV1,
  PageDocumentV1,
} from "../../lib/direct-page-editor/page-document";
import {
  cloneCollectionItem,
  reorderPageDocumentBlock,
} from "../../lib/direct-page-editor/page-document";
import { DirectPageRenderer, type DirectEditingHandlers } from "./DirectPageRenderer";
import { createMagicServicesDocument } from "./magicServicesConfig";
import type { DirectPageStorageAdapter } from "./directPagePersistence";
import type { DirectAssetAdapter } from "./directPageAssets";
import { createDirectId } from "./directPageAssets";
import { DIRECT_BLOCK_REGISTRY_METADATA } from "./DirectBlockRegistry";

type DirectBreakpoint = "desktop" | "tablet" | "mobile";
type Selection = {
  kind: "block" | "item" | "background" | "cta";
  blockId?: string;
  itemId?: string;
  path?: string;
} | null;

function setNested(
  target: Record<string, unknown>,
  keys: string[],
  value: unknown,
): Record<string, unknown> {
  const [key, ...rest] = keys;
  if (!key) return target;
  return {
    ...target,
    [key]: rest.length
      ? setNested((target[key] as Record<string, unknown>) ?? {}, rest, value)
      : value,
  };
}

export function DirectPageEditorShell({
  pageId,
  pageTitle,
  initialDocument,
  storage,
  assets,
}: {
  pageId: string;
  pageTitle: string;
  initialDocument: PageDocumentV1;
  storage: DirectPageStorageAdapter;
  assets: DirectAssetAdapter;
}) {
  const [document, setDocument] = useState(initialDocument);
  const [past, setPast] = useState<PageDocumentV1[]>([]);
  const [future, setFuture] = useState<PageDocumentV1[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [breakpoint, setBreakpoint] = useState<DirectBreakpoint>("desktop");
  const [saveState, setSaveState] = useState("idle");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assetBusy, setAssetBusy] = useState(false);

  useEffect(() => {
    const update = () =>
      setBreakpoint(
        window.innerWidth < 768 ? "mobile" : window.innerWidth < 1100 ? "tablet" : "desktop",
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const commit = (next: PageDocumentV1) => {
    setPast((items) => [...items.slice(-59), document]);
    setFuture([]);
    setDocument(next);
    setSaveState("dirty");
  };
  const patchPath = (path: string, value: unknown) => {
    const itemMatch = /^blocks\.([^.]+)\.content\.items\.([^.]+)\.(.+)$/.exec(path);
    const blockMatch = /^blocks\.([^.]+)\.(.+)$/.exec(path);
    if (itemMatch) {
      const [, blockId, itemId, field] = itemMatch;
      const blocks = document.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              content: {
                ...block.content,
                items: (block.content.items ?? []).map((item) =>
                  item.id === itemId ? setNested(item, field.split("."), value) : item,
                ),
              },
            }
          : block,
      );
      commit({ ...document, blocks });
      return;
    }
    if (blockMatch) {
      const [, blockId, field] = blockMatch;
      const blocks = document.blocks.map((block) =>
        block.id === blockId
          ? { ...block, content: setNested(block.content, field.split("."), value) }
          : block,
      );
      commit({ ...document, blocks });
    }
  };
  const replaceImage = async (file: File) => {
    const target =
      selection?.kind === "item" && selection.blockId && selection.itemId
        ? `blocks.${selection.blockId}.content.items.${selection.itemId}.image`
        : selection?.blockId
          ? `blocks.${selection.blockId}.content.image`
          : null;
    if (!target) return;
    setAssetBusy(true);
    try {
      const asset = await assets.upload(file);
      patchPath(target, asset.url);
    } finally {
      setAssetBusy(false);
    }
  };
  const editing: DirectEditingHandlers = {
    selectedBlockId: selection?.blockId,
    selectedItemId: selection?.itemId,
    onSelectBlock: (blockId) => setSelection({ kind: "block", blockId }),
    onSelectItem: (blockId, itemId) => setSelection({ kind: "item", blockId, itemId }),
    onSelectCTA: (blockId, itemId, path) => setSelection({ kind: "cta", blockId, itemId, path }),
    onSelectPage: () => setSelection({ kind: "background" }),
    onInlineEdit: patchPath,
  };
  const save = async (publish = false) => {
    setSaveState("saving");
    try {
      if (publish) await storage.publish(document);
      else await storage.save(document);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };
  const selectedBlock = selection?.blockId
    ? document.blocks.find((block) => block.id === selection.blockId)
    : undefined;
  const blockAction = (action: "duplicate" | "hide" | "delete" | "up" | "down") => {
    if (!selectedBlock) return;
    if (action === "up" || action === "down") {
      commit(reorderPageDocumentBlock(document, selectedBlock.id, action === "up" ? -1 : 1));
      return;
    }
    if (action === "hide") {
      commit({
        ...document,
        blocks: document.blocks.map((block) =>
          block.id === selectedBlock.id
            ? {
                ...block,
                visible: !block.visible,
                visibility: {
                  desktop: !block.visible,
                  tablet: !block.visible,
                  mobile: !block.visible,
                },
              }
            : block,
        ),
      });
      return;
    }
    if (action === "delete") {
      commit({
        ...document,
        blocks: document.blocks.filter((block) => block.id !== selectedBlock.id),
      });
      setSelection(null);
      return;
    }
    const copy: PageDocumentBlockV1 = {
      ...structuredClone(selectedBlock),
      id: createDirectId(selectedBlock.id),
    };
    const index = document.blocks.findIndex((block) => block.id === selectedBlock.id);
    const blocks = [...document.blocks];
    blocks.splice(index + 1, 0, copy);
    commit({ ...document, blocks });
    setSelection({ kind: "block", blockId: copy.id });
  };
  const itemAction = (action: "duplicate" | "delete" | "up" | "down") => {
    if (!selection?.blockId || !selection.itemId) return;
    const block = document.blocks.find((candidate) => candidate.id === selection.blockId);
    if (!block) return;
    const list = [...(block.content.items ?? [])];
    const index = list.findIndex((item) => item.id === selection.itemId);
    if (index < 0) return;
    if (action === "delete") list.splice(index, 1);
    if (action === "duplicate") {
      const copy = cloneCollectionItem(list[index] as DirectItem, createDirectId(selection.itemId));
      list.splice(index + 1, 0, copy);
      setSelection({ kind: "item", blockId: block.id, itemId: copy.id });
    }
    if (action === "up" && index > 0)
      [list[index - 1], list[index]] = [list[index]!, list[index - 1]!];
    if (action === "down" && index < list.length - 1)
      [list[index], list[index + 1]] = [list[index + 1]!, list[index]!];
    commit({
      ...document,
      blocks: document.blocks.map((candidate) =>
        candidate.id === block.id
          ? { ...candidate, content: { ...candidate.content, items: list } }
          : candidate,
      ),
    });
  };
  const addBlock = (type: PageDocumentBlockV1["type"]) => {
    const candidate = createMagicServicesDocument(pageTitle).blocks.find(
      (block) => block.type === type,
    );
    if (!candidate) return;
    const copy = { ...structuredClone(candidate), id: createDirectId(candidate.id) };
    commit({ ...document, blocks: [...document.blocks, copy] });
    setSelection({ kind: "block", blockId: copy.id });
    setPickerOpen(false);
  };
  const undo = () => {
    const previous = past.at(-1);
    if (!previous) return;
    setPast((items) => items.slice(0, -1));
    setFuture((items) => [document, ...items]);
    setDocument(previous);
    setSaveState("dirty");
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setFuture((items) => items.slice(1));
    setPast((items) => [...items, document]);
    setDocument(next);
    setSaveState("dirty");
  };
  const mobile = breakpoint === "mobile";
  const imageTarget =
    selectedBlock?.type === "image" || selectedBlock?.type === "hero" || selection?.kind === "item";
  const ctaValue =
    selection?.kind === "cta" && selectedBlock && selection.path
      ? ((selection.itemId
          ? selectedBlock.content.items?.find((item) => item.id === selection.itemId)?.cta
          : selectedBlock.content[selection.path.split(".").at(-1) ?? ""]) as
          { label?: string; url?: string } | undefined)
      : undefined;
  const selectedCapabilities = selectedBlock
    ? (DIRECT_BLOCK_REGISTRY_METADATA[
        selectedBlock.type as keyof typeof DIRECT_BLOCK_REGISTRY_METADATA
      ]?.capabilities ?? [])
    : [];
  return (
    <main
      data-testid="direct-page-editor-pilot"
      className="flex min-h-screen flex-col bg-slate-950 text-slate-950"
    >
      <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 text-white sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Direct Page Editor
          </p>
          <h1 className="truncate text-sm font-semibold">{pageTitle}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Deshacer"
            disabled={!past.length}
            onClick={undo}
            className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            aria-label="Rehacer"
            disabled={!future.length}
            onClick={redo}
            className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40"
          >
            <Redo2 size={16} />
          </button>
          <span className="hidden px-2 text-xs text-slate-400 sm:inline">
            {saveState === "saving"
              ? "Guardando…"
              : saveState === "saved"
                ? "Guardado"
                : saveState === "dirty"
                  ? "Cambios sin guardar"
                  : saveState === "error"
                    ? "Error"
                    : "Listo"}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold"
          >
            <Save size={14} />
            Guardar
          </button>
          <button
            type="button"
            onClick={() => void save(true)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950"
          >
            Publicar
          </button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 overflow-auto bg-slate-100 px-3 pb-28 pt-3 sm:px-8 sm:pb-10 sm:pt-6">
        <div className="mx-auto min-h-full w-full max-w-[1240px] overflow-hidden rounded-[28px] bg-white shadow-2xl">
          <DirectPageRenderer
            document={document}
            breakpoint={breakpoint}
            mode="edit"
            editing={editing}
          />
        </div>
        {selection ? (
          <ContextualActions
            mobile={mobile}
            selection={selection}
            selectedBlock={selectedBlock}
            selectedCapabilities={selectedCapabilities}
            ctaValue={ctaValue}
            imageTarget={imageTarget}
            assetBusy={assetBusy}
            onReplaceImage={replaceImage}
            onPatch={patchPath}
            onClose={() => setSelection(null)}
            onBlockAction={blockAction}
            onItemAction={itemAction}
          />
        ) : null}
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2">
          {pickerOpen ? (
            <div className="mb-2 grid w-[min(92vw,22rem)] grid-cols-2 gap-2 rounded-2xl bg-white p-3 shadow-2xl">
              <button
                type="button"
                onClick={() => addBlock("text")}
                className="rounded-xl border p-2 text-xs"
              >
                Texto
              </button>
              <button
                type="button"
                onClick={() => addBlock("collection")}
                className="rounded-xl border p-2 text-xs"
              >
                Servicios
              </button>
              <button
                type="button"
                onClick={() => addBlock("image")}
                className="rounded-xl border p-2 text-xs"
              >
                Imagen
              </button>
              <button
                type="button"
                onClick={() => addBlock("links")}
                className="rounded-xl border p-2 text-xs"
              >
                Enlaces
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setPickerOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-xs font-semibold text-white shadow-xl"
          >
            <Plus size={16} />
            Añadir bloque
          </button>
        </div>
      </div>
      <span data-testid="direct-page-editor-document-authority" className="sr-only">
        PageDocumentV1/direct-page
      </span>
      <span data-testid="direct-page-editor-save-status" className="sr-only">
        {saveState}
      </span>
      <span data-testid="direct-page-editor-page-id" className="sr-only">
        {pageId}
      </span>
    </main>
  );
}

function ContextualActions({
  mobile,
  selection,
  selectedBlock,
  selectedCapabilities,
  ctaValue,
  imageTarget,
  assetBusy,
  onReplaceImage,
  onPatch,
  onClose,
  onBlockAction,
  onItemAction,
}: {
  mobile: boolean;
  selection: Selection;
  selectedBlock?: PageDocumentBlockV1;
  selectedCapabilities: readonly string[];
  ctaValue?: { label?: string; url?: string };
  imageTarget: boolean;
  assetBusy: boolean;
  onReplaceImage: (file: File) => Promise<void>;
  onPatch: (path: string, value: unknown) => void;
  onClose: () => void;
  onBlockAction: (action: "duplicate" | "hide" | "delete" | "up" | "down") => void;
  onItemAction: (action: "duplicate" | "delete" | "up" | "down") => void;
}) {
  const item = selection?.kind === "item";
  const cta = selection?.kind === "cta";
  const imagePath =
    selection?.kind === "item" && selection.blockId && selection.itemId
      ? `blocks.${selection.blockId}.content.items.${selection.itemId}.image`
      : selectedBlock
        ? `blocks.${selectedBlock.id}.content.image`
        : "";
  return (
    <div
      data-testid={
        mobile ? "direct-page-editor-mobile-sheet" : "direct-page-editor-floating-toolbar"
      }
      className={
        mobile
          ? "fixed inset-x-0 bottom-0 z-40 max-h-[45vh] overflow-auto rounded-t-3xl bg-white px-5 pb-5 pt-4 shadow-2xl"
          : "fixed left-1/2 top-[4.75rem] z-50 flex max-w-[min(94vw,48rem)] -translate-x-1/2 flex-wrap items-center gap-1 rounded-2xl border bg-white/95 p-2 shadow-2xl"
      }
    >
      <span className="mr-2 text-xs font-semibold">
        {cta ? "CTA" : item ? "Elemento" : (selectedBlock?.type ?? "Fondo")}
      </span>
      {selectedBlock && !item && !cta ? (
        <>
          <button type="button" title="Subir" onClick={() => onBlockAction("up")}>
            <Undo2 size={16} />
          </button>
          <button type="button" title="Bajar" onClick={() => onBlockAction("down")}>
            <Redo2 size={16} />
          </button>
          <button type="button" title="Duplicar" onClick={() => onBlockAction("duplicate")}>
            <Copy size={16} />
          </button>
          <button type="button" title="Ocultar" onClick={() => onBlockAction("hide")}>
            <EyeOff size={16} />
          </button>
          <button
            type="button"
            title="Alinear izquierda"
            onClick={() => onPatch(`blocks.${selectedBlock.id}.layout.alignment`, "left")}
          >
            L
          </button>
          <button
            type="button"
            title="Alinear centro"
            onClick={() => onPatch(`blocks.${selectedBlock.id}.layout.alignment`, "center")}
          >
            C
          </button>
          {selectedCapabilities.includes("replace") || selectedCapabilities.includes("image") ? (
            <label title="Reemplazar imagen" className="cursor-pointer">
              <ImagePlus size={16} />
              {assetBusy ? "…" : ""}
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                disabled={assetBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onReplaceImage(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          ) : null}
        </>
      ) : null}
      {item ? (
        <>
          <button type="button" title="Subir" onClick={() => onItemAction("up")}>
            <Undo2 size={16} />
          </button>
          <button type="button" title="Bajar" onClick={() => onItemAction("down")}>
            <Redo2 size={16} />
          </button>
          <button type="button" title="Duplicar" onClick={() => onItemAction("duplicate")}>
            <Copy size={16} />
          </button>
          <button type="button" title="Eliminar" onClick={() => onItemAction("delete")}>
            <EyeOff size={16} />
          </button>
          {imageTarget ? (
            <label title="Reemplazar imagen" className="cursor-pointer">
              <ImagePlus size={16} />
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                disabled={assetBusy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onReplaceImage(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          ) : null}
        </>
      ) : null}
      {cta ? (
        <div className="flex flex-wrap items-center gap-1">
          <input
            aria-label="Texto del CTA"
            className="w-28 rounded border px-2 py-1 text-xs"
            defaultValue={ctaValue?.label ?? ""}
            onBlur={(event) => onPatch(`${selection.path}.label`, event.currentTarget.value)}
          />
          <input
            aria-label="URL del CTA"
            className="w-40 rounded border px-2 py-1 text-xs"
            defaultValue={ctaValue?.url ?? ""}
            onBlur={(event) => onPatch(`${selection.path}.url`, event.currentTarget.value)}
          />
        </div>
      ) : null}
      <button type="button" title="Cerrar" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}
