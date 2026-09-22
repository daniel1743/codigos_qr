import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "../data/products";
import {
  Category,
  HeroVariant,
  ImageOrigin,
  PageBackground,
  PageHeader,
  Product,
  Selection,
  TargetKind,
  TextStyle,
  ThemeTokens,
  CtaConfig,
  CardChrome,
  ProductOverrides,
} from "../types/editor";

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
  mode: "edit" | "preview";
  viewingProductId: string | null;
  setMode: (mode: "edit" | "preview") => void;
  setViewingProductId: (id: string | null) => void;
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
  startUpload: (id: string, file?: File) => void;
  retryUpload: (id: string) => void;
  removeImage: (id: string) => void;
  pageHeader: PageHeader;
  pageBackground: PageBackground;
  themeTokens: ThemeTokens | null;
  heroVariant: HeroVariant;
  patchPageHeader: (patch: Partial<PageHeader>) => void;
  patchPageBackground: (patch: Partial<PageBackground>) => void;
  categories: Category[];
  sharedStyles: {
    title: TextStyle;
    description: TextStyle;
    price: TextStyle;
    cta: CtaConfig;
    card: CardChrome;
  };
  patchSharedStyle: <K extends keyof EditorValue["sharedStyles"]>(
    key: K,
    patch: Partial<EditorValue["sharedStyles"][K]>,
  ) => void;
  setOverride: (productId: string, key: keyof ProductOverrides, value: boolean) => void;
  addCategoryToProduct: (productId: string) => void;
  patchCategory: (categoryId: string, patch: Partial<Category>) => void;
  removeCategoryFromProduct: (productId: string, categoryId: string) => void;
  bulkCloneProducts: (count: number) => void;
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
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [sharedStyles, setSharedStyles] = useState({
    title: INITIAL_PRODUCTS[0].titleStyle,
    description: INITIAL_PRODUCTS[0].descriptionStyle,
    price: INITIAL_PRODUCTS[0].priceStyle,
    cta: INITIAL_PRODUCTS[0].cta,
    card: INITIAL_PRODUCTS[0].card,
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [changeImageId, setChangeImageId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [publishWarning, setPublishWarning] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("collapsed");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [viewingProductId, setViewingProductId] = useState<string | null>(null);
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

  const [pageHeader, setPageHeader] = useState<PageHeader>({
    title: "Catálogo de producto",
    titleStyle: {
      font: "Marcellus, Georgia, serif",
      size: 38,
      color: "#17140F",
      weight: 400,
      italic: false,
      underline: false,
      align: "left",
    },
    description:
      "Toca una tarjeta para editar. (La edición es directa en el texto, imagen o botón)",
    descriptionStyle: {
      font: "Inter, system-ui, sans-serif",
      size: 14,
      color: "#4A443C",
      weight: 400,
      italic: false,
      underline: false,
      align: "left",
    },
  });
  const [pageBackground, setPageBackground] = useState<PageBackground>({ color: "#FBF9F6" });
  const [themeTokens] = useState<ThemeTokens | null>(null);
  const [heroVariant] = useState<HeroVariant>("none");

  const patchPageHeader = useCallback(
    (patch: Partial<PageHeader>) => setPageHeader((p) => ({ ...p, ...patch })),
    [],
  );
  const patchPageBackground = useCallback(
    (patch: Partial<PageBackground>) => setPageBackground((p) => ({ ...p, ...patch })),
    [],
  );

  const patchSharedStyle = useCallback(
    <K extends keyof EditorValue["sharedStyles"]>(
      key: K,
      patch: Partial<EditorValue["sharedStyles"][K]>,
    ) => {
      setSharedStyles((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
      setProducts((prev) =>
        prev.map((p) => {
          if (!p.overrides[key]) {
            return { ...p, [key]: { ...p[key as keyof Product], ...patch } };
          }
          return p;
        }),
      );
    },
    [],
  );

  const select = useCallback((cardId: string, kind: TargetKind, subId?: string) => {
    setSelection({ cardId, kind, subId });
    setSheetSnap(kind === "card" || kind === "page" ? "collapsed" : "medium");
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    setSheetSnap("collapsed");
  }, []);

  const patchProduct = useCallback(
    (id: string, patch: Partial<Product>) => {
      setProducts((prev) => {
        const p = prev.find((p) => p.id === id);
        if (!p) return prev;

        // If patching CTA and CTA is not overridden, patch shared style instead (or in addition)
        if (patch.cta && !p.overrides.cta) {
          patchSharedStyle("cta", patch.cta);
          return prev; // patchSharedStyle will update the products
        }
        if (patch.card && !p.overrides.card) {
          patchSharedStyle("card", patch.card);
          return prev;
        }

        return prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      });
    },
    [patchSharedStyle],
  );

  const patchTextStyle = useCallback(
    (
      id: string,
      field: "titleStyle" | "descriptionStyle" | "priceStyle",
      patch: Partial<TextStyle>,
    ) => {
      setProducts((prev) => {
        const p = prev.find((p) => p.id === id);
        if (!p) return prev;

        const key =
          field === "titleStyle" ? "title" : field === "descriptionStyle" ? "description" : "price";
        if (!p.overrides[key]) {
          patchSharedStyle(key, patch);
          return prev;
        }

        return prev.map((p) => (p.id === id ? { ...p, [field]: { ...p[field], ...patch } } : p));
      });
    },
    [patchSharedStyle],
  );

  const setOverride = useCallback(
    (productId: string, key: keyof ProductOverrides, value: boolean) => {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== productId) return p;
          const nextOverrides = { ...p.overrides, [key]: value };
          if (!value) {
            // revert to shared style
            return { ...p, overrides: nextOverrides, [key]: sharedStyles[key] };
          }
          return { ...p, overrides: nextOverrides };
        }),
      );
    },
    [sharedStyles],
  );

  const addCategoryToProduct = useCallback((productId: string) => {
    // For the prototype, just create a new category and assign it
    const newCategory: Category = {
      id: nextId("category"),
      label: "Nueva categoría",
      style: {
        backgroundColor: "#F5F2ED",
        textColor: "#17140F",
        font: "Inter, system-ui, sans-serif",
        size: 11.5,
        radius: 999,
      },
    };
    setCategories((prev) => [...prev, newCategory]);
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        if (p.categoryIds.length >= 2) return p;
        return { ...p, categoryIds: [...p.categoryIds, newCategory.id] };
      }),
    );
  }, []);

  const patchCategory = useCallback((categoryId: string, patch: Partial<Category>) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id !== categoryId) return c;
        return { ...c, ...patch, style: { ...c.style, ...(patch.style || {}) } };
      }),
    );
  }, []);

  const removeCategoryFromProduct = useCallback((productId: string, categoryId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return { ...p, categoryIds: p.categoryIds.filter((id) => id !== categoryId) };
      }),
    );
  }, []);

  const bulkCloneProducts = useCallback(
    (count: number) => {
      setProducts((prev) => {
        const last = prev[prev.length - 1];
        if (!last) return prev;
        const clones = Array.from({ length: count }).map(() => ({
          ...last,
          id: nextId(last.id),
          titleStyle: { ...last.titleStyle },
          descriptionStyle: { ...last.descriptionStyle },
          priceStyle: { ...last.priceStyle },
          cta: { ...last.cta },
          card: { ...last.card },
          tags: [...last.tags],
          categoryIds: [...last.categoryIds],
          overrides: { ...last.overrides },
        }));
        return [...prev, ...clones];
      });
      notify(`${count} productos añadidos`);
    },
    [notify],
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
        categoryIds: [...source.categoryIds],
        overrides: { ...source.overrides },
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
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);
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
    (id: string, file?: File) => {
      patchProduct(id, { imageState: "preparing" });

      let localUrl: string | null = null;
      if (file) {
        localUrl = URL.createObjectURL(file);
      }

      const timer = window.setTimeout(() => {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  imageState: "ready",
                  imageOrigin: "own",
                  image:
                    localUrl ??
                    p.image ??
                    "https://images.unsplash.com/photo-1505693314120-0d443867891c?w=800&q=80",
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
    (id: string, file?: File) => {
      setChangeImageId(null);
      runUpload(id, file);
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
    pageHeader,
    pageBackground,
    themeTokens,
    heroVariant,
    patchPageHeader,
    patchPageBackground,
    categories,
    sharedStyles,
    patchSharedStyle,
    setOverride,
    addCategoryToProduct,
    patchCategory,
    removeCategoryFromProduct,
    bulkCloneProducts,
    setPublishWarning,
    reviewReferenceImages,
    setInspectorOpen,
    setSheetSnap,
    dismissToast,
    mode,
    viewingProductId,
    setMode,
    setViewingProductId,
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
