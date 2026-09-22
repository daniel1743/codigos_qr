import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Redo2,
  Save,
  Undo2,
  X,
} from "lucide-react";
import type { AssetAdapter, StorageAdapter } from "../../premium-template-studio/adapters";
import type {
  BioTemplateConfig,
  Breakpoint,
  BlockContent,
  TemplateBlock,
  SaveState,
} from "../../premium-template-studio/types";
import {
  TemplateRenderer,
  type EditingHandlers,
} from "../../premium-template-studio/engine/TemplateRenderer";
import type { SelectedCollectionItem } from "../../premium-template-studio/engine/RenderContext";
import type { PageDocumentV1 } from "../../lib/direct-page-editor/page-document";
import {
  canonicalFromPageDocument,
  pageDocumentFromCanonical,
} from "../../lib/direct-page-editor/page-document";
import { createMagicServicesConfig } from "./magicServicesConfig";
import "../../premium-template-studio/styles/studio.css";

type Selection = {
  kind: "block" | "item" | "background";
  blockId?: string;
  itemId?: string;
} | null;

interface DirectPageEditorShellProps {
  pageId: string;
  pageTitle: string;
  initialConfig: BioTemplateConfig;
  storage: StorageAdapter;
  assets: AssetAdapter;
}

function setAtPath(value: unknown, path: string, nextValue: unknown): unknown {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) return nextValue;
  const root = Array.isArray(value) ? [...value] : { ...(value as Record<string, unknown>) };
  let cursor: Record<string, unknown> | unknown[] = root;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      (cursor as Record<string, unknown>)[part] = nextValue;
      return;
    }
    const current = (cursor as Record<string, unknown>)[part];
    const copy = Array.isArray(current)
      ? [...current]
      : { ...(current as Record<string, unknown>) };
    (cursor as Record<string, unknown>)[part] = copy;
    cursor = copy as Record<string, unknown> | unknown[];
  });
  return root;
}

function cloneBlock(block: PageDocumentV1["blocks"][number]): PageDocumentV1["blocks"][number] {
  return { ...structuredClone(block), id: `${block.id}-copy-${Date.now()}` };
}

function blockForType(
  type: TemplateBlock["type"],
  source: BioTemplateConfig,
): PageDocumentV1["blocks"][number] | null {
  const block = source.blocks.find((candidate) => candidate.type === type);
  if (!block) return null;
  return pageDocumentFromCanonical({ ...source, blocks: [block] }).blocks[0] ?? null;
}

export function DirectPageEditorShell({
  pageId,
  pageTitle,
  initialConfig,
  storage,
  assets,
}: DirectPageEditorShellProps) {
  const [baseConfig, setBaseConfig] = useState(initialConfig);
  const [document, setDocument] = useState(() => pageDocumentFromCanonical(initialConfig));
  const [past, setPast] = useState<PageDocumentV1[]>([]);
  const [future, setFuture] = useState<PageDocumentV1[]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedCollectionItem | null>(null);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>("desktop");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const update = () =>
      setBreakpoint(
        window.innerWidth < 768 ? "mobile" : window.innerWidth < 1100 ? "tablet" : "desktop",
      );
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const renderedConfig = useMemo(
    () => canonicalFromPageDocument(document, baseConfig),
    [document, baseConfig],
  );

  const commit = (next: PageDocumentV1) => {
    setPast((items) => [...items.slice(-59), document]);
    setFuture([]);
    setDocument(next);
    setSaveState("dirty");
  };

  const patchCanonical = (path: string, value: unknown) => {
    const blockPath = /^blocks\.([^.]+)\.(.+)$/.exec(path);
    const nextConfig = blockPath
      ? {
          ...renderedConfig,
          blocks: renderedConfig.blocks.map((block) =>
            block.id === blockPath[1] ? setAtPath(block, blockPath[2]!, value) : block,
          ),
        }
      : (setAtPath(renderedConfig, path, value) as BioTemplateConfig);
    setBaseConfig(nextConfig);
    commit(pageDocumentFromCanonical(nextConfig));
  };

  const save = async (publish = false) => {
    setSaveState("saving");
    try {
      const canonical = canonicalFromPageDocument(document, baseConfig);
      if (publish && storage.publish) await storage.publish(canonical);
      else await storage.save(canonical);
      setBaseConfig(canonical);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const editing: EditingHandlers = {
    selectedBlockId: selection?.blockId ?? null,
    selectedCollectionItem: selectedItem,
    onSelect: (id) => {
      setSelection(id ? { kind: "block", blockId: id } : null);
      setSelectedItem(null);
    },
    onSelectPageBackground: () => {
      setSelection({ kind: "background" });
      setSelectedItem(null);
    },
    onSelectCollectionItem: (blockId, collection, itemId, field = "item") => {
      setSelection({ kind: "item", blockId, itemId });
      setSelectedItem({ blockId, collection, itemId, field });
    },
    onInlineEdit: patchCanonical,
    onMove: (id, direction) => {
      const index = document.blocks.findIndex((block) => block.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= document.blocks.length) return;
      const blocks = [...document.blocks];
      [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
      commit({ ...document, blocks });
    },
    onDuplicate: (id) => {
      const index = document.blocks.findIndex((block) => block.id === id);
      if (index < 0) return;
      const blocks = [...document.blocks];
      const copy = cloneBlock(blocks[index]!);
      blocks.splice(index + 1, 0, copy);
      commit({ ...document, blocks });
      setSelection({ kind: "block", blockId: copy.id });
    },
    onToggleHidden: (id) =>
      commit({
        ...document,
        blocks: document.blocks.map((block) =>
          block.id === id
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
      }),
    onDelete: (id) =>
      commit({ ...document, blocks: document.blocks.filter((block) => block.id !== id) }),
    onReorder: (sourceId, targetId) => {
      const source = document.blocks.findIndex((block) => block.id === sourceId);
      const target = document.blocks.findIndex((block) => block.id === targetId);
      if (source < 0 || target < 0 || source === target) return;
      const blocks = [...document.blocks];
      const [moved] = blocks.splice(source, 1);
      if (moved) blocks.splice(target, 0, moved);
      commit({ ...document, blocks });
    },
    onAddCollectionItem: (blockId, collection) => {
      const block = renderedConfig.blocks.find((candidate) => candidate.id === blockId);
      if (!block || collection !== "services") return;
      const items = block.content.items ?? [];
      const item = items[items.length - 1];
      if (!item) return;
      patchCanonical(`blocks.${blockId}.content.items`, [
        ...items,
        { ...structuredClone(item), id: `${item.id}-copy-${Date.now()}` },
      ]);
    },
    onCollectionItemAction: (blockId, collection, itemId, action) => {
      if (collection !== "services") return;
      const block = renderedConfig.blocks.find((candidate) => candidate.id === blockId);
      const items = [...(block?.content.items ?? [])];
      const index = items.findIndex((item) => item.id === itemId);
      if (index < 0) return;
      if (action === "delete") items.splice(index, 1);
      if (action === "duplicate")
        items.splice(index + 1, 0, {
          ...structuredClone(items[index]!),
          id: `${itemId}-copy-${Date.now()}`,
        });
      if (action === "up" && index > 0)
        [items[index - 1], items[index]] = [items[index]!, items[index - 1]!];
      if (action === "down" && index < items.length - 1)
        [items[index], items[index + 1]] = [items[index + 1]!, items[index]!];
      patchCanonical(`blocks.${blockId}.content.items`, items);
    },
    onUploadCollectionItemImage: (blockId, itemId, file) =>
      void assets.upload(file).then((asset) => {
        const block = renderedConfig.blocks.find((candidate) => candidate.id === blockId);
        const items = (block?.content.items ?? []).map((item) =>
          item.id === itemId ? { ...item, imageUrl: asset.url } : item,
        );
        patchCanonical(`blocks.${blockId}.content.items`, items);
      }),
    onListCollectionItemImages: () => assets.list?.() ?? Promise.resolve([]),
    onRemoveCollectionItemImage: (blockId, itemId) => {
      const block = renderedConfig.blocks.find((candidate) => candidate.id === blockId);
      patchCanonical(
        `blocks.${blockId}.content.items`,
        (block?.content.items ?? []).map((item) =>
          item.id === itemId ? { ...item, imageUrl: "" } : item,
        ),
      );
    },
  };

  const undo = () => {
    const previous = past[past.length - 1];
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

  const addBlock = (type: TemplateBlock["type"]) => {
    const candidate = blockForType(type, createMagicServicesConfig(pageTitle));
    if (!candidate) return;
    commit({ ...document, blocks: [...document.blocks, candidate] });
    setPickerOpen(false);
    setSelection({ kind: "block", blockId: candidate.id });
  };

  return (
    <main
      data-testid="direct-page-editor-pilot"
      className="direct-page-editor flex min-h-screen flex-col bg-slate-950 text-slate-950"
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
            title="Deshacer"
            disabled={!past.length}
            onClick={undo}
            className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            aria-label="Rehacer"
            title="Rehacer"
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
                    ? "Error al guardar"
                    : "Listo"}
          </span>
          <button
            type="button"
            onClick={() => void save()}
            className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10"
          >
            <Save size={14} />
            Guardar
          </button>
          <button
            type="button"
            onClick={() => void save(true)}
            className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200"
          >
            Publicar
          </button>
        </div>
      </header>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-100">
        <div className="pointer-events-none absolute left-4 top-4 z-20 flex items-center gap-2 sm:left-6">
          <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
            {breakpoint}
          </span>
          <span data-testid="direct-page-editor-document-authority" className="sr-only">
            PageDocumentV1
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-32 pt-3 sm:px-8 sm:pb-16 sm:pt-6">
          <div className="mx-auto min-h-full w-full max-w-[1240px] overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-900/15">
            <TemplateRenderer
              config={renderedConfig}
              documentKind="page"
              breakpoint={breakpoint}
              mode="edit"
              editing={editing}
            />
          </div>
        </div>
        {selection ? (
          <FloatingToolbar
            selection={selection}
            document={document}
            onClose={() => {
              setSelection(null);
              setSelectedItem(null);
            }}
            onDuplicate={() => editing.onDuplicate?.(selection.blockId ?? "")}
            onToggle={() => editing.onToggleHidden?.(selection.blockId ?? "")}
          />
        ) : null}
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 sm:bottom-6">
          {pickerOpen ? (
            <div className="mb-2 grid w-[min(92vw,22rem)] grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
              <BlockButton label="Texto" onClick={() => addBlock("text")} />
              <BlockButton label="Servicios" onClick={() => addBlock("services")} />
              <BlockButton label="Imagen" onClick={() => addBlock("image")} />
              <BlockButton label="Enlaces" onClick={() => addBlock("links")} />
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
        {selection ? (
          <MobileSheet
            selection={selection}
            document={document}
            onClose={() => setSelection(null)}
            onDuplicate={() => editing.onDuplicate?.(selection.blockId ?? "")}
            onToggle={() => editing.onToggleHidden?.(selection.blockId ?? "")}
          />
        ) : null}
      </div>
      <span data-testid="direct-page-editor-save-status" className="sr-only">
        {saveState}
      </span>
      <span data-testid="direct-page-editor-page-id" className="sr-only">
        {pageId}
      </span>
    </main>
  );
}

function BlockButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
    >
      {label}
    </button>
  );
}

function FloatingToolbar({
  selection,
  document,
  onClose,
  onDuplicate,
  onToggle,
}: {
  selection: NonNullable<Selection>;
  document: PageDocumentV1;
  onClose: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
}) {
  const block = selection.blockId
    ? document.blocks.find((item) => item.id === selection.blockId)
    : undefined;
  return (
    <div
      data-testid="direct-page-editor-floating-toolbar"
      className="fixed left-1/2 top-[4.75rem] z-50 hidden -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur sm:flex"
    >
      <span className="px-2 text-xs font-semibold text-slate-700">
        {selection.kind === "background"
          ? "Fondo"
          : selection.kind === "item"
            ? "Elemento"
            : (block?.type ?? "Bloque")}
      </span>
      <button
        type="button"
        onClick={onDuplicate}
        className="rounded-lg p-2 hover:bg-slate-100"
        title="Duplicar"
      >
        <Copy size={15} />
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg p-2 hover:bg-slate-100"
        title="Ocultar"
      >
        <EyeOff size={15} />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg p-2 hover:bg-slate-100"
        title="Cerrar"
      >
        <X size={15} />
      </button>
    </div>
  );
}

function MobileSheet({
  selection,
  document,
  onClose,
  onDuplicate,
  onToggle,
}: {
  selection: NonNullable<Selection>;
  document: PageDocumentV1;
  onClose: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
}) {
  const block = selection.blockId
    ? document.blocks.find((item) => item.id === selection.blockId)
    : undefined;
  return (
    <div
      data-testid="direct-page-editor-mobile-sheet"
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 rounded-t-3xl border-t border-slate-200 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_40px_rgba(15,23,42,0.18)] sm:hidden"
    >
      <div>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-300" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Editando
        </p>
        <p className="text-sm font-semibold text-slate-800">
          {selection.kind === "background" ? "Fondo" : (block?.type ?? "Bloque")}
        </p>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded-xl p-3 hover:bg-slate-100"
          title="Duplicar"
        >
          <Copy size={16} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-xl p-3 hover:bg-slate-100"
          title="Ocultar"
        >
          <EyeOff size={16} />
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-3 hover:bg-slate-100"
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
