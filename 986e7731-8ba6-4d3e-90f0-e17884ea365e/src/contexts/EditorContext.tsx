import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { INITIAL_PRODUCTS } from "../data/products";
import { ImageOrigin, Product, Selection, TargetKind, TextStyle } from "../types/editor";

export type SheetSnap = "collapsed" | "medium" | "expanded";

interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface EditorValue {
  products: Product[];
  selection: Selection | null;
  selectedProduct: Product | null;
  toast: ToastState | null;
  detailId: string | null;
  changeImageId: string | null;
  deleteId: string | null;
  publishWarning: boolean;
  inspectorOpen: boolean;
  sheetSnap: SheetSnap;
  hasReferenceImages: boolean;
  select: (cardId: string, kind: TargetKind) => void;
  clearSelection: () => void;
  patchProduct: (id: string, patch: Partial<Product>) => void;
  patchTextStyle: (
    id: string,
    field: "titleStyle" | "descriptionStyle" | "priceStyle",
    patch: Partial<TextStyle>,
  ) => void;
  duplicate: (id: string) => void;
  addProduct: () => void;
  requestDelete: (id: string | null) => void;
  confirmDelete: () => void;
  moveCard: (id: string, direction: -1 | 1) => void;
  openDetail: (id: string | null) => void;
  openChangeImage: (id: string | null) => void;
  applyImage: (id: string, url: string, origin: ImageOrigin) => void;
  startUpload: (id: string) => void;
  retryUpload: (id: string) => void;
  removeImage: (id: string) => void;
  setPublishWarning: (open: boolean) => void;
  reviewReferenceImages: () => void;
  setInspectorOpen: (open: boolean) => void;
  setSheetSnap: (snap: SheetSnap) => void;
  dismissToast: () => void;
}

const EditorContext = createContext<EditorValue | null>(null);

let idCounter = 0;
const nextId = (base: string) => `${base}-copy-${++idCounter}`;

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [changeImageId, setChangeImageId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishWarning, setPublishWarning] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("collapsed");
  const toastTimer = useRef<number | null>(null);
  const timers = useRef<number[]>([]);

  const notify = useCallback((message: string, action?: { label: string; run: () => void }) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const id = Date.now();
    setToast({
      id,
      message,
      actionLabel: action?.label,
      onAction: action?.run,
    });
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  const select = useCallback((cardId: string, kind: TargetKind) => {
    setSelection({ cardId, kind });
    setSheetSnap(kind === "card" ? "collapsed" : "medium");
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setSheetSnap("collapsed");
  }, []);

  const patchProduct = useCallback((id: string, patch: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const patchTextStyle = useCallback(
    (
      id: string,
      field: "titleStyle" | "descriptionStyle" | "priceStyle",
      patch: Partial<TextStyle>,
    ) => {
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, [field]: { ...p[field], ...patch } } : p)),
      );
    },
    [],
  );

  const cloneAfter = useCallback(
    (sourceId: string) => {
      const snapshot = products;
      const index = products.findIndex((p) => p.id === sourceId);
      if (index === -1) return;
      const source = products[index];
      const newId = nextId(source.id);
      const copy: Product = {
        ...source,
        id: newId,
        titleStyle: { ...source.titleStyle },
        descriptionStyle: { ...source.descriptionStyle },
        priceStyle: { ...source.priceStyle },
        cta: { ...source.cta },
        card: { ...source.card },
        tags: [...source.tags],
      };
      setProducts((prev) => {
        const at = prev.findIndex((p) => p.id === sourceId);
        if (at === -1) return prev;
        const next = [...prev];
        next.splice(at + 1, 0, copy);
        return next;
      });
      setSelection({ cardId: newId, kind: "card" });
      setSheetSnap("collapsed");
      notify("Producto duplicado", {
        label: "Deshacer",
        run: () => {
          setProducts(snapshot);
          setSelection(null);
          dismissToast();
        },
      });
    },
    [products, notify, dismissToast],
  );

  const duplicate = useCallback((id: string) => cloneAfter(id), [cloneAfter]);

  const addProduct = useCallback(() => {
    const last = products[products.length - 1];
    if (!last) return;
    cloneAfter(last.id);
  }, [products, cloneAfter]);

  const requestDelete = useCallback((id: string | null) => setDeleteId(id), []);

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    const snapshot = products;
    setProducts((prev) => prev.filter((p) => p.id !== deleteId));
    setSelection(null);
    setDeleteId(null);
    notify("Producto eliminado", {
      label: "Deshacer",
      run: () => {
        setProducts(snapshot);
        dismissToast();
      },
    });
  }, [deleteId, products, notify, dismissToast]);

  const moveCard = useCallback((id: string, direction: -1 | 1) => {
    setProducts((prev) => {
      const index = prev.findIndex((p) => p.id === id);
      const target = index + direction;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  }, []);

  const openDetail = useCallback((id: string | null) => setDetailId(id), []);
  const openChangeImage = useCallback((id: string | null) => setChangeImageId(id), []);

  const applyImage = useCallback(
    (id: string, url: string, origin: ImageOrigin) => {
      patchProduct(id, { image: url, imageState: "ready", imageOrigin: origin });
      setChangeImageId(null);
      notify("Foto lista");
    },
    [patchProduct, notify],
  );

  const runUpload = useCallback(
    (id: string) => {
      patchProduct(id, { imageState: "preparing" });
      const timer = window.setTimeout(() => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  imageState: "ready",
                  imageOrigin: "own",
                  image: p.image ?? "/f55ca5d1-364a-427c-a6a5-a5dff0640b1a.jpg",
                }
              : p,
          ),
        );
        notify("Foto lista");
      }, 2200);
      timers.current.push(timer);
    },
    [patchProduct, notify],
  );

  const startUpload = useCallback(
    (id: string) => {
      setChangeImageId(null);
      runUpload(id);
    },
    [runUpload],
  );

  const retryUpload = useCallback((id: string) => runUpload(id), [runUpload]);

  const removeImage = useCallback(
    (id: string) => {
      patchProduct(id, { image: null, imageState: "empty" });
    },
    [patchProduct],
  );

  const reviewReferenceImages = useCallback(() => {
    setPublishWarning(false);
    const first = products.find((p) => p.imageOrigin === "reference" && p.image);
    if (first) {
      setSelection({ cardId: first.id, kind: "image" });
      setSheetSnap("medium");
    }
  }, [products]);

  const selectedProduct = useMemo(
    () => (selection ? (products.find((p) => p.id === selection.cardId) ?? null) : null),
    [selection, products],
  );

  const hasReferenceImages = useMemo(
    () => products.some((p) => p.imageOrigin === "reference" && !!p.image),
    [products],
  );

  const value: EditorValue = {
    products,
    selection,
    selectedProduct,
    toast,
    detailId,
    changeImageId,
    deleteId,
    publishWarning,
    inspectorOpen,
    sheetSnap,
    hasReferenceImages,
    select,
    clearSelection,
    patchProduct,
    patchTextStyle,
    duplicate,
    addProduct,
    requestDelete,
    confirmDelete,
    moveCard,
    openDetail,
    openChangeImage,
    applyImage,
    startUpload,
    retryUpload,
    removeImage,
    setPublishWarning,
    reviewReferenceImages,
    setInspectorOpen,
    setSheetSnap,
    dismissToast,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
