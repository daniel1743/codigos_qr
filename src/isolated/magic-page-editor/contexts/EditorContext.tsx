import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { templates } from "../data/templates";
import type {
  BlockType,
  Device,
  EditorMode,
  ElementInfo,
  MobileWidth,
  PageDoc,
  SheetState,
  TemplateId,
  TextStyle,
} from "../types/editor";
import type { MagicEditorStateV1 } from "../../../features/magic-page-editor-production/magic-document";
import type { BioTemplateConfig } from "../../../premium-template-studio/types";
import type { SemanticTarget } from "../types/semantic-selection";
import { createCanonicalSemanticTarget } from "../adapters/canonical-adapter";
import { createMagicSemanticTarget } from "../adapters/magic-adapter";
import { applyCanonicalPatch } from "../adapters/canonical-patcher";
import type { SemanticCommand } from "../types/semantic-commands";
import type { CatalogConversionResult } from "../../../features/magic-page-editor-production/catalog-conversion.service";
import type { CatalogAccess } from "../../../features/magic-page-editor-production/catalog-link";
import type { SelectedCollectionItem } from "../../../premium-template-studio/engine/RenderContext";
import {
  applyCanonicalCollectionItemAction,
  applyCanonicalInlinePatch,
  appendCanonicalCollectionItems,
  updateCanonicalCollectionItem,
  type CollectionItemAction,
} from "../adapters/canonical-collection";

interface History {
  past: PageDoc[];
  present: PageDoc;
  future: PageDoc[];
}

export interface RegisteredElement extends ElementInfo {
  el: HTMLElement;
}

type Setter<T> = React.Dispatch<React.SetStateAction<T>>;

interface PickerState {
  open: boolean;
  afterKey?: string;
}

export interface EditorValue {
  templateId: TemplateId;
  setTemplateId: (id: TemplateId) => void;
  doc: PageDoc;
  mode: EditorMode;
  setMode: (m: EditorMode) => void;
  device: Device;
  setDevice: (d: Device) => void;
  mobileWidth: MobileWidth;
  setMobileWidth: (w: MobileWidth) => void;
  isMobile: boolean;
  isSmallScreen: boolean;
  selection: ElementInfo | null;
  select: (id: string, opts?: { reveal?: boolean }) => void;
  clearSelection: () => void;
  editingId: string | null;
  setEditingId: Setter<string | null>;
  keyboard: boolean;
  setKeyboard: Setter<boolean>;
  sheet: SheetState;
  setSheet: Setter<SheetState>;
  sheetPanel: string | null;
  setSheetPanel: Setter<string | null>;
  moreOpen: boolean;
  setMoreOpen: Setter<boolean>;
  picker: PickerState;
  openPicker: (afterKey?: string) => void;
  closePicker: () => void;
  settingsOpen: boolean;
  setSettingsOpen: Setter<boolean>;
  saveState: "saved" | "saving" | "error";
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setText: (id: string, value: string) => void;
  setTextStyle: (id: string, patch: Partial<TextStyle>) => void;
  setProp: (id: string, key: string, value: string) => void;
  /** Low-level document patch used by structural controls (card ordering). */
  updateDoc: (fn: (doc: PageDoc) => PageDoc) => void;
  replaceDocument: (doc: PageDoc) => void;
  removeElement: (id: string, label: string) => void;
  moveBlock: (key: string, dir: -1 | 1) => void;
  duplicateBlock: (key: string) => void;
  toggleHidden: (key: string) => void;
  deleteBlock: (key: string) => void;
  addBlock: (type: BlockType, afterKey?: string) => void;
  register: (r: RegisteredElement) => void;
  unregister: (id: string, el: HTMLElement) => void;
  getElement: (id: string) => HTMLElement | null;
  getInfo: (id: string) => ElementInfo | null;
  publishing: boolean;
  publish: () => void;
  uploadAsset?: (file: File) => Promise<string>;
  catalogConversion?: (
    document: PageDoc,
    templateId: TemplateId,
    blockKey: string,
  ) => Promise<CatalogConversionResult>;
  /** Resolves a linked catalog's page id + products (landing summary + admin). */
  catalogAccess?: CatalogAccess;
  canonicalDocument?: BioTemplateConfig;
  canonicalIsNew?: boolean;
  /** True while a canonical config is open in the common UI (semantic command boundary). */
  canonicalEditing: boolean;
  semanticSelection: SemanticTarget | null;
  /** C3.3-B — catalog workspace mode: full-screen, minimal header, product CRUD. */
  catalogMode: boolean;
  catalogBackHref?: string;
  /** Selected product card item of a canonical collection (productGrid). */
  selectedCollectionItem: SelectedCollectionItem | null;
  selectCollectionItem: (
    blockId: string,
    collection: string,
    itemId: string,
    field?: string,
  ) => void;
  collectionItemAction: (
    blockId: string,
    collection: string,
    itemId: string,
    action: CollectionItemAction,
  ) => void;
  addCollectionItems: (blockId: string, collection: string, count?: number) => void;
  /** Canvas/toolbar inline edit routed into the canonical document by path. */
  inlineEdit: (path: string, value: unknown) => void;
  uploadCollectionItemImage: (blockId: string, itemId: string, file: File) => void;
  removeCollectionItemImage: (blockId: string, itemId: string) => void;
}

const EditorContext = createContext<EditorValue | null>(null);

function createDoc(id: TemplateId): PageDoc {
  return {
    blocks: templates[id].initialBlocks.map((b) => ({ ...b })),
    texts: {},
    textStyles: {},
    props: {},
    removed: {},
  };
}

function createHistory(id: TemplateId): History {
  return { past: [], present: createDoc(id), future: [] };
}

function withTemplateDefaults(doc: PageDoc, id: TemplateId): PageDoc {
  const existing = new Set(doc.blocks.map((block) => block.key));
  const missing = templates[id].initialBlocks
    .filter((block) => !existing.has(block.key))
    .map((block) => ({ ...block }));

  return missing.length ? { ...doc, blocks: [...doc.blocks, ...missing] } : doc;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 7);
}

/**
 * Copies every element record scoped to a block key (`<blockKey>/...`) to a new
 * block key, so duplicating a block also duplicates its per-element content
 * (texts, styles, props, removed flags) instead of leaving the copy empty.
 */
function cloneScoped<T>(record: Record<string, T>, from: string, to: string): Record<string, T> {
  const next = { ...record };
  const prefix = `${from}/`;
  for (const key of Object.keys(record)) {
    if (key.startsWith(prefix)) next[`${to}${key.slice(from.length)}`] = record[key]!;
  }
  return next;
}

interface EditorProviderProps {
  children: React.ReactNode;
  initialTemplate?: TemplateId;
  initialDevice?: Device;
  initialDocument?: MagicEditorStateV1;
  initialMode?: EditorMode;
  onDocumentChange?: (state: MagicEditorStateV1) => Promise<void> | void;
  onPublish?: (state: MagicEditorStateV1) => Promise<void> | void;
  uploadAsset?: (file: File) => Promise<string>;
  catalogConversion?: (
    document: PageDoc,
    templateId: TemplateId,
    blockKey: string,
  ) => Promise<CatalogConversionResult>;
  /** Resolves a linked catalog's page id + products (landing summary + admin). */
  catalogAccess?: CatalogAccess;
  canonicalDocument?: BioTemplateConfig;
  canonicalIsNew?: boolean;
  onCanonicalDocumentChange?: (doc: BioTemplateConfig) => Promise<void> | void;
  onCanonicalPublish?: (doc: BioTemplateConfig) => Promise<void> | void;
  /** C3.3-B — open the editor as the full catalog workspace. */
  catalog?: boolean;
  catalogBackHref?: string;
}

export function EditorProvider({
  children,
  initialTemplate = "bio",
  initialDevice = "desktop",
  initialDocument,
  initialMode = "edit",
  onDocumentChange,
  onPublish,
  uploadAsset,
  catalogConversion,
  catalogAccess,
  canonicalDocument,
  canonicalIsNew,
  onCanonicalDocumentChange,
  onCanonicalPublish,
  catalog = false,
  catalogBackHref,
}: EditorProviderProps) {
  const [templateId, setTemplateIdState] = useState<TemplateId>(
    initialDocument?.templateId ?? initialTemplate,
  );
  const [histories, setHistories] = useState<Record<TemplateId, History>>(() => ({
    bio:
      initialDocument?.templateId === "bio"
        ? { past: [], present: initialDocument.doc, future: [] }
        : createHistory("bio"),
    business:
      initialDocument?.templateId === "business"
        ? { past: [], present: initialDocument.doc, future: [] }
        : createHistory("business"),
    portfolio:
      initialDocument?.templateId === "portfolio"
        ? { past: [], present: initialDocument.doc, future: [] }
        : createHistory("portfolio"),
  }));
  const [canonicalHistory, setCanonicalHistory] = useState<{
    past: BioTemplateConfig[];
    present: BioTemplateConfig;
    future: BioTemplateConfig[];
  } | null>(canonicalDocument ? { past: [], present: canonicalDocument, future: [] } : null);
  const [mode, setModeState] = useState<EditorMode>(initialMode);
  const [device, setDeviceState] = useState<Device>(initialDevice);
  const [mobileWidth, setMobileWidth] = useState<MobileWidth>(390);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [selection, setSelection] = useState<ElementInfo | null>(null);
  const [selectedCollectionItem, setSelectedCollectionItem] =
    useState<SelectedCollectionItem | null>(null);
  const [editingId, setEditingIdState] = useState<string | null>(null);
  const [keyboard, setKeyboardState] = useState(false);
  const [sheet, setSheet] = useState<SheetState>("compact");
  const [sheetPanel, setSheetPanel] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [picker, setPicker] = useState<PickerState>({ open: false });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [publishing, setPublishing] = useState(false);
  const registry = useRef(new Map<string, RegisteredElement>());

  const isMobile = device === "mobile" || isSmallScreen;
  const history = histories[templateId];
  const doc = history.present;

  useEffect(() => {
    if (canonicalHistory && onCanonicalDocumentChange) {
      const request = onCanonicalDocumentChange(canonicalHistory.present);
      if (!request) return;
      setSaveState("saving");
      void Promise.resolve(request)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"));
      return;
    }

    const request = onDocumentChange?.({ templateId, doc });
    if (!request) return;

    setSaveState("saving");
    void Promise.resolve(request)
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  }, [doc, onDocumentChange, templateId, canonicalHistory?.present, onCanonicalDocumentChange]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsSmallScreen(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const setEditingId = useCallback<Setter<string | null>>(
    (val) => {
      const next = typeof val === "function" ? val(editingId) : val;
      setEditingIdState(next);
    },
    [editingId],
  );

  const setKeyboard = useCallback<Setter<boolean>>(
    (val) => {
      const next = typeof val === "function" ? val(keyboard) : val;
      setKeyboardState(next);
    },
    [canonicalDocument, keyboard],
  );

  const resetTransient = useCallback(() => {
    setSelection(null);
    setSelectedCollectionItem(null);
    setEditingIdState(null);
    setKeyboardState(false);
    setSheet("compact");
    setSheetPanel(null);
    setMoreOpen(false);
  }, []);

  const commit = useCallback(
    (fn: (d: PageDoc) => PageDoc) => {
      setHistories((h) => {
        const cur = h[templateId];
        const next = fn(cur.present);
        if (next === cur.present) return h;
        return {
          ...h,
          [templateId]: { past: [...cur.past.slice(-49), cur.present], present: next, future: [] },
        };
      });
      return true;
    },
    [templateId],
  );

  /**
   * Structural document patch shared with the card controls. A canonical document
   * has no Magic `PageDoc`, so this is a deliberate no-op for it: canonical
   * mutations only travel through the semantic command boundary.
   */
  const updateDoc = useCallback(
    (fn: (d: PageDoc) => PageDoc) => {
      if (canonicalHistory) return;
      commit(fn);
    },
    [canonicalHistory, commit],
  );

  /** Replace local Magic state after an external atomic conversion has saved it. */
  const replaceDocument = useCallback(
    (next: PageDoc) => {
      if (canonicalHistory) return;
      setHistories((h) => ({
        ...h,
        [templateId]: {
          past: [...h[templateId].past.slice(-49), h[templateId].present],
          present: next,
          future: [],
        },
      }));
    },
    [canonicalHistory, templateId],
  );

  const semanticSelection = React.useMemo(() => {
    if (!selection) return null;
    if (canonicalHistory) {
      return createCanonicalSemanticTarget(canonicalHistory.present, selection.id, selection.label);
    }
    return createMagicSemanticTarget(selection);
  }, [selection, canonicalDocument]);

  const dispatchCanonical = useCallback(
    (command: SemanticCommand) => {
      if (!canonicalHistory) return false;
      const target = semanticSelection;
      if (!target || target.documentKind !== "canonical") {
        toast.error("Selección inválida para el comando canónico.");
        return false;
      }
      try {
        const next = applyCanonicalPatch(canonicalHistory.present, target, command);
        if (next === canonicalHistory.present) return false;
        setCanonicalHistory((h) => {
          if (!h) return h;
          return { past: [...h.past.slice(-49), h.present], present: next, future: [] };
        });
        return true;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo aplicar la acción.");
        return false;
      }
    },
    [canonicalHistory, semanticSelection],
  );

  /**
   * C3.3-B — select one product card item inside a canonical productGrid.
   *
   * The full catalog is a canonical document, so its items have no Magic DOM
   * registry entry. Selection is therefore tracked directly (not via `select`)
   * and exposed to the renderer as `selectedCollectionItem`, which is exactly the
   * seam the shared product card/toolbar already uses.
   */
  const selectCollectionItem = useCallback(
    (blockId: string, collection: string, itemId: string, field = "item") => {
      setSelection(null);
      setEditingIdState(null);
      setSheetPanel(null);
      setMoreOpen(false);
      setKeyboardState(false);
      setSelectedCollectionItem({ blockId, collection, itemId, field });
    },
    [],
  );

  /** Route a canvas/toolbar inline edit into the canonical document by path. */
  const inlineEdit = useCallback((path: string, value: unknown) => {
    setCanonicalHistory((h) => {
      if (!h) return h;
      const next = applyCanonicalInlinePatch(h.present, path, value);
      if (next === h.present) return h;
      return { past: [...h.past.slice(-49), h.present], present: next, future: [] };
    });
  }, []);

  /** Duplicate/delete/reorder one product item through the canonical CRUD. */
  const collectionItemAction = useCallback(
    (blockId: string, collection: string, itemId: string, action: CollectionItemAction) => {
      if (collection !== "product-grid" || !canonicalHistory) return;
      const result = applyCanonicalCollectionItemAction(
        canonicalHistory.present,
        blockId,
        itemId,
        action,
      );
      if (!result.changed) return;
      setCanonicalHistory({
        past: [...canonicalHistory.past.slice(-49), canonicalHistory.present],
        present: result.config,
        future: [],
      });
      if (action === "delete") setSelectedCollectionItem(null);
      else if (action === "duplicate" && result.selectedItemId)
        setSelectedCollectionItem({ blockId, collection, itemId: result.selectedItemId, field: "item" });
    },
    [canonicalHistory],
  );

  /** Append one or several products (safe placeholders) to the catalog. */
  const addCollectionItems = useCallback(
    (blockId: string, collection: string, count = 1) => {
      if (collection !== "product-grid" || !canonicalHistory) return;
      const { config, addedIds } = appendCanonicalCollectionItems(
        canonicalHistory.present,
        blockId,
        count,
      );
      if (config === canonicalHistory.present) return;
      setCanonicalHistory({
        past: [...canonicalHistory.past.slice(-49), canonicalHistory.present],
        present: config,
        future: [],
      });
      const created = addedIds[0];
      if (created) setSelectedCollectionItem({ blockId, collection, itemId: created, field: "item" });
    },
    [canonicalHistory],
  );

  const uploadCollectionItemImage = useCallback(
    (blockId: string, itemId: string, file: File) => {
      if (!uploadAsset) return;
      void (async () => {
        try {
          const url = await uploadAsset(file);
          setCanonicalHistory((h) => {
            if (!h) return h;
            const next = updateCanonicalCollectionItem(h.present, blockId, itemId, (item) => ({
              ...item,
              imageUrl: url,
              imageProvenance: { origin: "owner" as const },
            }));
            if (next === h.present) return h;
            return { past: [...h.past.slice(-49), h.present], present: next, future: [] };
          });
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen.");
        }
      })();
    },
    [uploadAsset],
  );

  const removeCollectionItemImage = useCallback((blockId: string, itemId: string) => {
    setCanonicalHistory((h) => {
      if (!h) return h;
      const next = updateCanonicalCollectionItem(h.present, blockId, itemId, (item) => ({
        ...item,
        imageUrl: "",
        imageProvenance: undefined,
      }));
      if (next === h.present) return h;
      return { past: [...h.past.slice(-49), h.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    if (canonicalHistory) {
      setCanonicalHistory((h) => {
        if (!h || !h.past.length) return h;
        const prev = h.past[h.past.length - 1];
        return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
      });
      return;
    }
    setHistories((h) => {
      const c = h[templateId];
      if (!c.past.length) return h;
      const prev = c.past[c.past.length - 1];
      return {
        ...h,
        [templateId]: {
          past: c.past.slice(0, -1),
          present: prev,
          future: [c.present, ...c.future],
        },
      };
    });
  }, [canonicalHistory, templateId]);

  const redo = useCallback(() => {
    if (canonicalHistory) {
      setCanonicalHistory((h) => {
        if (!h || !h.future.length) return h;
        const [next, ...rest] = h.future;
        return { past: [...h.past, h.present], present: next, future: rest };
      });
      return;
    }
    setHistories((h) => {
      const c = h[templateId];
      if (!c.future.length) return h;
      const [next, ...rest] = c.future;
      return { ...h, [templateId]: { past: [...c.past, c.present], present: next, future: rest } };
    });
  }, [canonicalHistory, templateId]);

  const register = useCallback((r: RegisteredElement) => {
    registry.current.set(r.id, r);
  }, []);

  const unregister = useCallback((id: string, el: HTMLElement) => {
    const cur = registry.current.get(id);
    if (cur && cur.el === el) registry.current.delete(id);
    queueMicrotask(() => {
      if (!registry.current.has(id)) setSelection((s) => (s?.id === id ? null : s));
    });
  }, []);

  const getElement = useCallback((id: string) => registry.current.get(id)?.el ?? null, []);

  const getInfo = useCallback((id: string): ElementInfo | null => {
    const r = registry.current.get(id);
    if (!r) return null;
    return { id: r.id, kind: r.kind, label: r.label, parentId: r.parentId, blockKey: r.blockKey };
  }, []);

  const select = useCallback(
    (id: string, opts?: { reveal?: boolean }) => {
      const r = registry.current.get(id);
      if (!r) return;
      setSelection({
        id: r.id,
        kind: r.kind,
        label: r.label,
        parentId: r.parentId,
        blockKey: r.blockKey,
      });
      setMoreOpen(false);
      setSheetPanel(null);
      setSheet("compact");
      setKeyboard(false);

      if (!isMobile && r.kind === "text") {
        if (!canonicalDocument) {
          setEditingId(id);
        }
      } else {
        setEditingId(null);
      }
      if (opts?.reveal && !isMobile) r.el.scrollIntoView({ block: "center", behavior: "smooth" });
    },
    [isMobile, canonicalDocument],
  );

  const clearSelection = useCallback(() => {
    resetTransient();
  }, [resetTransient]);

  const setMode = useCallback(
    (m: EditorMode) => {
      setModeState(m);
      resetTransient();
      setPicker({ open: false });
      setSettingsOpen(false);
    },
    [resetTransient],
  );

  const setTemplateId = useCallback(
    (id: TemplateId) => {
      if (id === templateId) return;
      setHistories((h) => {
        const next = withTemplateDefaults(h[templateId].present, id);
        return {
          bio: { ...h.bio, present: next, future: [] },
          business: { ...h.business, present: next, future: [] },
          portfolio: { ...h.portfolio, present: next, future: [] },
        };
      });
      setTemplateIdState(id);
      resetTransient();
      setPicker({ open: false });
      setSettingsOpen(false);
    },
    [resetTransient, templateId],
  );

  const setDevice = useCallback(
    (d: Device) => {
      setDeviceState(d);
      resetTransient();
      setPicker({ open: false });
    },
    [resetTransient],
  );

  const setText = useCallback(
    (id: string, value: string) => {
      if (canonicalHistory) {
        dispatchCanonical({ type: "SET_TEXT", payload: { value } });
        return;
      }
      if (
        !commit((d) => (d.texts[id] === value ? d : { ...d, texts: { ...d.texts, [id]: value } }))
      )
        return;
    },
    [commit, canonicalHistory, dispatchCanonical],
  );

  const setTextStyle = useCallback(
    (id: string, patch: Partial<TextStyle>) => {
      if (canonicalHistory) return;
      if (
        !commit((d) => ({
          ...d,
          textStyles: { ...d.textStyles, [id]: { ...d.textStyles[id], ...patch } },
        }))
      )
        return;
    },
    [canonicalHistory, commit],
  );

  const setProp = useCallback(
    (id: string, key: string, value: string) => {
      if (canonicalHistory) {
        if (key === "src" || key === "image")
          dispatchCanonical({ type: "SET_IMAGE_SRC", payload: { src: value } });
        else if (key === "zoom")
          dispatchCanonical({ type: "SET_MEDIA_ZOOM", payload: { zoom: parseFloat(value) } });
        else if (key === "cropX")
          dispatchCanonical({ type: "SET_MEDIA_POSITION", payload: { cropX: parseFloat(value) } });
        else if (key === "cropY")
          dispatchCanonical({ type: "SET_MEDIA_POSITION", payload: { cropY: parseFloat(value) } });
        else if (key === "overlay")
          dispatchCanonical({
            type: "SET_MEDIA_OVERLAY",
            payload: { overlay: value !== "none" && value !== "off" },
          });
        else if (key === "shape")
          dispatchCanonical({
            type: "SET_AVATAR_SHAPE",
            payload: { shape: value as "circle" | "square" | "rounded" | "arch" | "none" },
          });
        else if (key === "fusion")
          dispatchCanonical({ type: "SET_HERO_FUSION", payload: { mode: value as any } });
        else if (key === "variant") {
          if (semanticSelection?.targetKind === "hero")
            dispatchCanonical({ type: "SET_HERO_VARIANT", payload: { variant: value } });
          else if (
            semanticSelection?.targetKind === "cta-primary" ||
            semanticSelection?.targetKind === "cta-secondary"
          )
            dispatchCanonical({ type: "SET_CTA_STYLE", payload: { variant: value } });
          else dispatchCanonical({ type: "SET_CARD_LAYOUT", payload: { layout: value } });
        } else if (key === "href") {
          if (semanticSelection?.targetKind === "media")
            dispatchCanonical({ type: "SET_IMAGE_HREF", payload: { href: value } });
          else dispatchCanonical({ type: "SET_CTA_URL", payload: { url: value } });
        } else if (key === "newTab" && semanticSelection?.targetKind === "media")
          dispatchCanonical({ type: "SET_IMAGE_HREF", payload: { newTab: value !== "off" } });
        else if (key === "hidden" || key === "show") {
          const hidden = key === "hidden" ? value === "true" : value === "off";
          dispatchCanonical({ type: "SET_ELEMENT_VISIBILITY", payload: { hidden } });
        } else if (key === "showPrice")
          dispatchCanonical({
            type: "SET_CARD_PRICE_VISIBILITY",
            payload: { visible: value === "on" },
          });
        else if (key === "showBadge")
          dispatchCanonical({
            type: "SET_CARD_BADGE_VISIBILITY",
            payload: { visible: value === "on" },
          });
        else if (key === "showDesc")
          dispatchCanonical({
            type: "SET_CARD_DESCRIPTION_VISIBILITY",
            payload: { visible: value === "on" },
          });
        else if (key === "showCta")
          dispatchCanonical({
            type: "SET_CARD_CTA_VISIBILITY",
            payload: { visible: value === "on" },
          });
        else if (key === "emphasis")
          dispatchCanonical({ type: "SET_CARD_EMPHASIS", payload: { emphasis: value === "on" } });
        return;
      }
      if (
        !commit((d) =>
          d.props[id]?.[key] === value
            ? d
            : { ...d, props: { ...d.props, [id]: { ...d.props[id], [key]: value } } },
        )
      )
        return;
    },
    [commit, canonicalHistory, dispatchCanonical, semanticSelection],
  );

  const removeElement = useCallback(
    (id: string, label: string) => {
      if (canonicalHistory) {
        dispatchCanonical({ type: "SET_ELEMENT_VISIBILITY", payload: { hidden: true } });
        resetTransient();
        toast(`${label} eliminado`, { action: { label: "Deshacer", onClick: () => undo() } });
        return;
      }
      if (!commit((d) => ({ ...d, removed: { ...d.removed, [id]: true } }))) return;
      resetTransient();
      toast(`${label} eliminado`, { action: { label: "Deshacer", onClick: () => undo() } });
    },
    [commit, resetTransient, undo, canonicalHistory, dispatchCanonical],
  );

  const moveBlock = useCallback(
    (key: string, dir: -1 | 1) => {
      if (canonicalHistory) {
        dispatchCanonical({ type: "MOVE_BLOCK", payload: { dir } });
        return;
      }
      if (
        !commit((d) => {
          const i = d.blocks.findIndex((b) => b.key === key);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= d.blocks.length) return d;
          const blocks = [...d.blocks];
          [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
          return { ...d, blocks };
        })
      )
        return;
    },
    [commit, canonicalHistory, dispatchCanonical],
  );

  const duplicateBlock = useCallback(
    (key: string) => {
      if (canonicalHistory) {
        dispatchCanonical({ type: "DUPLICATE_BLOCK", payload: {} });
        toast("Bloque duplicado");
        return;
      }
      const newKey = `${key.split("-")[0]}-${uid()}`;
      if (
        !commit((d) => {
          const i = d.blocks.findIndex((b) => b.key === key);
          if (i < 0) return d;
          const blocks = [...d.blocks];
          blocks.splice(i + 1, 0, { key: newKey, type: d.blocks[i].type });
          const sourceProps = d.props[`block:${key}`];
          const props = cloneScoped(d.props, key, newKey);
          return {
            ...d,
            blocks,
            props: sourceProps ? { ...props, [`block:${newKey}`]: { ...sourceProps } } : props,
            texts: cloneScoped(d.texts, key, newKey),
            textStyles: cloneScoped(d.textStyles, key, newKey),
            removed: cloneScoped(d.removed, key, newKey),
          };
        })
      )
        return;
      toast("Bloque duplicado");
    },
    [commit, canonicalHistory, dispatchCanonical],
  );

  const toggleHidden = useCallback(
    (key: string) => {
      if (canonicalHistory) {
        // Not implemented for blocks natively yet
        return;
      }
      if (
        !commit((d) => ({
          ...d,
          blocks: d.blocks.map((b) => (b.key === key ? { ...b, hidden: !b.hidden } : b)),
        }))
      )
        return;
    },
    [commit, canonicalHistory],
  );

  const deleteBlock = useCallback(
    (key: string) => {
      if (canonicalHistory) {
        dispatchCanonical({ type: "DELETE_BLOCK", payload: {} });
        resetTransient();
        toast("Bloque eliminado", { action: { label: "Deshacer", onClick: () => undo() } });
        return;
      }
      if (!commit((d) => ({ ...d, blocks: d.blocks.filter((b) => b.key !== key) }))) return;
      resetTransient();
      toast("Bloque eliminado", { action: { label: "Deshacer", onClick: () => undo() } });
    },
    [commit, resetTransient, undo, canonicalHistory, dispatchCanonical],
  );

  const addBlock = useCallback(
    (type: BlockType, afterKey?: string) => {
      if (canonicalHistory) return;
      const key = `${type}-${uid()}`;
      if (
        !commit((d) => {
          const i = afterKey ? d.blocks.findIndex((b) => b.key === afterKey) : -1;
          const blocks = [...d.blocks];
          blocks.splice(i >= 0 ? i + 1 : blocks.length, 0, { key, type });
          return { ...d, blocks };
        })
      )
        return;
      setPicker({ open: false });
      window.setTimeout(() => select(`block:${key}`, { reveal: true }), 80);
    },
    [canonicalHistory, commit, select],
  );

  const openPicker = useCallback((afterKey?: string) => {
    setMoreOpen(false);
    setPicker({ open: true, afterKey });
  }, []);

  const closePicker = useCallback(() => setPicker({ open: false }), []);

  const publish = useCallback(() => {
    setPublishing(true);
    if (canonicalHistory && onCanonicalPublish) {
      const result = onCanonicalPublish(canonicalHistory.present);
      Promise.resolve(result)
        .then(() => {
          setPublishing(false);
          toast.success("Página publicada");
        })
        .catch((error) => {
          setPublishing(false);
          toast.error(error instanceof Error ? error.message : "No se pudo publicar la página.");
        });
      return;
    }
    const result = onPublish?.({ templateId, doc });
    Promise.resolve(result)
      .then(() => {
        setPublishing(false);
        toast.success("Página publicada", {
          description: `cripqer.com/${templates[templateId].slug}`,
        });
      })
      .catch((error) => {
        setPublishing(false);
        toast.error(error instanceof Error ? error.message : "No se pudo publicar la página.");
      });
  }, [doc, onPublish, templateId, canonicalHistory, onCanonicalPublish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing =
        target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "Escape" && !typing) {
        resetTransient();
        setPicker({ open: false });
        return;
      }
      if (typing) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, resetTransient]);

  const activeCanonicalDocument = canonicalHistory?.present ?? canonicalDocument;
  const value: EditorValue = {
    templateId,
    setTemplateId,
    doc,
    mode,
    setMode,
    device,
    setDevice,
    mobileWidth,
    setMobileWidth,
    isMobile,
    isSmallScreen,
    selection,
    select,
    clearSelection,
    editingId,
    setEditingId,
    keyboard,
    setKeyboard,
    sheet,
    setSheet,
    sheetPanel,
    setSheetPanel,
    moreOpen,
    setMoreOpen,
    picker,
    openPicker,
    closePicker,
    settingsOpen,
    setSettingsOpen,
    saveState,
    canUndo: canonicalHistory
      ? canonicalHistory.past.length > 0
      : histories[templateId].past.length > 0,
    canRedo: canonicalHistory
      ? canonicalHistory.future.length > 0
      : histories[templateId].future.length > 0,
    undo,
    redo,
    setText,
    setTextStyle,
    setProp,
    updateDoc,
    replaceDocument,
    removeElement,
    moveBlock,
    duplicateBlock,
    toggleHidden,
    deleteBlock,
    addBlock,
    register,
    unregister,
    getElement,
    getInfo,
    publishing,
    publish,
    uploadAsset,
    catalogConversion,
    catalogAccess,
    canonicalDocument: activeCanonicalDocument,
    canonicalIsNew,
    canonicalEditing: canonicalHistory !== null,
    semanticSelection,
    catalogMode: catalog,
    ...(catalogBackHref ? { catalogBackHref } : {}),
    selectedCollectionItem,
    selectCollectionItem,
    collectionItemAction,
    addCollectionItems,
    inlineEdit,
    uploadCollectionItemImage,
    removeCollectionItemImage,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
